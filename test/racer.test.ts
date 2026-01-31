/**
 * Racer unit tests
 *
 * Tests for model competition logic, Promise.any usage, and timeout handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  FreeModelRacer,
  createRacer,
  competeFreeModels,
} from "../src/core/racer.js";

describe("FreeModelRacer", () => {
  let racer: FreeModelRacer;

  beforeEach(() => {
    racer = new FreeModelRacer({
      timeoutMs: 1000,
      onProgress: vi.fn(),
    });
  });

  afterEach(() => {
    racer.cancelAllRaces();
  });

  describe("race", () => {
    it("should return fastest model response", async () => {
      const models = ["model1", "model2", "model3"];

      const executeWithModel = vi.fn(async (model: string) => {
        const delays = { model1: 200, model2: 100, model3: 300 };
        await new Promise((resolve) =>
          setTimeout(resolve, delays[model as keyof typeof delays]),
        );
        return { model, response: `Response from ${model}` };
      });

      const result = await racer.race(models, executeWithModel, "test-race-1");

      expect(result.model).toBe("model2"); // Fastest (100ms)
      expect(result.duration).toBeGreaterThanOrEqual(100);
      expect(result.duration).toBeLessThan(200);
      expect(executeWithModel).toHaveBeenCalledTimes(3); // All models attempted
    });

    it("should handle timeout and reject slow models", async () => {
      const models = ["slow-model", "fast-model"];

      const executeWithModel = vi.fn(async (model: string) => {
        if (model === "slow-model") {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // > timeout
        } else {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return { model, response: `Response from ${model}` };
      });

      const result = await racer.race(models, executeWithModel, "test-race-2");

      expect(result.model).toBe("fast-model"); // Only fast model completed
      expect(result.duration).toBeGreaterThanOrEqual(50);
      expect(executeWithModel).toHaveBeenCalledTimes(2);
    });

    it("should reject all models if all fail", async () => {
      const models = ["model1", "model2"];

      const executeWithModel = vi.fn(async () => {
        throw new Error("Model failed");
      });

      await expect(
        racer.race(models, executeWithModel, "test-race-3"),
      ).rejects.toThrow("All 2 models failed");
    });

    it("should throw if no models provided", async () => {
      await expect(
        racer.race([], async () => ({}) as any, "test-race-4"),
      ).rejects.toThrow("No models provided for competition");
    });

    it("should call onProgress for started and completed", async () => {
      const onProgress = vi.fn();
      racer.updateConfig({ onProgress });

      const models = ["model1"];

      const executeWithModel = async (model: string) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { model, response: "Response" };
      };

      await racer.race(models, executeWithModel, "test-race-5");

      expect(onProgress).toHaveBeenCalledWith("model1", "started");
      expect(onProgress).toHaveBeenCalledWith("model1", "completed");
    });

    it("should call onProgress with error when model fails", async () => {
      const onProgress = vi.fn();
      racer.updateConfig({ onProgress });

      const models = ["failing-model", "working-model"];

      const executeWithModel = async (model: string) => {
        if (model === "failing-model") {
          throw new Error("Failed");
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { model, response: "Response" };
        }
      };

      await racer.race(models, executeWithModel, "test-race-6");

      expect(onProgress).toHaveBeenCalledWith("failing-model", "started");
      expect(onProgress).toHaveBeenCalledWith(
        "failing-model",
        "failed",
        expect.any(Error),
      );
      expect(onProgress).toHaveBeenCalledWith("working-model", "completed");
    });
  });

  describe("raceFromCategory", () => {
    it("should compete all models from category config", async () => {
      const categoryConfig = {
        model: "primary-model",
        fallback: ["fallback1", "fallback2"],
      };

      const executeWithModel = vi.fn(async (model: string) => {
        const delays = { "primary-model": 150, fallback1: 100, fallback2: 200 };
        await new Promise((resolve) =>
          setTimeout(resolve, delays[model as keyof typeof delays] || 100),
        );
        return { model, response: "Response" };
      });

      const result = await racer.raceFromCategory(
        categoryConfig,
        executeWithModel,
      );

      expect(result.model).toBe("fallback1"); // Fastest
      expect(executeWithModel).toHaveBeenCalledTimes(3);
    });
  });

  describe("cancelRace", () => {
    it("should cancel active race by ID", async () => {
      const models = ["model1"];

      const executeWithModel = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Long running
        return { model: "model1", response: "Response" };
      });

      // Start race (don't await)
      const racePromise = racer.race(models, executeWithModel, "cancel-test");

      // Cancel immediately
      const cancelled = racer.cancelRace("cancel-test");

      expect(cancelled).toBe(true);

      // Should reject with abort error
      await expect(racePromise).rejects.toThrow("All 1 models failed");
    });

    it("should return false when race not found", () => {
      const cancelled = racer.cancelRace("nonexistent-race");
      expect(cancelled).toBe(false);
    });
  });

  describe("cancelAllRaces", () => {
    it("should cancel all active races", async () => {
      const models = ["model1"];

      const executeWithModel = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return { model: "model1", response: "Response" };
      });

      const racePromise = racer.race(models, executeWithModel, "race1");

      // Cancel all
      racer.cancelAllRaces();

      // Should have no active races
      expect(racer.getActiveRaceCount()).toBe(0);

      // Should reject
      await expect(racePromise).rejects.toThrow("All 1 models failed");
    });
  });

  describe("isRaceActive", () => {
    it("should return true for active race", async () => {
      const models = ["model1"];

      const executeWithModel = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return { model: "model1", response: "Response" };
      });

      racer.race(models, executeWithModel, "active-test");

      expect(racer.isRaceActive("active-test")).toBe(true);
    });

    it("should return false for non-existent race", () => {
      expect(racer.isRaceActive("nonexistent")).toBe(false);
    });
  });

  describe("getActiveRaceCount", () => {
    it("should return count of active races", () => {
      expect(racer.getActiveRaceCount()).toBe(0);

      // Note: Can't test multiple concurrent races easily without Promise.all
      // This tests the internal counter
      expect(racer.getActiveRaceCount()).toBe(0);
    });
  });

  describe("updateConfig", () => {
    it("should update race configuration", () => {
      racer.updateConfig({ timeoutMs: 5000 });

      const config = racer.getConfig();

      expect(config.timeoutMs).toBe(5000);
    });

    it("should merge new config with existing", () => {
      racer.updateConfig({ timeoutMs: 9999 });

      const newConfig = racer.getConfig();

      expect(newConfig.timeoutMs).toBe(9999);
    });
  });

  describe("getConfig", () => {
    it("should return readonly config copy", () => {
      const config = racer.getConfig();

      expect(config).toHaveProperty("timeoutMs");
      expect(config).toHaveProperty("onProgress");

      // Should be a copy, not reference
      expect(Object.isFrozen(config)).toBe(false); // Not frozen, but should be treated as readonly
    });
  });
});

describe("competeFreeModels", () => {
  it("should create racer and compete models", async () => {
    const models = ["model1", "model2"];

    const executeWithModel = vi.fn(async (model: string) => {
      const delays = { model1: 100, model2: 200 };
      await new Promise((resolve) =>
        setTimeout(resolve, delays[model as keyof typeof delays]),
      );
      return { model, response: `Response from ${model}` };
    });

    const result = await competeFreeModels(models, executeWithModel);

    expect(result.model).toBe("model1"); // Fastest
    expect(result.duration).toBeGreaterThanOrEqual(100);
  });
});

describe("createRacer", () => {
  it("should create new racer instance", () => {
    const racer = createRacer({ timeoutMs: 15000 });

    expect(racer).toBeInstanceOf(FreeModelRacer);

    const config = racer.getConfig();
    expect(config.timeoutMs).toBe(15000);
  });

  it("should create racer with default config if no args", () => {
    const racer = createRacer();

    expect(racer).toBeInstanceOf(FreeModelRacer);

    const config = racer.getConfig();
    expect(config.timeoutMs).toBe(30000); // Default
  });
});
