export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: CircuitBreakerState = "CLOSED";

  constructor(
    private threshold = 3,
    private resetTimeout = 30000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.resetTimeout
      ) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}
