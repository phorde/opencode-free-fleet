import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MetadataOracle } from "../src/core/oracle.js";
import { PersistenceManager } from "../src/core/persistence.js";
import { DaemonClient } from "../src/core/daemon-client.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock implementation must be hoisted
vi.mock("../src/core/persistence.js", () => ({
  PersistenceManager: {
    readJSON: vi.fn(),
    writeJSON: vi.fn(),
    ensureDir: vi.fn(),
  },
}));

vi.mock("../src/core/daemon-client.js", () => ({
  DaemonClient: {
    isAvailable: vi.fn(),
    getMetadata: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("MetadataOracle", () => {
  let oracle: MetadataOracle;

  beforeEach(() => {
    vi.resetAllMocks();

    (PersistenceManager.readJSON as any).mockReturnValue(null);
    (DaemonClient.isAvailable as any).mockResolvedValue(false);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({}),
      text: async () => "",
    });

    oracle = new MetadataOracle();
  });

  it("should initialize with empty cache if file missing", () => {
    expect(oracle).toBeDefined();
  });

  it("should fetch metadata from adapter if not in cache", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "gemma-7b",
            pricing: { prompt: "0", completion: "0" },
          },
        ],
      }),
    });

    const metadata = await oracle.fetchModelMetadata("gemma-7b", "openrouter");

    expect(metadata.isFree).toBe(true);
    expect(metadata.tier).toBe("CONFIRMED_FREE");
    expect(metadata.confidence).toBe(1.0);
  });

  it("should delegate to Daemon if available", async () => {
    (DaemonClient.isAvailable as any).mockResolvedValue(true);
    (DaemonClient.getMetadata as any).mockResolvedValue({
      id: "test-model",
      provider: "test",
      name: "Test Model",
      isFree: true,
      tier: "CONFIRMED_FREE",
      confidence: 1.0,
      reason: "Daemon said so",
      pricing: { prompt: "0", completion: "0", request: "0" },
    });

    const metadata = await oracle.fetchModelMetadata("test-model", "test");

    expect(metadata.tier).toBe("CONFIRMED_FREE");
    expect(DaemonClient.getMetadata).toHaveBeenCalledWith("test-model");
    expect(PersistenceManager.writeJSON).toHaveBeenCalled();
  });

  it("should fallback to adapters if Daemon returns null", async () => {
    (DaemonClient.isAvailable as any).mockResolvedValue(true);
    (DaemonClient.getMetadata as any).mockResolvedValue(null);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "fallback-model",
            pricing: { prompt: "0.5", completion: "1.0" },
          },
        ],
      }),
    });

    const metadata = await oracle.fetchModelMetadata(
      "fallback-model",
      "openrouter",
    );

    expect(metadata.isFree).toBe(false);
    expect(metadata.tier).toBe("CONFIRMED_PAID");
  });

  it("should handle timeout gracefully (parallel fetch)", async () => {
    mockFetch.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 6000));
      return { ok: true, json: async () => ({}) };
    });

    const metadata = await oracle.fetchModelMetadata(
      "slow-model",
      "openrouter",
    );

    expect(metadata.tier).toBe("UNKNOWN");
    expect(metadata.confidence).toBe(0);
  }, 10000);
});
