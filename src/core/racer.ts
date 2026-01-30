/**
 * The Racer - Zero-Latency Model Competition
 *
 * This module implements Promise.any-based racing between multiple free models,
 * accepting the first valid response. This eliminates waterfall latency
 * and optimizes for zero-cost execution.
 *
 * Key Features:
 * - Promise.any for race condition
 * - AbortController for timeout handling
 * - Progress callbacks for monitoring
 * - Error aggregation for all failures
 */

import type {
  OpenRouterModel,
  ModelCategory,
  RaceResult,
  RaceConfig
} from '../types/index.js';

/**
 * Racer class for competing free models
 */
export class FreeModelRacer {
  private config: RaceConfig;
  private activeRaces: Map<string, AbortController> = new Map();

  constructor(config: RaceConfig = {}) {
    this.config = {
      timeoutMs: 30000,
      ...config
    };
  }

  /**
   * Compete between multiple free models and return the fastest valid response
   * Uses Promise.any for race condition - fires all requests simultaneously
   * and accepts the first valid response.
   *
   * @param models - Array of model identifiers to compete
   * @param executeWithModel - Function to execute task with a specific model
   * @param raceId - Optional ID for tracking and cancellation
   * @returns Object containing the winning model and its result
   *
   * @example
   * ```typescript
   * const racer = new FreeModelRacer({ timeoutMs: 15000 });
   *
   * const models = [
   *   'deepseek/deepseek-v3.2',
   *   'zai-coding-plan/glm-4.7-flash',
   *   'openrouter/mistralai/mistral-small-3.1-24b-instruct:free'
   * ];
   *
   * const winner = await racer.race(
   *   models,
   *   async (model) => {
   *     return await client.chat.completions.create({ model, messages });
   *   },
   *   'session-123'
   * );
   *
   * console.log(`Fastest: ${winner.model} (${winner.duration}ms)`);
   * return winner.result;
   * ```
   */
  async race<T>(
    models: string[],
    executeWithModel: (model: string) => Promise<T>,
    raceId: string = `race-${Date.now()}`
  ): Promise<RaceResult<T>> {
    if (models.length === 0) {
      throw new Error('Racer: No models provided for competition');
    }

    console.log(`🏁 Racer: Starting race '${raceId}' with ${models.length} models`);

    // Create abort controller for this race
    const abortController = new AbortController();
    this.activeRaces.set(raceId, abortController);

    const startTime = performance.now();

    try {
      const racePromises = models.map(async (model) => {
        try {
          // Notify started
          this.config.onProgress?.(model, 'started');

          const result = await Promise.race([
            executeWithModel(model),
            this.createTimeoutPromise(this.config.timeoutMs!, abortController.signal)
          ]);

          const duration = performance.now() - startTime;

          // Notify completed
          this.config.onProgress?.(model, 'completed');

          console.log(`✅ Racer: ${model} completed in ${duration.toFixed(0)}ms`);

          return { model, result, duration };
        } catch (error) {
          const err = error as Error;

          // Notify failed
          this.config.onProgress?.(model, 'failed', err);

          // Check if aborted
          if (err.name === 'AbortError') {
            console.log(`⏹️  Racer: ${model} aborted`);
          } else {
            console.log(`❌ Racer: ${model} failed - ${err.message}`);
          }

          throw new Error(`Model ${model} failed: ${err.message}`);
        }
      });

      const winner = await Promise.any(racePromises);

      // Abort all other pending requests
      abortController.abort();
      this.activeRaces.delete(raceId);

      console.log(`🏆 Racer: Winner is ${winner.model} (${winner.duration.toFixed(0)}ms)`);
      console.log(`   Competed against: ${models.join(', ')}`);

      return winner;
    } catch (error) {
      // Clean up
      this.activeRaces.delete(raceId);

      // AggregateError: all models failed
      const err = error as any;

      if (err.name === 'AggregateError' && err.errors) {
        const errorDetails = err.errors.map((e: any) => e.message).join('\n');
        throw new Error(
          `Racer: All ${models.length} models failed:\n${errorDetails}`
        );
      }

      // Check if race was externally aborted
      if (err.name === 'AbortError') {
        console.log(`🛑 Racer: Race '${raceId}' externally aborted`);
        throw new Error(`was aborted`);
      }

      throw err;
    }
  }

  /**
   * Race models from a category config
   */
  async raceFromCategory<T>(
    categoryConfig: { model: string; fallback: string[] },
    executeWithModel: (model: string) => Promise<T>,
    raceId?: string
  ): Promise<RaceResult<T>> {
    const allModels = [categoryConfig.model, ...categoryConfig.fallback];
    return this.race(allModels, executeWithModel, raceId);
  }

  /**
   * Cancel an active race by ID
   */
  cancelRace(raceId: string): boolean {
    const controller = this.activeRaces.get(raceId);
    if (controller) {
      controller.abort();
      this.activeRaces.delete(raceId);
      console.log(`🛑 Racer: Cancelled race '${raceId}'`);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active races
   */
  cancelAllRaces(): void {
    for (const [raceId, controller] of this.activeRaces.entries()) {
      controller.abort();
      console.log(`🛑 Racer: Cancelled race '${raceId}'`);
    }
    this.activeRaces.clear();
  }

  /**
   * Get count of active races
   */
  getActiveRaceCount(): number {
    return this.activeRaces.size;
  }

  /**
   * Check if a race is currently active
   */
  isRaceActive(raceId: string): boolean {
    return this.activeRaces.has(raceId);
  }

  /**
   * Create a timeout promise that rejects when abort signal is received
   */
  private createTimeoutPromise(timeoutMs: number, signal: AbortSignal): Promise<never> {
    return new Promise((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, timeoutMs);

      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('AbortError'));
      }, { once: true });
    });
  }

  /**
   * Update race configuration
   */
  updateConfig(config: Partial<RaceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current race configuration
   */
  getConfig(): Readonly<RaceConfig> {
    return { ...this.config };
  }
}

/**
 * Compete between multiple free models (convenience function)
 *
 * This is a stateless version of FreeModelRacer for simple one-off races.
 *
 * @param models - Array of model identifiers to compete
 * @param executeWithModel - Function to execute task with a specific model
 * @param config - Optional race configuration
 * @returns Object containing the winning model and its result
 */
export async function competeFreeModels<T>(
  models: string[],
  executeWithModel: (model: string) => Promise<T>,
  config?: RaceConfig
): Promise<RaceResult<T>> {
  const racer = new FreeModelRacer(config);
  return racer.race(models, executeWithModel);
}

/**
 * Create a new Racer instance with optional config
 */
export function createRacer(config?: RaceConfig): FreeModelRacer {
  return new FreeModelRacer(config);
}
