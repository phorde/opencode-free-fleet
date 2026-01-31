import { describe, it, expect, beforeEach, vi } from "vitest";
import { DaemonClient } from "../src/core/daemon-client.js";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DaemonClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isAvailable", () => {
    it("should return true when health check succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "healthy" }),
      });

      const result = await DaemonClient.isAvailable();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
        expect.any(Object),
      );
    });

    it("should return false when health check fails (network error)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));

      const result = await DaemonClient.isAvailable();
      expect(result).toBe(false);
    });

    it("should return false when health check returns 500", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await DaemonClient.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe("getMetadata", () => {
    it("should return metadata on success", async () => {
      const mockMeta = { id: "test-model", tier: "CONFIRMED_FREE" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMeta,
      });

      const result = await DaemonClient.getMetadata("test-model");
      expect(result).toEqual(mockMeta);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/models/test-model"),
      );
    });

    it("should return null on 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await DaemonClient.getMetadata("unknown-model");
      expect(result).toBeNull();
    });

    it("should return null on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));

      const result = await DaemonClient.getMetadata("test-model");
      expect(result).toBeNull();
    });
  });
});
