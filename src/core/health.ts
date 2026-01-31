export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, CheckResult>;
  timestamp: string;
  uptime: number;
}

export interface CheckResult {
  status: "up" | "down" | "degraded";
  latency?: number;
  message?: string;
}

export type HealthCheckFunction = () => Promise<CheckResult>;

export class HealthMonitor {
  private checks: Map<string, HealthCheckFunction> = new Map();
  private startTime: number = Date.now();

  registerCheck(name: string, checkFn: HealthCheckFunction): void {
    this.checks.set(name, checkFn);
  }

  async check(): Promise<HealthCheckResult> {
    const results: Record<string, CheckResult> = {};
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    const promises = Array.from(this.checks.entries()).map(
      async ([name, checkFn]) => {
        try {
          const start = Date.now();
          const result = await checkFn();
          result.latency = Date.now() - start;
          results[name] = result;

          if (result.status === "down") {
            overallStatus = "unhealthy";
          } else if (
            result.status === "degraded" &&
            overallStatus !== "unhealthy"
          ) {
            overallStatus = "degraded";
          }
        } catch (error) {
          results[name] = {
            status: "down",
            message: error instanceof Error ? error.message : String(error),
          };
          overallStatus = "unhealthy";
        }
      },
    );

    await Promise.all(promises);

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
    };
  }
}
