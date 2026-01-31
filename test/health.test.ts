import { describe, it, expect, beforeEach, vi } from "vitest";
import { HealthMonitor } from "../src/core/health.js";

describe("HealthMonitor", () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    monitor = new HealthMonitor();
  });

  it("should report healthy when all checks pass", async () => {
    monitor.registerCheck("api", async () => ({ status: "up" }));
    monitor.registerCheck("db", async () => ({ status: "up" }));

    const result = await monitor.check();
    expect(result.status).toBe("healthy");
    expect(result.checks.api.status).toBe("up");
    expect(result.checks.db.status).toBe("up");
  });

  it("should report unhealthy when critical check fails", async () => {
    monitor.registerCheck("api", async () => ({ status: "down" }));
    monitor.registerCheck("db", async () => ({ status: "up" }));

    const result = await monitor.check();
    expect(result.status).toBe("unhealthy");
    expect(result.checks.api.status).toBe("down");
  });

  it("should report degraded when check is degraded", async () => {
    monitor.registerCheck("api", async () => ({ status: "degraded" }));
    monitor.registerCheck("db", async () => ({ status: "up" }));

    const result = await monitor.check();
    expect(result.status).toBe("degraded");
  });

  it("should handle check exceptions", async () => {
    monitor.registerCheck("api", async () => {
      throw new Error("Connection failed");
    });

    const result = await monitor.check();
    expect(result.status).toBe("unhealthy");
    expect(result.checks.api.status).toBe("down");
    expect(result.checks.api.message).toBe("Connection failed");
  });

  it("should measure latency", async () => {
    monitor.registerCheck("slow", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { status: "up" };
    });

    const result = await monitor.check();
    expect(result.checks.slow.latency).toBeGreaterThanOrEqual(50);
  });
});
