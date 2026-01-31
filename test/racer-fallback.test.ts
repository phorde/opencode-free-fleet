import { describe, it, expect } from "vitest";
import { FreeModelRacer } from "../src/core/racer.js";

describe("Racer Fallback Logic", () => {
  const racer = new FreeModelRacer({ timeoutMs: 1000 });

  it("should return the fastest successful result", async () => {
    const fast = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "fast";
    };
    const slow = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "slow";
    };

    const result = await racer.raceWithFallback(
      ["fast-model"],
      ["slow-model"],
      async (model) => {
        if (model === "fast-model") return fast();
        return slow();
      },
    );
    expect(result.result).toBe("fast");
  });

  it("should use fallback if primary fails", async () => {
    const result = await racer.raceWithFallback(
      ["fail-model"],
      ["success-model"],
      async (model) => {
        if (model === "fail-model") throw new Error("fail");
        return "success";
      },
    );
    expect(result.result).toBe("success");
    expect(result.model).toBe("success-model");
  });

  it("should throw if all attempts fail", async () => {
    await expect(
      racer.raceWithFallback(["fail1"], ["fail2"], async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow(/exhausted|exceeded/);
  });
});
