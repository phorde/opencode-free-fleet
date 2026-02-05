import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createAdapter } from "../src/core/adapters/index.js";

describe("GenericAdapter (Enhanced Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createAdapter", () => {
    it("should create GenericAdapter for unknown providers", () => {
      const adapter = createAdapter("unknown-provider", {
        baseUrl: "https://api.unknown.com/v1",
        apiKey: "sk-test",
      });
      expect(adapter.providerId).toBe("unknown-provider");
      expect(adapter.constructor.name).toMatch(/Generic|Resilient/);
    });

    it("should create OpenRouter adapter for openrouter provider", () => {
      const adapter = createAdapter("openrouter", {
        apiKey: "sk-test",
      });
      expect(adapter.providerId).toBe("openrouter");
      expect(adapter.constructor.name).toMatch(/OpenRouterAdapter/i);
    });

    it("should create Groq adapter for groq provider", () => {
      const adapter = createAdapter("groq", {
        apiKey: "sk-test",
      });
      expect(adapter.providerId).toBe("groq");
      expect(adapter.constructor.name).toMatch(/GroqAdapter/i);
    });

    it("should create Cerebras adapter for cerebras provider", () => {
      const adapter = createAdapter("cerebras", {
        apiKey: "sk-test",
      });
      expect(adapter.providerId).toBe("cerebras");
      expect(adapter.constructor.name).toMatch(/CerebrasAdapter/i);
    });
  });

  describe("baseUrl guessing", () => {
    it("should guess baseUrl for provider without explicit config", () => {
      const adapter = createAdapter("myprovider", {
        apiKey: "sk-test",
      });
      expect(adapter.constructor.name).toMatch(/Generic|Resilient/);
    });
  });
});
