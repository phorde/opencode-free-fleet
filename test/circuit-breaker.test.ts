import { describe, it, expect, beforeEach, vi } from "vitest";
import { CircuitBreaker } from "../src/core/circuit-breaker.js";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker(3, 100);
  });

  it("should be closed initially", () => {
    expect(breaker.getState()).toBe("CLOSED");
  });

  it("should execute successful function", async () => {
    const result = await breaker.execute(async () => "success");
    expect(result).toBe("success");
    expect(breaker.getState()).toBe("CLOSED");
  });

  it("should count failures", async () => {
    await expect(
      breaker.execute(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");
    expect(breaker.getFailures()).toBe(1);
    expect(breaker.getState()).toBe("CLOSED");
  });

  it("should open after threshold failures", async () => {
    for (let i = 0; i < 3; i++) {
      await expect(
        breaker.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }
    expect(breaker.getState()).toBe("OPEN");
  });

  it("should reject immediately when open", async () => {
    for (let i = 0; i < 3; i++) {
      await expect(
        breaker.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }

    await expect(breaker.execute(async () => "success")).rejects.toThrow(
      "Circuit breaker is OPEN",
    );
  });

  it("should transition to HALF_OPEN after timeout", async () => {
    for (let i = 0; i < 3; i++) {
      await expect(
        breaker.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }

    await new Promise((resolve) => setTimeout(resolve, 110));

    const result = await breaker.execute(async () => "success");
    expect(result).toBe("success");
    expect(breaker.getState()).toBe("CLOSED");
  });

  it("should reopen if failure happens in HALF_OPEN", async () => {
    for (let i = 0; i < 3; i++) {
      await expect(
        breaker.execute(async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }

    await new Promise((resolve) => setTimeout(resolve, 110));

    await expect(
      breaker.execute(async () => {
        throw new Error("fail again");
      }),
    ).rejects.toThrow("fail again");

    expect(breaker.getState()).toBe("OPEN");
  });
});
