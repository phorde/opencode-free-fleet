import { Scout } from "./scout.js";
import type {
  FreeModel,
  ModelCategory,
  FleetMode,
  DelegationConfig,
} from "../types/index.js";

interface ModelSelection {
  primary: string[];
  fallback: string[];
}

export class ModelSelector {
  private scout: Scout;
  private config: DelegationConfig;

  constructor(scout: Scout, config: DelegationConfig) {
    this.scout = scout;
    this.config = config;
  }

  async selectModels(category: ModelCategory): Promise<string[]> {
    const results = await this.scout.discover();
    const categoryResult = results[category];

    if (!categoryResult) {
      throw new Error(`No models found for category: ${category}`);
    }

    const freeModels = categoryResult.rankedModels.filter((m) => m.isFree);

    return this.filterByMode(freeModels);
  }

  async selectWithFallback(category: ModelCategory): Promise<ModelSelection> {
    const results = await this.scout.discover();
    const categoryResult = results[category];

    if (!categoryResult) {
      throw new Error(`No models found for category: ${category}`);
    }

    const freeModels = categoryResult.rankedModels.filter((m) => m.isFree);

    const primary = freeModels
      .slice(0, this.config.raceCount)
      .map((m) => `${m.provider}/${m.id}`);
    const fallback = freeModels
      .slice(this.config.raceCount)
      .map((m) => `${m.provider}/${m.id}`);

    return { primary, fallback };
  }

  private filterByMode(models: FreeModel[]): string[] {
    switch (this.config.mode) {
      case "ultra_free":
        return models.map((m) => `${m.provider}/${m.id}`);

      case "SOTA_only":
        return models
          .filter((m) => m.isElite)
          .slice(0, this.config.raceCount)
          .map((m) => `${m.provider}/${m.id}`);

      case "balanced":
      default:
        return models
          .slice(0, this.config.raceCount)
          .map((m) => `${m.provider}/${m.id}`);
    }
  }

  async selectModelsByProvider(
    category: ModelCategory,
    providers: string[],
  ): Promise<string[]> {
    const results = await this.scout.discover();
    const categoryResult = results[category];

    if (!categoryResult) {
      throw new Error(`No models found for category: ${category}`);
    }

    const providerSet = new Set(providers.map((p) => p.toLowerCase()));
    const filtered = categoryResult.rankedModels.filter(
      (m) => m.isFree && providerSet.has(m.provider.toLowerCase()),
    );

    return this.filterByMode(filtered);
  }

  getConfig(): DelegationConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<DelegationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const createModelSelector = (
  scout: Scout,
  config: DelegationConfig,
): ModelSelector => {
  return new ModelSelector(scout, config);
};
