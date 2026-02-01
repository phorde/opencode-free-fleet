import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MetricsEngine, createMetricsEngine } from "../src/core/metrics.js";
import type { ModelMetrics } from "../src/types/index.js";

// Mock fs and dependencies at top level
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(() => JSON.stringify({})),
  renameSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: (...args: string[]) => args.join("/"),
}));

vi.mock("os", () => ({
  homedir: () => "/home/test",
}));

describe("MetricsEngine", () => {
  let metricsEngine: MetricsEngine;

  beforeEach(() => {
    metricsEngine = createMetricsEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("recordSuccess", () => {
    it("should create new model metrics on first call", () => {
      metricsEngine.recordSuccess("openrouter/gemma-7b", 150, 500);

      const modelMetrics = metricsEngine.getModelMetrics("openrouter/gemma-7b");

      expect(modelMetrics).toBeDefined();
      expect(modelMetrics?.modelId).toBe("openrouter/gemma-7b");
      expect(modelMetrics?.totalCalls).toBe(1);
      expect(modelMetrics?.successCount).toBe(1);
      expect(modelMetrics?.avgLatencyMs).toBe(150);
      expect(modelMetrics?.totalTokensUsed).toBe(500);
    });

    it("should update existing model metrics on subsequent calls", () => {
      metricsEngine.recordSuccess("openrouter/gemma-7b", 150, 500);
      metricsEngine.recordSuccess("openrouter/gemma-7b", 200, 800);

      const modelMetrics = metricsEngine.getModelMetrics("openrouter/gemma-7b");

      expect(modelMetrics?.totalCalls).toBe(2);
      expect(modelMetrics?.successCount).toBe(2);
      expect(modelMetrics?.avgLatencyMs).toBeCloseTo(175, 1);
      expect(modelMetrics?.totalTokensUsed).toBe(1300);
    });
  });

  describe("recordFailure", () => {
    it("should record failure for model", () => {
      metricsEngine.recordFailure("openrouter/gemma-7b");

      const modelMetrics = metricsEngine.getModelMetrics("openrouter/gemma-7b");

      expect(modelMetrics?.totalCalls).toBe(1);
      expect(modelMetrics?.failureCount).toBe(1);
      expect(modelMetrics?.successCount).toBe(0);
    });

    it("should increment failures after successes", () => {
      metricsEngine.recordSuccess("openrouter/gemma-7b", 100, 300);
      metricsEngine.recordFailure("openrouter/gemma-7b");

      const modelMetrics = metricsEngine.getModelMetrics("openrouter/gemma-7b");

      expect(modelMetrics?.totalCalls).toBe(2);
      expect(modelMetrics?.successCount).toBe(1);
      expect(modelMetrics?.failureCount).toBe(1);
    });
  });

  describe("incrementDelegationCount", () => {
    it("should increment delegation count", () => {
      metricsEngine.incrementDelegationCount();

      const sessionMetrics = metricsEngine.getSessionMetrics();

      expect(sessionMetrics.delegationCount).toBe(1);
    });

    it("should increment across multiple calls", () => {
      metricsEngine.incrementDelegationCount();
      metricsEngine.incrementDelegationCount();
      metricsEngine.incrementDelegationCount();

      const sessionMetrics = metricsEngine.getSessionMetrics();

      expect(sessionMetrics.delegationCount).toBe(3);
    });
  });

  describe("getSessionMetrics", () => {
    it("should calculate session metrics", () => {
      metricsEngine.recordSuccess("openrouter/gemma-7b", 150, 500);
      metricsEngine.recordSuccess("openrouter/qwen", 200, 800);
      metricsEngine.incrementDelegationCount();
      metricsEngine.incrementDelegationCount();

      const sessionMetrics = metricsEngine.getSessionMetrics();

      expect(sessionMetrics.sessionId).toBeDefined();
      expect(sessionMetrics.delegationCount).toBe(2);
      expect(sessionMetrics.tokensSaved).toBeGreaterThan(0);
      expect(sessionMetrics.costSaved).toBeGreaterThan(0);
      expect(sessionMetrics.modelBreakdown.size).toBe(2);
    });
  });

  describe("getAllModelMetrics", () => {
    it("should return map of all model metrics", () => {
      metricsEngine.recordSuccess("openrouter/gemma-7b", 100, 300);
      metricsEngine.recordSuccess("openrouter/qwen", 200, 500);

      const allMetrics = metricsEngine.getAllModelMetrics();

      expect(allMetrics.size).toBe(2);
      expect(allMetrics.has("openrouter/gemma-7b")).toBe(true);
      expect(allMetrics.has("openrouter/qwen")).toBe(true);
    });
  });

  describe("resetSession", () => {
    it("should reset session data only", () => {
      metricsEngine.recordSuccess("openrouter/gemma-7b", 100, 300);
      metricsEngine.incrementDelegationCount();

      metricsEngine.resetSession();

      const sessionMetrics = metricsEngine.getSessionMetrics();
      const modelMetrics = metricsEngine.getModelMetrics("openrouter/gemma-7b");

      expect(sessionMetrics.delegationCount).toBe(0);
      expect(modelMetrics?.totalCalls).toBe(1);
    });
  });

  describe("resetAll", () => {
    it("should reset all data", () => {
      metricsEngine.recordSuccess("openrouter/gemma-7b", 100, 300);
      metricsEngine.incrementDelegationCount();

      metricsEngine.resetAll();

      const sessionMetrics = metricsEngine.getSessionMetrics();
      const allMetrics = metricsEngine.getAllModelMetrics();

      expect(sessionMetrics.delegationCount).toBe(0);
      expect(allMetrics.size).toBe(0);
    });
  });
});
