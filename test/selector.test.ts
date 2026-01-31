import { describe, it, expect, beforeEach, vi } from "vitest";
import { ModelSelector, createModelSelector } from "../src/core/selector.js";
import { Scout, createScout } from "../src/core/scout.js";
import type { DelegationConfig, ModelCategory } from "../src/types/index.js";

describe("ModelSelector", () => {
  let selector: ModelSelector;
  let mockScout: Scout;

  beforeEach(() => {
    mockScout = {
      discover: vi.fn(),
    } as unknown as Scout;
    const config: DelegationConfig = {
      mode: "balanced",
      raceCount: 5,
      transparentMode: false,
      fallbackDepth: 3,
    };
    selector = createModelSelector(mockScout, config);
  });

  describe("selectModels", () => {
    it("should return all free models in ultra_free mode", async () => {
      const mockResults = {
        coding: {
          models: [],
          eliteModels: [],
          rankedModels: [
            {
              id: "m1",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 1",
            },
            {
              id: "m2",
              provider: "openrouter",
              isFree: true,
              isElite: true,
              category: "coding",
              name: "Model 2",
            },
          ],
        },
      };
      (mockScout.discover as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResults,
      );

      selector.updateConfig({ mode: "ultra_free" });
      const models = await selector.selectModels("coding");

      expect(models).toEqual(["openrouter/m1", "openrouter/m2"]);
    });

    it("should return only elite models in SOTA_only mode", async () => {
      const mockResults = {
        coding: {
          models: [],
          eliteModels: [],
          rankedModels: [
            {
              id: "m1",
              provider: "openrouter",
              isFree: true,
              isElite: true,
              category: "coding",
              name: "Elite 1",
            },
            {
              id: "m2",
              provider: "openrouter",
              isFree: true,
              isElite: true,
              category: "coding",
              name: "Elite 2",
            },
            {
              id: "m3",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 3",
            },
          ],
        },
      };
      (mockScout.discover as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResults,
      );

      selector.updateConfig({ mode: "SOTA_only" });
      const models = await selector.selectModels("coding");

      expect(models).toEqual(["openrouter/m1", "openrouter/m2"]);
    });

    it("should return top N models in balanced mode", async () => {
      const mockResults = {
        coding: {
          models: [],
          eliteModels: [],
          rankedModels: [
            {
              id: "m1",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 1",
            },
            {
              id: "m2",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 2",
            },
            {
              id: "m3",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 3",
            },
            {
              id: "m4",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 4",
            },
            {
              id: "m5",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 5",
            },
          ],
        },
      };
      (mockScout.discover as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResults,
      );

      selector.updateConfig({ mode: "balanced", raceCount: 3 });
      const models = await selector.selectModels("coding");

      expect(models).toEqual([
        "openrouter/m1",
        "openrouter/m2",
        "openrouter/m3",
      ]);
    });
  });

  describe("selectWithFallback", () => {
    it("should split models into primary and fallback", async () => {
      const mockResults = {
        coding: {
          models: [],
          eliteModels: [],
          rankedModels: [
            {
              id: "m1",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 1",
            },
            {
              id: "m2",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 2",
            },
            {
              id: "m3",
              provider: "openrouter",
              isFree: true,
              isElite: false,
              category: "coding",
              name: "Model 3",
            },
          ],
        },
      };
      (mockScout.discover as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResults,
      );

      selector.updateConfig({ mode: "balanced", raceCount: 2 });
      const { primary, fallback } = await selector.selectWithFallback("coding");

      expect(primary).toEqual(["openrouter/m1", "openrouter/m2"]);
      expect(fallback).toEqual(["openrouter/m3"]);
    });
  });

  describe("getConfig and updateConfig", () => {
    it("should return current config", () => {
      const config = selector.getConfig();

      expect(config.mode).toBe("balanced");
      expect(config.raceCount).toBe(5);
    });

    it("should update config", () => {
      selector.updateConfig({ mode: "ultra_free", raceCount: 10 });

      const config = selector.getConfig();
      expect(config.mode).toBe("ultra_free");
      expect(config.raceCount).toBe(10);
    });
  });
});
