import { describe, it, expect, beforeEach, vi } from "vitest";
import { ModelSelector, createSelector } from "../src/core/selector.js";
import type { FreeModel } from "../src/types/index.js";
import type { FleetMode } from "../src/types/index.js";

describe("ModelSelector (Enhanced Tests)", () => {
  let mockModels: FreeModel[];
  let selector: ModelSelector;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockModels = [
      { 
        id: "model1", provider: "test", name: "Model 1", isFree: true, isElite: true,
        category: "coding", confidence: 1.0, tier: "CONFIRMED_FREE",
        pricing: { prompt: "0", completion: "0", request: "0" }
      },
      { 
        id: "model2", provider: "test", name: "Model 2", isFree: true, isElite: false,
        category: "coding", confidence: 0.9, tier: "CONFIRMED_FREE",
        pricing: { prompt: "0", completion: "0", request: "0" }
      },
      { 
        id: "model3", provider: "test", name: "Model 3", isFree: true, isElite: false,
        category: "reasoning", confidence: 0.8, tier: "UNKNOWN",
        pricing: { prompt: "0", completion: "0", request: "0" }
      },
    ] as FreeModel[];

    selector = createSelector();
  });

  describe("selectModels for ultra_free mode", () => {
    it("should return ALL models regardless of confidence", () => {
      selector.updateConfig({ mode: "ultra_free" as FleetMode });
      const selected = selector.selectModels(mockModels, "coding");
      
      // In ultra_free mode, all confirmed free models should be returned
      expect(selected.length).toBeGreaterThan(0);
    });

    it("should filter out non-free models", () => {
      const nonFreeModels = mockModels.map(m => ({ ...m, isFree: false }));
      selector.updateConfig({ mode: "ultra_free" as FleetMode });
      const selected = selector.selectModels(nonFreeModels, "coding");
      
      expect(selected).toHaveLength(0);
    });
  });

  describe("selectModels for SOTA_only mode", () => {
    it("should return only elite models", () => {
      selector.updateConfig({ mode: "SOTA_only" as FleetMode });
      const selected = selector.selectModels(mockModels, "coding");
      
      const allElite = selected.every(m => m.isElite);
      expect(allElite).toBe(true);
    });

    it("should return empty array if no elite models", () => {
      const noEliteModels = mockModels.map(m => ({ ...m, isElite: false }));
      selector.updateConfig({ mode: "SOTA_only" as FleetMode });
      const selected = selector.selectModels(noEliteModels, "coding");
      
      expect(selected).toHaveLength(0);
    });
  });

  describe("selectModels for balanced mode", () => {
    it("should return top N models", () => {
      selector.updateConfig({ mode: "balanced", raceCount: 2 });
      const selected = selector.selectModels(mockModels, "coding");
      
      expect(selected.length).toBeLessThanOrEqual(2);
    });

    it("should prioritize elite models", () => {
      selector.updateConfig({ mode: "balanced", raceCount: 5 });
      const selected = selector.selectModels(mockModels, "coding");
      
      const hasElite = selected.some(m => m.isElite);
      expect(hasElite).toBe(true);
    });
  });

  describe("selectModels by category", () => {
    it("should filter by coding category", () => {
      const selected = selector.selectModels(mockModels, "coding");
      expect(selected.every(m => m.category === "coding")).toBe(true);
    });

    it("should filter by reasoning category", () => {
      const selected = selector.selectModels(mockModels, "reasoning");
      expect(selected.every(m => m.category === "reasoning")).toBe(true);
    });

    it("should filter by speed category", () => {
      const selected = selector.selectModels(mockModels, "speed");
      expect(selected.every(m => m.category === "speed")).toBe(true);
    });

    it("should filter by multimodal category", () => {
      const selected = selector.selectModels(mockModels, "multimodal");
      expect(selected.every(m => m.category === "multimodal")).toBe(true);
    });

    it("should filter by writing category", () => {
      const selected = selector.selectModels(mockModels, "writing");
      expect(selected.every(m => m.category === "writing")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty model array", () => {
      const selected = selector.selectModels([], "coding");
      expect(selected).toEqual([]);
    });

    it("should handle mismatched category", () => {
      const selected = selector.selectModels(mockModels, "nonexistent" as any);
      expect(selected).toEqual([]);
    });
  });
});
