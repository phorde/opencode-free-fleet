import { TaskTypeDetector } from "./task-detector.js";
import { ModelSelector } from "./selector.js";
import { FreeModelRacer } from "./racer.js";
import { MetricsEngine } from "./metrics.js";
import type {
  DelegationConfig,
  ModelCategory,
  TaskType,
  DelegationResult,
} from "../types/index.js";

export interface DelegatorOptions {
  config?: Partial<DelegationConfig>;
}

export class Delegator {
  private taskDetector: TaskTypeDetector;
  private selector!: ModelSelector;
  private racer!: FreeModelRacer;
  private metrics: MetricsEngine;
  private config: DelegationConfig;

  constructor(
    private scout: () => ReturnType<typeof import("./scout.js").createScout>,
    options?: DelegatorOptions,
  ) {
    this.taskDetector = new TaskTypeDetector();
    this.metrics = new MetricsEngine();

    const defaultConfig: DelegationConfig = {
      mode: "balanced",
      raceCount: 5,
      transparentMode: false,
      fallbackDepth: 3,
    };

    this.config = { ...defaultConfig, ...(options?.config || {}) };
  }

  initialize(): void {
    const scoutInstance = this.scout();
    this.selector = new ModelSelector(scoutInstance, this.config);

    const racerConfig = {
      mode: this.config.mode,
      fallbackDepth: this.config.fallbackDepth,
      onFallback: (attempt: number, models: string[]) => {
        console.log(
          `⚠️ Delegator: Fallback attempt ${attempt} with ${models.length} models`,
        );
      },
    };

    this.racer = new FreeModelRacer(racerConfig);
  }

  async delegate<T>(
    prompt: string,
    executeWithModel: (model: string) => Promise<T>,
    options?: {
      forceCategory?: ModelCategory;
      forceTaskType?: TaskType;
    },
  ): Promise<DelegationResult<T>> {
    const startTime = Date.now();

    const taskType = options?.forceTaskType || this.taskDetector.detect(prompt);
    const category =
      options?.forceCategory || this.taskDetector.taskTypeToCategory(taskType);

    console.log(
      `🎯 Delegator: Task type '${taskType}' → Category '${category}'`,
    );

    const { primary, fallback } =
      await this.selector.selectWithFallback(category);

    console.log(
      `📋 Delegator: Racing ${primary.length} models (${fallback.length} fallback)`,
    );

    try {
      const result = await this.racer.raceWithFallback(
        primary,
        fallback,
        async (model) => {
          const res = await executeWithModel(model);
          return res;
        },
        `delegate-${Date.now()}`,
      );

      const latency = Date.now() - startTime;
      this.metrics.recordSuccess(
        result.model,
        latency,
        this.estimateTokens(prompt),
      );
      this.metrics.incrementDelegationCount();

      return {
        success: true,
        taskType,
        category,
        winner: result.model,
        result: result.result,
        latencyMs: latency,
        modelsRaced: primary.length,
      };
    } catch (error) {
      this.metrics.recordFailure("delegation-failed");
      throw error;
    }
  }

  async delegateSimple(
    prompt: string,
    options?: {
      forceCategory?: ModelCategory;
      forceTaskType?: TaskType;
    },
  ): Promise<string> {
    const result = await this.delegate(
      prompt,
      async () => {
        throw new Error(
          "executeWithModel callback required for delegateSimple",
        );
      },
      options,
    );

    return String(result.result);
  }

  getConfig(): DelegationConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<DelegationConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.selector) {
      this.selector.updateConfig(this.config);
    }

    if (this.racer) {
      this.racer.updateConfig({
        mode: this.config.mode,
        fallbackDepth: this.config.fallbackDepth,
      });
    }
  }

  getMetrics(): import("../types/index.js").SessionMetrics {
    return this.metrics.getSessionMetrics();
  }

  getTaskDetector(): TaskTypeDetector {
    return this.taskDetector;
  }

  getSelector(): ModelSelector {
    return this.selector;
  }

  getMetricsEngine(): MetricsEngine {
    return this.metrics;
  }

  private estimateTokens(prompt: string): number {
    const tokensPerWord = 1.3;
    const words = prompt.split(/\s+/).length;
    return Math.ceil(words * tokensPerWord);
  }
}

export const createDelegator = (
  scout: () => ReturnType<typeof import("./scout.js").createScout>,
  options?: DelegatorOptions,
): Delegator => {
  return new Delegator(scout, options);
};
