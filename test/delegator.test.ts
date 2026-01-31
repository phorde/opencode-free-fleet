import { describe, it, expect, beforeEach, vi } from "vitest";
import { Delegator, createDelegator } from "../src/core/delegator.js";

describe("Delegator", () => {
  let delegator: Delegator;
  let mockScout: any;
  let mockRacer: any;
  let mockMetrics: any;

  beforeEach(() => {
    mockScout = vi.fn(() => ({
      discover: vi.fn(),
    }));
    mockRacer = {
      raceWithFallback: vi.fn().mockResolvedValue({
        model: "openrouter/m1",
        result: "success",
      }),
      race: vi.fn(),
    };
    mockMetrics = {
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      incrementDelegationCount: vi.fn(),
      getSessionMetrics: vi.fn(),
    };
  });

  describe("delegate", () => {
    it("should detect task type from prompt", async () => {
      delegator = createDelegator(mockScout);

      const mockDetector = {
        detect: vi.fn().mockReturnValue("code_generation"),
        taskTypeToCategory: vi.fn().mockReturnValue("coding"),
        patterns: new Map(),
        getAllPatterns: vi.fn(),
      } as any;

      (delegator as any).taskDetector = mockDetector;

      const mockSelector = {
        selectWithFallback: vi.fn().mockResolvedValue({
          primary: ["openrouter/m1", "openrouter/m2"],
          fallback: ["openrouter/m3"],
        }),
        scout: {},
        config: {},
        selectModels: vi.fn(),
        filterByMode: vi.fn(),
        selectModelsByProvider: vi.fn(),
        getConfig: vi.fn(),
        updateConfig: vi.fn(),
      } as any;

      (delegator as any).selector = mockSelector;
      (delegator as any).racer = mockRacer;
      (delegator as any).metrics = mockMetrics;

      await delegator.delegate("write a function", vi.fn());

      expect(mockDetector.detect).toHaveBeenCalledWith("write a function");
      expect(mockMetrics.recordSuccess).toHaveBeenCalled();
      expect(mockMetrics.incrementDelegationCount).toHaveBeenCalled();
    });

    it("should use forced category when provided", async () => {
      delegator = createDelegator(mockScout);

      const mockDetector = {
        detect: vi.fn().mockReturnValue("general"),
        taskTypeToCategory: vi.fn().mockReturnValue("writing"),
        patterns: new Map(),
        getAllPatterns: vi.fn(),
      } as any;

      (delegator as any).taskDetector = mockDetector;

      const mockSelector = {
        selectWithFallback: vi.fn().mockResolvedValue({
          primary: ["openrouter/m1"],
          fallback: [],
        }),
        scout: {},
        config: {},
        selectModels: vi.fn(),
        filterByMode: vi.fn(),
        selectModelsByProvider: vi.fn(),
        getConfig: vi.fn(),
        updateConfig: vi.fn(),
      } as any;

      (delegator as any).selector = mockSelector;
      (delegator as any).racer = mockRacer;
      (delegator as any).metrics = mockMetrics;

      await delegator.delegate("test prompt", vi.fn(), {
        forceCategory: "reasoning",
      });

      expect(mockSelector.selectWithFallback).toHaveBeenCalledWith("reasoning");
    });
  });

  describe("getConfig and updateConfig", () => {
    it("should return current config", () => {
      delegator = createDelegator(mockScout);
      const config = delegator.getConfig();

      expect(config.mode).toBe("balanced");
      expect(config.raceCount).toBe(5);
    });

    it("should update config", () => {
      delegator = createDelegator(mockScout);
      delegator.updateConfig({ mode: "ultra_free", raceCount: 10 });

      const config = delegator.getConfig();
      expect(config.mode).toBe("ultra_free");
      expect(config.raceCount).toBe(10);
    });
  });
});
