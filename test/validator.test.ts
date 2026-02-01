import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { StrictValidator } from "../src/core/validator.js";
import type { FreeModel } from "../src/types/index.js";

// Mock fs and path at top level
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: (...args: string[]) => args.join("/"),
}));

vi.mock("os", () => ({
  homedir: () => "/home/test",
}));

describe("StrictValidator", () => {
  let validModel: FreeModel;
  let lowConfidenceModel: FreeModel;
  let notFreeModel: FreeModel;

  beforeEach(() => {
    validModel = {
      id: "test/free-model",
      provider: "test",
      name: "Free Model",
      isFree: true,
      isElite: true,
      category: "coding",
      confidence: 1.0,
      tier: "CONFIRMED_FREE",
      pricing: { prompt: "0", completion: "0", request: "0" },
    };

    lowConfidenceModel = {
      ...validModel,
      id: "test/low-confidence",
      confidence: 0.5,
      tier: "CONFIRMED_FREE",
    };

    notFreeModel = {
      ...validModel,
      id: "test/not-free",
      tier: "FREEMIUM_LIMITED",
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isUltraFreeSafe", () => {
    it("should validate model with CONFIRMED_FREE tier and high confidence", () => {
      const result = StrictValidator.isUltraFreeSafe(validModel);

      expect(result.isSafe).toBe(true);
      expect(result.failedChecks).toEqual([]);
    });

    it("should fail model with CONFIDENCE < 0.9", () => {
      const result = StrictValidator.isUltraFreeSafe(lowConfidenceModel);

      expect(result.isSafe).toBe(false);
      expect(result.failedChecks).toContain("confidence");
    });

    it("should fail model with tier !== CONFIRMED_FREE", () => {
      const result = StrictValidator.isUltraFreeSafe(notFreeModel);

      expect(result.isSafe).toBe(false);
      expect(result.failedChecks).toContain("tier");
    });

    it("should fail model without multiple sources (confidence < 1.0)", () => {
      const mediumConfModel = {
        ...validModel,
        id: "test/medium-conf",
        confidence: 0.95,
      };
      const result = StrictValidator.isUltraFreeSafe(mediumConfModel);

      expect(result.isSafe).toBe(false);
      expect(result.failedChecks).toContain("multi_source");
    });

    it("should return timestamp in result", () => {
      const result = StrictValidator.isUltraFreeSafe(validModel);

      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe("getBlockedModels", () => {
    it("should return empty array when audit file doesn't exist", () => {
      const entries = StrictValidator.getBlockedModels();
      expect(entries).toEqual([]);
    });

    it("should return empty array when audit file is empty", async () => {
      const { readFileSync } = await import("fs");
      (readFileSync as any).mockReturnValue("");

      const entries = StrictValidator.getBlockedModels();
      expect(entries).toEqual([]);
    });

    it("should parse audit entries correctly", async () => {
      const { readFileSync } = await import("fs");
      (readFileSync as any).mockReturnValue(
        '{"timestamp":"2026-01-01T00:00:00.000Z","model":"test/model","provider":"test","tier":"CONFIRMED_FREE","confidence":1.0,"reason":"test"}\n' +
        '{"timestamp":"2026-01-01T00:00:01.000Z","model":"test/model2","provider":"test2","tier":"FREEMIUM","confidence":0.5,"reason":"test2"}'
      );

      const entries = StrictValidator.getBlockedModels();

      expect(entries).toHaveLength(2);
      expect(entries[0].model).toBe("test/model2"); // Reversed
      expect(entries[1].model).toBe("test/model");
    });

    it("should respect limit parameter", async () => {
      const { readFileSync } = await import("fs");
      const entriesJson = Array.from({ length: 20 }, (_, i) =>
        JSON.stringify({
          timestamp: new Date().toISOString(),
          model: `test/model-${i}`,
          provider: "test",
          tier: "CONFIRMED_FREE",
          confidence: 1.0,
          reason: "test",
        }),
      ).join("\n");

      (readFileSync as any).mockReturnValue(entriesJson);

      const entries = StrictValidator.getBlockedModels(10);

      expect(entries).toHaveLength(10);
    });

    it("should handle invalid JSON lines gracefully", async () => {
      const { readFileSync } = await import("fs");
      (readFileSync as any).mockReturnValue(
        '{"timestamp":"2026-01-01T00:00:00.000Z","model":"test/model","provider":"test","tier":"CONFIRMED_FREE","confidence":1.0,"reason":"test"}\n' +
        'invalid json line\n' +
        '{"timestamp":"2026-01-01T00:00:01.000Z","model":"test/model2","provider":"test2","tier":"FREEMIUM","confidence":0.5,"reason":"test2"}'
      );

      const entries = StrictValidator.getBlockedModels();

      expect(entries).toHaveLength(2);
      expect(entries[0].model).toBe("test/model2");
      expect(entries[1].model).toBe("test/model");
    });
  });
});
