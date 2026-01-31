import { describe, it, expect, vi, beforeEach } from "vitest";
import { MetadataOracle } from "../src/core/oracle.js";
import { PersistenceManager } from "../src/core/persistence.js";
import { DaemonClient } from "../src/core/daemon-client.js";
import * as os from "os";
import * as path from "path";

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

describe("Chaos Engineering Tests", () => {
  let oracle: MetadataOracle;

  beforeEach(() => {
    vi.resetAllMocks();

    (PersistenceManager.readJSON as any).mockReturnValue(null);
    (DaemonClient.isAvailable as any).mockResolvedValue(false);

    oracle = new MetadataOracle();
  });

  it("should survive network partition (all adapters fail)", async () => {
    mockFetch.mockRejectedValue(new Error("Network Partition"));

    const metadata = await oracle.fetchModelMetadata("chaos-model");

    expect(metadata.tier).toBe("CONFIRMED_PAID");
    expect(metadata.confidence).toBeLessThan(0.8);
  });

  it("should survive disk write failure", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "chaos-model", pricing: { prompt: "0", completion: "0" } },
        ],
      }),
    });

    (PersistenceManager.writeJSON as any).mockImplementation(() => {
      throw new Error("Disk Full");
    });

    const metadata = await oracle.fetchModelMetadata(
      "chaos-model",
      "openrouter",
    );

    expect(metadata.tier).toBe("CONFIRMED_FREE");
  });

  it("should survive slow daemon response", async () => {
    (DaemonClient.isAvailable as any).mockResolvedValue(true);
    (DaemonClient.getMetadata as any).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 2000));
      throw new Error("Timeout");
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "chaos-model",
            pricing: { prompt: "0", completion: "0" },
          },
        ],
      }),
    });

    const metadata = await oracle.fetchModelMetadata(
      "chaos-model",
      "openrouter",
    );
    expect(metadata.tier).toBe("CONFIRMED_FREE");
  });
});
