import type { ModelMetrics, SessionMetrics } from "../types/index.js";
import { PersistenceManager } from "./persistence.js";
import * as path from "path";
import * as os from "os";

export class MetricsEngine {
  private modelMetrics: Map<string, ModelMetrics> = new Map();
  private sessionStart: Date = new Date();
  private delegationCount: number = 0;
  private readonly METRICS_DIR = path.join(os.homedir(), ".config", "opencode");
  private readonly METRICS_FILE = "fleet-metrics.json";

  constructor() {
    this.loadHistoricalMetrics();
  }

  recordSuccess(modelId: string, latencyMs: number, tokensUsed: number): void {
    const existing =
      this.modelMetrics.get(modelId) || this.createEmpty(modelId);

    existing.totalCalls++;
    existing.successCount++;
    existing.avgLatencyMs = this.updateAverage(
      existing.avgLatencyMs,
      latencyMs,
      existing.totalCalls,
    );
    existing.totalTokensUsed += tokensUsed;
    existing.lastUsed = new Date();

    this.modelMetrics.set(modelId, existing);
    this.saveToDisk();
  }

  recordFailure(modelId: string): void {
    const existing =
      this.modelMetrics.get(modelId) || this.createEmpty(modelId);
    existing.totalCalls++;
    existing.failureCount++;
    existing.lastUsed = new Date();
    this.modelMetrics.set(modelId, existing);
    this.saveToDisk();
  }

  incrementDelegationCount(): void {
    this.delegationCount++;
    this.saveToDisk();
  }

  getSessionMetrics(): SessionMetrics {
    const tokensSaved = this.calculateTokensSaved();
    const costSaved = this.calculateCostSaved(tokensSaved);

    return {
      sessionId: `session-${this.sessionStart.getTime()}`,
      startTime: this.sessionStart,
      delegationCount: this.delegationCount,
      tokensSaved,
      costSaved,
      modelBreakdown: this.modelMetrics,
    };
  }

  getModelMetrics(modelId: string): ModelMetrics | undefined {
    return this.modelMetrics.get(modelId);
  }

  getAllModelMetrics(): Map<string, ModelMetrics> {
    return new Map(this.modelMetrics);
  }

  resetSession(): void {
    this.sessionStart = new Date();
    this.delegationCount = 0;
  }

  resetAll(): void {
    this.modelMetrics.clear();
    this.sessionStart = new Date();
    this.delegationCount = 0;
    this.saveToDisk();
  }

  exportToJSON(): string {
    return JSON.stringify(
      {
        session: this.getSessionMetrics(),
        models: Object.fromEntries(this.modelMetrics),
      },
      null,
      2,
    );
  }

  private createEmpty(modelId: string): ModelMetrics {
    return {
      modelId,
      totalCalls: 0,
      successCount: 0,
      failureCount: 0,
      avgLatencyMs: 0,
      totalTokensUsed: 0,
      lastUsed: new Date(),
    };
  }

  private updateAverage(
    currentAvg: number,
    newValue: number,
    count: number,
  ): number {
    return (currentAvg * (count - 1) + newValue) / count;
  }

  private calculateTokensSaved(): number {
    const totalTokensUsed = Array.from(this.modelMetrics.values()).reduce(
      (sum, m) => sum + m.totalTokensUsed,
      0,
    );

    const estimatedPaidUsage = this.delegationCount * 2000;
    return Math.max(0, estimatedPaidUsage - totalTokensUsed);
  }

  private calculateCostSaved(tokensSaved: number): number {
    const PAID_MODEL_RATE = 3.0 / 1_000_000;
    return tokensSaved * PAID_MODEL_RATE;
  }

  private saveToDisk(): void {
    try {
      const metricsPath = path.join(this.METRICS_DIR, this.METRICS_FILE);
      const data = {
        session: this.getSessionMetrics(),
        models: Object.fromEntries(this.modelMetrics),
        lastUpdated: new Date().toISOString(),
      };

      PersistenceManager.writeJSON(metricsPath, data);
    } catch (error) {
      console.warn(`MetricsEngine: Failed to save metrics to disk: ${error}`);
    }
  }

  private loadHistoricalMetrics(): void {
    try {
      const metricsPath = path.join(this.METRICS_DIR, this.METRICS_FILE);
      const parsed = PersistenceManager.readJSON<any>(metricsPath);

      if (parsed && parsed.models) {
        for (const [modelId, metrics] of Object.entries(parsed.models)) {
          const typed = metrics as ModelMetrics;
          typed.lastUsed = new Date(typed.lastUsed);
          this.modelMetrics.set(modelId, typed);
        }
      }

      console.log(
        `MetricsEngine: Loaded historical metrics for ${this.modelMetrics.size} models`,
      );
    } catch (error) {
      console.warn(
        `MetricsEngine: Failed to load historical metrics: ${error}`,
      );
    }
  }
}

export const createMetricsEngine = (): MetricsEngine => {
  return new MetricsEngine();
};
