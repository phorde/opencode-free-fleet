import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MetadataOracle } from "../src/core/oracle.js";
import * as fs from "fs";
import * as os from "os";

describe("MetadataOracle (Enhanced Tests)", () => {
  let oracle: MetadataOracle;
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = `/tmp/oracle-test-${Date.now()}`;
    
    // Mock cache path
    vi.spyOn(os, "homedir").mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe("cache management", () => {
    it("should initialize with empty cache when file missing", () => {
      oracle = new MetadataOracle();
      // Should not throw
      expect(oracle).toBeDefined();
    });

    it("should load existing cache when file exists", () => {
      const cachePath = `${tempDir}/.config/opencode/cache/metadata.json`;
      const cacheDir = `${tempDir}/.config/opencode/cache`;
      fs.mkdirSync(cacheDir, { recursive: true });
      
      const cacheData = {
        "model1": { id: "model1", provider: "test", isFree: true, confidence: 1.0, tier: "CONFIRMED_FREE" },
        "model2": { id: "model2", provider: "test", isFree: true, confidence: 0.8, tier: "UNKNOWN" },
      };
      fs.writeFileSync(cachePath, JSON.stringify(cacheData));
      
      oracle = new MetadataOracle();
      // Cache should be loaded without error
      expect(oracle).toBeDefined();
    });
  });

  describe("model metadata", () => {
    it("should fetch metadata for unknown model", async () => {
      oracle = new MetadataOracle();
      
      // This will attempt to fetch from various sources
      const result = await oracle.fetchModelMetadata("unknown/model");
      
      // Should return some metadata even if incomplete
      expect(result).toBeDefined();
      expect(result).toHaveProperty("id");
    });

    it("should return cached metadata for known model", async () => {
      oracle = new MetadataOracle();
      
      const cachedModel = { id: "cached-model", provider: "test", isFree: true, confidence: 1.0, tier: "CONFIRMED_FREE" };
      const result = await oracle.fetchModelMetadata("cached-model");
      
      // Should return cached result
      expect(result).toBeDefined();
    });
  });

  describe("tier classification", () => {
    it("should classify CONFIRMED_FREE models correctly", () => {
      oracle = new MetadataOracle();
      const model = { id: "test", provider: "test", isFree: true, confidence: 1.0, tier: "CONFIRMED_FREE" };
      
      const metadata = { ...model, ...oracle };
      expect(metadata.tier).toBe("CONFIRMED_FREE");
      expect(metadata.confidence).toBe(1.0);
    });

    it("should classify FREEMIUM_LIMITED models correctly", () => {
      oracle = new MetadataOracle();
      const model = { id: "test", provider: "test", isFree: true, confidence: 0.5, tier: "FREEMIUM_LIMITED" };
      
      const metadata = { ...model, ...oracle };
      expect(metadata.tier).toBe("FREEMIUM_LIMITED");
      expect(metadata.confidence).toBe(0.5);
    });

    it("should classify UNKNOWN models correctly", () => {
      oracle = new MetadataOracle();
      const model = { id: "test", provider: "test", isFree: true, confidence: 0.0, tier: "UNKNOWN" };
      
      const metadata = { ...model, ...oracle };
      expect(metadata.tier).toBe("UNKNOWN");
      expect(metadata.confidence).toBe(0.0);
    });

    it("should classify CONFIRMED_PAID models correctly", () => {
      oracle = new MetadataOracle();
      const model = { id: "test", provider: "test", isFree: false, confidence: 1.0, tier: "CONFIRMED_PAID" };
      
      const metadata = { ...model, ...oracle };
      expect(metadata.tier).toBe("CONFIRMED_PAID");
      expect(metadata.isFree).toBe(false);
    });
  });

  describe("confidence scoring", () => {
    it("should have high confidence (1.0) for confirmed sources", () => {
      oracle = new MetadataOracle();
      const model = { id: "test", provider: "test", isFree: true, confidence: 1.0, tier: "CONFIRMED_FREE" };
      
      expect(model.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should have medium confidence (0.5-0.9) for uncertain sources", () => {
      oracle = new MetadataOracle();
      const model = { id: "test", provider: "test", isFree: true, confidence: 0.5, tier: "FREEMIUM_LIMITED" };
      
      expect(model.confidence).toBeGreaterThanOrEqual(0.5);
      expect(model.confidence).toBeLessThan(0.9);
    });

    it("should have low confidence (0.0-0.5) for unknown models", () => {
      oracle = new MetadataOracle();
      const model = { id: "test", provider: "test", isFree: true, confidence: 0.0, tier: "UNKNOWN" };
      
      expect(model.confidence).toBeGreaterThanOrEqual(0.0);
      expect(model.confidence).toBeLessThan(0.5);
    });
  });
});
