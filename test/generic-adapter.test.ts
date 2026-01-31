import { describe, it, expect, mock } from "bun:test";
import { createAdapter } from "../src/core/adapters/index.js";

describe("GenericAdapter", () => {
  it("should be created when no specific adapter exists", () => {
    const adapter = createAdapter("custom-provider", {
      baseUrl: "https://api.custom.com/v1",
      apiKey: "sk-test",
    });
    expect(adapter.providerId).toBe("custom-provider");
    expect(adapter.constructor.name).toBe("GenericAdapter");
  });

  it("should use provided baseUrl", async () => {
    const adapter = createAdapter("custom-provider", {
      baseUrl: "https://api.custom.com/v1",
      apiKey: "sk-test",
    });

    // Mock global fetch
    const originalFetch = global.fetch;
    const mockFetch = mock(
      async (url: string | URL | Request, init?: RequestInit) => {
        return new Response(
          JSON.stringify({
            data: [{ id: "model-1", object: "model" }],
          }),
        );
      },
    );
    global.fetch = mockFetch;

    try {
      const models = await adapter.fetchModels();
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe("model-1");

      // Verify call
      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      expect(call[0].toString()).toBe("https://api.custom.com/v1/models");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("should guess baseUrl if not provided", async () => {
    const adapter = createAdapter("new-ai", {
      apiKey: "sk-test",
    });

    // Mock global fetch
    const originalFetch = global.fetch;
    const mockFetch = mock(
      async (url: string | URL | Request, init?: RequestInit) => {
        return new Response(JSON.stringify({ data: [] }));
      },
    );
    global.fetch = mockFetch;

    try {
      await adapter.fetchModels();
      const call = mockFetch.mock.calls[0];
      expect(call[0].toString()).toBe("https://api.new-ai.com/v1/models");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
