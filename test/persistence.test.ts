import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { PersistenceManager } from "../src/core/persistence.js";

// Mock fs and path at top level
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock("path", () => ({
  dirname: (p: string) => p.split("/").slice(0, -1).join("/"),
}));

describe("PersistenceManager", () => {
  const mockFs = {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ensureDir", () => {
    it("should create directory if it doesn't exist", () => {
      mockFs.existsSync.mockReturnValue(false);
      PersistenceManager.ensureDir("/test/dir");
      expect(mockFs.mkdirSync).toHaveBeenCalledWith("/test/dir", {
        recursive: true,
      });
    });

    it("should not create directory if it exists", () => {
      mockFs.existsSync.mockReturnValue(true);
      PersistenceManager.ensureDir("/test/dir");
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("writeJSON", () => {
    it("should write data to a JSON file atomically", () => {
      mockFs.existsSync.mockReturnValue(true);
      const data = { test: "data" };
      PersistenceManager.writeJSON("/test/file.json", data);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        "/test/file.json.tmp",
        JSON.stringify(data, null, 2),
        "utf-8",
      );
      expect(mockFs.renameSync).toHaveBeenCalledWith(
        "/test/file.json.tmp",
        "/test/file.json",
      );
    });

    it("should cleanup temp file on error", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.renameSync.mockImplementation(() => {
        throw new Error("rename failed");
      });
      mockFs.existsSync.mockImplementation((p: string) => p.endsWith(".tmp"));

      expect(() => PersistenceManager.writeJSON("/test/file.json", {})).toThrow(
        "rename failed",
      );
      expect(mockFs.unlinkSync).toHaveBeenCalledWith("/test/file.json.tmp");
    });
  });

  describe("readJSON", () => {
    it("should read and parse JSON file", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"test": "data"}');

      const result = PersistenceManager.readJSON("/test/file.json");
      expect(result).toEqual({ test: "data" });
    });

    it("should return null if file doesn't exist", () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = PersistenceManager.readJSON("/test/file.json");
      expect(result).toBeNull();
    });

    it("should return null if JSON is invalid", () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue("invalid json");

      const result = PersistenceManager.readJSON("/test/file.json");
      expect(result).toBeNull();
    });
  });
});
