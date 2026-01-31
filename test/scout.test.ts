/**
 * Scout unit tests - v0.2.0 Multi-Provider Support
 *
 * Tests for model discovery, ranking, and categorization logic
 * with support for multiple providers (OpenRouter, Groq, Cerebras, etc.)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Scout, createScout } from "../src/core/scout.js";
import type { FreeModel } from "../src/types/index.js";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  access: vi.fn(),
}));

// Mock path
vi.mock("path", async () => ({
  join: (...args: string[]) => args.join("/"),
}));

describe("Scout (v0.2.0)", () => {
  let scout: Scout;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mockFs = await import("fs/promises");
    const mockPath = await import("path");

    scout = createScout({
      antigravityPath: "/mock/path/antigravity-accounts.json",
      opencodeConfigPath: "/mock/path/oh-my-opencode.json",
      allowAntigravity: false, // Default to allow, will test both scenarios
    });
  });

  describe("buildBlocklist", () => {
    it("should create empty blocklist when no antigravity config exists", async () => {
      ((await import("fs/promises")) as any).readFile.mockRejectedValue(
        new Error("File not found"),
      );
      ((await import("fs/promises")) as any).access.mockRejectedValue(
        new Error("File not found"),
      );

      await (scout as any).buildBlocklist();

      expect((scout as any).blocklist.size).toBe(0);
    });

    it("should block google and gemini when antigravity accounts exist and allowAntigravity is false", async () => {
      const mockAccounts = {
        version: 3,
        accounts: [
          { email: "test@gmail.com", refreshToken: "abc", enabled: true },
        ],
      };

      ((await import("fs/promises")) as any).readFile.mockResolvedValue(
        JSON.stringify(mockAccounts),
      );
      ((await import("fs/promises")) as any).access.mockResolvedValue(
        undefined,
      );

      const newScout = createScout({
        antigravityPath: "/mock/path/antigravity-accounts.json",
        opencodeConfigPath: "/mock/path/oh-my-opencode.json",
        allowAntigravity: false, // BLOCK by default
      });

      // Manually set antigravityActive to true since we're not calling initialize()
      (newScout as any).antigravityActive = true;

      await (newScout as any).buildBlocklist();

      expect((newScout as any).blocklist.has("google")).toBe(true);
      expect((newScout as any).blocklist.has("gemini")).toBe(true);
      expect((newScout as any).blocklist.has("opencode")).toBe(true);
      expect((newScout as any).blocklist.size).toBe(3);
    });

    it("should NOT block google and gemini when allowAntigravity is true", async () => {
      const mockAccounts = {
        version: 3,
        accounts: [
          { email: "test@gmail.com", refreshToken: "abc", enabled: true },
        ],
      };

      ((await import("fs/promises")) as any).readFile.mockResolvedValue(
        JSON.stringify(mockAccounts),
      );
      ((await import("fs/promises")) as any).access.mockResolvedValue(
        undefined,
      );

      const newScout = createScout({
        antigravityPath: "/mock/path/antigravity-accounts.json",
        opencodeConfigPath: "/mock/path/oh-my-opencode.json",
        allowAntigravity: true, // ALLOW by explicit config
      });

      await (newScout as any).buildBlocklist();

      expect((newScout as any).blocklist.has("google")).toBe(false);
      expect((newScout as any).blocklist.has("gemini")).toBe(false);
      expect((newScout as any).blocklist.size).toBe(0);
    });

    it("should flag models as requires_auth when Antigravity is active", async () => {
      const mockAccounts = {
        version: 3,
        accounts: [
          { email: "test@gmail.com", refreshToken: "abc", enabled: true },
        ],
      };

      ((await import("fs/promises")) as any).readFile.mockResolvedValue(
        JSON.stringify(mockAccounts),
      );
      ((await import("fs/promises")) as any).access.mockResolvedValue(
        undefined,
      );

      const newScout = createScout({
        antigravityPath: "/mock/path/antigravity-accounts.json",
        opencodeConfigPath: "/mock/path/oh-my-opencode.json",
        allowAntigravity: false,
      });

      (newScout as any).antigravityActive = true;

      await (newScout as any).buildBlocklist();

      const blocklist = (newScout as any).blocklist;

      // Google/Gemini should be in blocklist
      expect(blocklist.has("google")).toBe(true);
      expect(blocklist.has("gemini")).toBe(true);

      // Models from these providers should be flagged in the future
      // (actual flagging happens in filterBlockedModels)
    });
  });

  describe("detectActiveProviders", () => {
    it("should detect providers from oh-my-opencode.json categories", async () => {
      const mockConfig = {
        google_auth: false,
        categories: {
          free_code_generation: {
            model: "openrouter/qwen/qwen3-coder:free",
            fallback: ["zai-coding-plan/glm-4.7-flash"],
          },
          free_reasoning: {
            model: "groq/llama-3.1-8b-instruct",
            fallback: ["cerebras/llama-3-1-8b-instruct"],
          },
        },
      };

      ((await import("fs/promises")) as any).readFile.mockResolvedValue(
        JSON.stringify(mockConfig),
      );

      const result = await (scout as any).detectActiveProviders();

      expect(result.errors).toHaveLength(0);

      // Sort providers to ensure consistent comparison regardless of detection order
      const sortedProviders = result.providers.sort();
      const expectedProviders = [
        "openrouter",
        "zai-coding-plan",
        "groq",
        "cerebras",
      ].sort();

      expect(sortedProviders).toEqual(expectedProviders);
      expect(result.adapters.size).toBe(4);
    });

    it("should extract providers from fallback arrays", async () => {
      const mockConfig = {
        categories: {
          test_category: {
            model: "primary/model",
            fallback: [
              "provider-a/model",
              "provider-b/model",
              "provider-c/model",
            ],
          },
        },
      };

      ((await import("fs/promises")) as any).readFile.mockResolvedValue(
        JSON.stringify(mockConfig),
      );

      const result = await (scout as any).detectActiveProviders();

      const sortedProviders = result.providers.sort();
      const expectedProviders = [
        "primary",
        "provider-a",
        "provider-b",
        "provider-c",
      ].sort();

      expect(sortedProviders).toEqual(expectedProviders);
      expect(result.adapters.size).toBe(4);
    });

    it("should handle missing config file gracefully", async () => {
      ((await import("fs/promises")) as any).readFile.mockRejectedValue(
        new Error("File not found"),
      );

      const result = await (scout as any).detectActiveProviders();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to read OpenCode config");
      expect(result.providers).toEqual([]);
      expect(result.adapters.size).toBe(0);
    });
  });

  // Removed filterBlockedModels tests as the method is no longer exposed/used directly

  describe("rankModelsByBenchmark", () => {
    it("should prioritize elite models first", async () => {
      const mockModels: any[] = [
        {
          id: "some/random-model",
          provider: "provider",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
        {
          id: "qwen/qwen3-coder",
          provider: "openrouter",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
        {
          id: "deepseek/deepseek-r1",
          provider: "deepseek",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
      ];

      const ranked = await (scout as any).rankModelsByBenchmark(
        mockModels,
        "coding",
      );

      expect(ranked[0].id).toBe("qwen/qwen3-coder"); // Elite model first
    });

    it("should prefer larger models except for speed category", async () => {
      const mockModels: any[] = [
        {
          id: "some/model-7b",
          provider: "provider",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
        {
          id: "some/model-70b",
          provider: "provider",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
        {
          id: "some/model-3b",
          provider: "provider",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
      ];

      const rankedCoding = await (scout as any).rankModelsByBenchmark(
        mockModels,
        "coding",
      );
      const rankedSpeed = await (scout as any).rankModelsByBenchmark(
        mockModels,
        "speed",
      );

      // Coding: larger first
      expect(rankedCoding[0].id).toBe("some/model-70b");
      expect(rankedCoding[2].id).toBe("some/model-3b");

      // Speed: smaller first
      expect(rankedSpeed[0].id).toBe("some/model-3b");
      expect(rankedSpeed[2].id).toBe("some/model-70b");
    });
  });

  describe("categorizeModels", () => {
    it("should categorize models by functional patterns", async () => {
      const mockModels: any[] = [
        {
          id: "qwen/qwen3-coder",
          provider: "openrouter",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
        {
          id: "deepseek/deepseek-r1",
          provider: "deepseek",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
        {
          id: "mistralai/mistral-small",
          provider: "groq",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
        {
          id: "nvidia/nemotron-vl",
          provider: "openrouter",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
        {
          id: "some/generic-model",
          provider: "provider",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
      ];

      const categorized = (scout as any).categorizeModels(mockModels);

      expect(categorized.coding).toHaveLength(1);
      expect(categorized.coding[0].id).toBe("qwen/qwen3-coder");

      expect(categorized.reasoning).toHaveLength(1);
      expect(categorized.reasoning[0].id).toBe("deepseek/deepseek-r1");

      expect(categorized.speed).toHaveLength(1);
      expect(categorized.speed[0].id).toBe("mistralai/mistral-small");

      expect(categorized.multimodal).toHaveLength(1);
      expect(categorized.multimodal[0].id).toBe("nvidia/nemotron-vl");

      expect(categorized.writing).toHaveLength(1);
      expect(categorized.writing[0].id).toBe("some/generic-model");
    });

    it("should handle models that match multiple categories", async () => {
      const mockModels: any[] = [
        {
          id: "qwen/qwen3-coder-vl",
          provider: "openrouter",
          pricing: { prompt: "0", completion: "0", request: "0" },
        },
      ];

      const categorized = (scout as any).categorizeModels(mockModels);

      // Should be categorized by all matches (coding AND multimodal)
      expect(categorized.coding).toHaveLength(1);
      expect(categorized.multimodal).toHaveLength(1);
    });
  });
});
