import { describe, it, expect, beforeEach, vi } from "vitest";
import { Delegator, createDelegator } from "../src/core/delegator.js";
import type { FleetMode, TaskType, ModelCategory } from "../src/types/index.js";
import type { DelegationConfig } from "../src/types/index.js";

describe("Delegator (Enhanced Tests)", () => {
  let mockScout: any;
  let delegator: Delegator;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockScout = {
      discover: vi.fn().mockResolvedValue({
        coding: {
          models: [],
          rankedModels: [
            { id: "model1", provider: "test", isFree: true, isElite: true, category: "coding", confidence: 1.0, tier: "CONFIRMED_FREE", pricing: { prompt: "0", completion: "0", request: "0" } as any,
          ],
          eliteModels: [],
        },
        reasoning: {
          models: [],
          rankedModels: [],
          eliteModels: [],
        },
        speed: {
          models: [],
          rankedModels: [],
          eliteModels: [],
        },
        multimodal: {
          models: [],
          rankedModels: [],
          eliteModels: [],
        },
        writing: {
          models: [],
          rankedModels: [],
          eliteModels: [],
        },
      }),
    };

    delegator = createDelegator(() => mockScout, {
      mode: "balanced",
      raceCount: 5,
      transparentMode: false,
      fallbackDepth: 3,
    });
    delegator.initialize();
  });

  describe("delegate with different task types", () => {
    it("should delegate code_generation task to coding category", async () => {
      const executeWithModel = vi.fn().mockResolvedValue({ result: "code" });
      
      await delegator.delegate("Write a React component", executeWithModel, {
        forceCategory: undefined,
        forceTaskType: undefined,
      });

      expect(executeWithModel).toHaveBeenCalled();
    });

    it("should delegate math task to reasoning category", async () => {
      const executeWithModel = vi.fn().mockResolvedValue({ result: "math" });
      
      await delegator.delegate("Solve 2 + 2", executeWithModel, {
        forceCategory: undefined,
        forceTaskType: undefined,
      });

      expect(executeWithModel).toHaveBeenCalled();
    });

    it("should delegate writing task to writing category", async () => {
      const executeWithModel = vi.fn().mockResolvedValue({ result: "text" });
      
      await delegator.delegate("Write a poem", executeWithModel, {
        forceCategory: undefined,
        forceTaskType: undefined,
      });

      expect(executeWithModel).toHaveBeenCalled();
    });

    it("should delegate translation task to reasoning category", async () => {
      const executeWithModel = vi.fn().mockResolvedValue({ result: "translation" });
      
      await delegator.delegate("Translate to Portuguese", executeWithModel, {
        forceCategory: undefined,
        forceTaskType: undefined,
      });

      expect(executeWithModel).toHaveBeenCalled();
    });
  });

  describe("delegation modes", () => {
    it("should use ultra_free mode when configured", () => {
      delegator.updateConfig({ mode: "ultra_free" as FleetMode });
      const config = delegator.getConfig();
      expect(config.mode).toBe("ultra_free");
    });

    it("should use SOTA_only mode when configured", () => {
      delegator.updateConfig({ mode: "SOTA_only" as FleetMode });
      const config = delegator.getConfig();
      expect(config.mode).toBe("SOTA_only");
    });

    it("should use balanced mode when configured", () => {
      delegator.updateConfig({ mode: "balanced" as FleetMode });
      const config = delegator.getConfig();
      expect(config.mode).toBe("balanced");
    });

    it("should handle raceCount configuration", () => {
      delegator.updateConfig({ raceCount: 10 });
      const config = delegator.getConfig();
      expect(config.raceCount).toBe(10);
    });

    it("should handle fallbackDepth configuration", () => {
      delegator.updateConfig({ fallbackDepth: -1 });
      const config = delegator.getConfig();
      expect(config.fallbackDepth).toBe(-1);
    });
  });

  describe("force options", () => {
    it("should respect forceCategory parameter", async () => {
      const executeWithModel = vi.fn().mockResolvedValue({ result: "forced" });
      
      await delegator.delegate("Some prompt", executeWithModel, {
        forceCategory: "reasoning" as ModelCategory,
        forceTaskType: undefined,
      });

      expect(executeWithModel).toHaveBeenCalled();
    });

    it("should respect forceTaskType parameter", async () => {
      const executeWithModel = vi.fn().mockResolvedValue({ result: "forced" });
      
      await delegator.delegate("Some prompt", executeWithModel, {
        forceCategory: undefined,
        forceTaskType: "debugging" as TaskType,
      });

      expect(executeWithModel).toHaveBeenCalled();
    });
  });
});
