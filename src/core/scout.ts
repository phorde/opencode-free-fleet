/**
 * The Scout - Multi-Provider Free Model Discovery & Benchmark-Based Ranking
 *
 * v0.3.0 Upgrade: Zero-Config Mode, Live Updates, and Ultra-Free-Mode
 *
 * This module discovers free LLM models from ALL connected providers,
 * aggregates metadata from external APIs, and ranks them by SOTA benchmark performance.
 */

import type {
  FreeModel,
  ScoutConfig,
  ScoutResult,
  ModelCategory,
  ProviderAdapter,
  ActiveProvidersResult,
  CategoryConfig,
  OpenCodeConfig,
} from "../types/index.js";

import * as fs from "fs/promises";
import * as path from "path";

/**
 * Metadata Oracle
 * Aggregates data from multiple metadata sources
 */
import {
  MetadataOracle,
  ModelMetadata,
  CONFIRMED_FREE_MODELS,
} from "./oracle.js";

/**
 * Strict Validator for Ultra Free mode
 */
import { StrictValidator } from "./validator.js";

/**
 * Audit Logger
 */
import { AuditLogger, type AuditEvent } from "./audit.js";

/**
 * Default scout configuration
 */
const DEFAULT_CONFIG: ScoutConfig = {
  antigravityPath: `${process.env.HOME || ""}/.config/opencode/antigravity-accounts.json`,
  opencodeConfigPath: `${process.env.HOME || ""}/.config/opencode/oh-my-opencode.json`,
  allowAntigravity: false, // Default to BLOCK Google/Gemini
};

/**
 * Scout class for model discovery and ranking
 */
export class Scout {
  private config: ScoutConfig;
  private blocklist: Set<string> = new Set();
  private antigravityActive: boolean = false;
  private metadataOracle: MetadataOracle;

  constructor(config: Partial<ScoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metadataOracle = new MetadataOracle();
  }

  /**
   * Initialize metadata oracle and adapters
   */
  private async initialize(): Promise<void> {
    // Import Metadata Oracle
    console.log("🔮 Metadata Oracle: Initializing adapters...");

    // Note: Adapters are now implemented directly in src/core/adapters/index.ts
    // The Oracle uses them as needed

    // Check antigravity-auth plugin presence
    try {
      const antigravityPath = `${process.env.HOME || ""}/.config/opencode/plugins/opencode-antigravity-auth`;
      await fs.access(antigravityPath);
      this.antigravityActive = true;
      console.log("✓ Scout: Antigravity auth plugin detected");
    } catch {
      this.antigravityActive = false;
      console.log(
        "ℹ️  Scout: Could not read antigravity-auth config (may not be configured)",
      );
    }
  }

  /**
   * PHASE A: Safety Check - Build blocklist of paid/authenticated models
   *
   * Enhanced in v0.2.0:
   * - Check for Antigravity auth presence/configuration
   * - Respect allowAntigravity flag to optionally include Google/Gemini
   * - NOTE: Blocklist is now used for metadata filtering, not model exclusion
   */
  private async buildBlocklist(): Promise<Set<string>> {
    const blocklist = new Set<string>();

    // Antigravity auth is already checked in initialize()
    if (this.antigravityActive && !this.config.allowAntigravity) {
      console.log(
        "🚫 Scout: Blocking Google/Gemini from Free Fleet (allowAntigravity=false)",
      );
      blocklist.add("google");
      blocklist.add("gemini");
      blocklist.add("opencode");
    }

    this.blocklist = blocklist;

    if (blocklist.size > 0) {
      console.log(`🚫 Scout: Blocklist - ${Array.from(blocklist).join(", ")}`);
    } else {
      console.log(
        "✓ Scout: No active blocklist (allowAntigravity=true or no Antigravity)",
      );
    }

    return blocklist;
  }

  /**
   * Detect active providers from OpenCode configuration
   *
   * Zero-Config Mode: If config is missing (ENOENT), falls back to default providers
   */
  private async detectActiveProviders(): Promise<ActiveProvidersResult> {
    console.log("\n🔍 Scout: Detecting active OpenCode providers...");

    const providers: string[] = [];
    const adapters = new Map<string, ProviderAdapter>();
    const errors: string[] = [];
    let uniqueProviders: string[] = [];

    try {
      if (!this.config.opencodeConfigPath) {
        throw new Error("OpenCode config path not set");
      }

      let configContent: string;

      try {
        configContent = await fs.readFile(
          this.config.opencodeConfigPath,
          "utf-8",
        );
      } catch (readError: any) {
        if (readError.code === "ENOENT") {
          // Zero-Config Mode: Config file not found, use default providers
          console.log("⚠️ Zero-Config Mode Active");
          uniqueProviders = ["models.dev", "openrouter"];
          console.log(
            `📊 Scout: Using default providers: ${uniqueProviders.join(", ")}`,
          );

          // Create adapters for each provider
          const { createAdapter } = await import("./adapters/index.js");

          for (const providerId of uniqueProviders) {
            try {
              const adapter = createAdapter(providerId);
              adapters.set(providerId, adapter);
              console.log(`✓ Scout: Created adapter for ${providerId}`);
            } catch (error) {
              const err = error as Error;
              errors.push(`Adapter for ${providerId} failed: ${err.message}`);
            }
          }

          return {
            providers: uniqueProviders,
            adapters,
            errors,
          };
        } else {
          throw readError;
        }
      }

      const config = JSON.parse(configContent) as OpenCodeConfig;

      // Check for configured providers
      if (config.providers) {
        providers.push(...Object.keys(config.providers));
      }

      // Also check categories for provider patterns
      if (config.categories) {
        const categoryModels = Object.values(config.categories)
          .map((cat: any) => cat.model)
          .concat(
            ...Object.values(config.categories).map(
              (cat: any) => cat.fallback || [],
            ),
          )
          .map((model: string) => model.split("/")[0]);

        for (const provider of categoryModels) {
          if (!providers.includes(provider)) {
            providers.push(provider);
          }
        }
      }

      // Remove duplicates
      uniqueProviders = [...new Set(providers)];
      console.log(
        `📊 Scout: Detected providers: ${uniqueProviders.join(", ")}`,
      );

      // Create adapters for each provider
      const { createAdapter } = await import("./adapters/index.js");

      for (const providerId of uniqueProviders) {
        try {
          const providerConfig = config.providers?.[providerId] || {};
          const adapter = createAdapter(providerId, providerConfig);
          adapters.set(providerId, adapter);
          console.log(`✓ Scout: Created adapter for ${providerId}`);
        } catch (error) {
          const err = error as Error;
          errors.push(`Adapter for ${providerId} failed: ${err.message}`);
        }
      }
    } catch (error) {
      const err = error as Error;
      errors.push(`Failed to read OpenCode config: ${err.message}`);
    }

    return {
      providers: uniqueProviders,
      adapters,
      errors,
    };
  }

  /**
   * PHASE B: Fetch and Normalize Models with Metadata Oracle
   *
   * Enhanced in v0.2.0:
   * - Fetch models from provider adapters
   * - Enrich with metadata from MetadataOracle (Models.dev)
   * - Determine free tier based on aggregated metadata + confidence scoring
   * - Use metadata.isFree field instead of hardcoded free tier detection
   */
  private async fetchAllModels(): Promise<FreeModel[]> {
    console.log("\n📡 Scout: Fetching models with metadata enrichment...\n");

    const { providers, adapters, errors } = await this.detectActiveProviders();

    if (errors.length > 0) {
      console.error("\n⚠️  Scout: Provider detection had errors:");
      errors.forEach((err) => console.error(`  - ${err}`));
    }

    if (adapters.size === 0) {
      console.warn("\n⚠️  Scout: No active providers found");
      return [];
    }

    // Fetch from all active providers
    const providerModels = new Map<string, any[]>();

    for (const [providerId, adapter] of adapters.entries()) {
      try {
        console.log(`\n📡 Scout: Fetching from ${providerId}...`);
        const models = await adapter.fetchModels();

        // Enrich with metadata from MetadataOracle
        const enrichedModels: FreeModel[] = [];

        for (const providerModel of models) {
          const modelMetadata = await this.metadataOracle.fetchModelMetadata(
            providerModel.id,
            providerId,
          );

          // Determine free tier: Trust Provider Pricing OR Oracle
          // This allows GenericAdapter (OpenRouter) to work without Oracle for explicitly free models
          const isFreeViaProvider =
            providerModel.pricing?.prompt === "0" ||
            providerModel.pricing?.prompt === "0.0";

          const isFree = isFreeViaProvider || modelMetadata.isFree;
          const isElite = await this.isEliteModel(providerModel.id);

          enrichedModels.push({
            id: providerModel.id,
            provider: providerId,
            name: providerModel.name || providerModel.id.split("/")[1],
            description: providerModel.description,
            contextLength: providerModel.context_length,
            maxOutputTokens: providerModel.max_output_tokens,
            pricing: {
              prompt: modelMetadata.pricing?.prompt || "0",
              completion: modelMetadata.pricing?.completion || "0",
              request: modelMetadata.pricing?.request || "0",
            },
            isFree,
            isElite,
            category: this.categorizeModel(providerModel.id, providerModel),
            confidence: modelMetadata.confidence || 0.5,
            tier: isFreeViaProvider ? "CONFIRMED_FREE" : modelMetadata.tier,
          });
        }

        const blocklist = await this.buildBlocklist();
        const filteredModels = enrichedModels.filter((model) => {
          const isBlocked = blocklist.has(model.provider);
          if (isBlocked) {
            return false;
          }

          if (this.config.ultraFreeMode) {
            const validation = StrictValidator.isUltraFreeSafe(model);
            return validation.isSafe;
          }

          return true;
        });

        providerModels.set(providerId, filteredModels);
        console.log(
          `\n✓ Scout: ${providerId} - ${filteredModels.length} models, ${filteredModels.filter((m) => m.isFree).length} free\n`,
        );
      } catch (error) {
        console.error(
          `\n❌ Scout: Failed to fetch from ${providerId}: ${error}`,
        );
        // Add error models as empty array to continue
        providerModels.set(providerId, []);
      }
    }

    // Flatten all enriched models into single array
    const allModels: FreeModel[] = [];
    for (const models of providerModels.values()) {
      allModels.push(...models);
    }

    console.log(`\n✓ Scout: Total models discovered: ${allModels.length}`);

    return allModels;
  }

  /**
   * Categorize a model based on its ID patterns
   */
  private categorizeModel(modelId: string, providerModel: any): ModelCategory {
    const id = modelId.toLowerCase();
    let category: ModelCategory = "writing";

    if (
      id.includes("coder") ||
      id.includes("code") ||
      id.includes("function")
    ) {
      category = "coding";
    } else if (
      id.includes("r1") ||
      id.includes("reasoning") ||
      id.includes("cot") ||
      id.includes("qwq")
    ) {
      category = "reasoning";
    } else if (
      id.includes("flash") ||
      id.includes("distill") ||
      id.includes("nano") ||
      id.includes("lite")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    return category;
  }

  /**
   * Check if a model is in Elite families
   */
  private async isEliteModel(
    modelId: string,
    category: ModelCategory = "writing",
  ): Promise<boolean> {
    const { ELITE_FAMILIES } = await import("../types/index.js");
    const elitePatterns = ELITE_FAMILIES[category] || [];

    const id = modelId.toLowerCase();
    return elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );
  }

  /**
   * Extract parameter count from model ID
   * Looks for patterns like "70b", "8b", "32b" in the ID
   */
  private extractParams(id: string): number {
    const match = id.match(/(\d+)b/i);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Extract date from model ID (if available)
   * Looks for patterns like "2025-01", "v0.1" in the ID
   */
  private extractDate(id: string): Date | null {
    // Simplified version - in production, we'd use actual metadata
    return null;
  }

  /**
   * Get provider priority from metadata
   * Higher priority providers are listed first in OpenCode settings
   */
  private getProviderPriority(providerId: string): number {
    const priorityMap: Record<string, number> = {
      "models.dev": 1,
      openrouter: 2,
      groq: 4,
      cerebras: 5,
      google: 6,
      deepseek: 7,
      modelscope: 8,
      huggingface: 9,
    };

    return priorityMap[providerId] || 99;
  }

  /**
   * Get elite patterns for a specific category
   */
  private async _getElitePatterns(
    category: ModelCategory,
  ): Promise<readonly string[]> {
    const { ELITE_FAMILIES } = await import("../types/index.js");
    return ELITE_FAMILIES[category] || [];
  }

  /**
   * PHASE C: Ranking Algorithm - Multi-Provider SOTA Benchmarking
   *
   * Enhanced in v0.2.0:
   * - Priority 1: Metadata confidence score (from Models.dev, etc.)
   * - Priority 2: Elite family membership (SOTA benchmarks)
   * - Priority 3: Provider priority (from metadata provider ranking)
   * - Priority 4: Parameter count (larger > smaller, except for speed)
   * - Priority 5: Release date (newer > older)
   * - Priority 6: Alphabetical order (tiebreaker)
   */
  private async rankModelsByBenchmark(
    models: FreeModel[],
    category: ModelCategory,
  ): Promise<FreeModel[]> {
    // Need to do async sort carefully since Array.sort doesn't support async
    // So we pre-calculate values that need async

    const enrichedForSort = await Promise.all(
      models.map(async (m) => {
        return {
          ...m,
          isElite: await this.isEliteModel(m.id, category),
        };
      }),
    );

    return enrichedForSort.sort((a, b) => {
      // Priority 1: Metadata confidence score (higher is better)
      const aConfidence = a.confidence || 0;
      const bConfidence = b.confidence || 0;
      if (aConfidence !== bConfidence) {
        return bConfidence - aConfidence; // Higher confidence first
      }

      // Priority 2: Elite family membership (SOTA benchmarks)
      // Already resolved in isElite
      if (a.isElite && !b.isElite) return -1;
      if (!a.isElite && b.isElite) return 1;

      // Priority 3: Provider priority (from metadata)
      const aPriority = this.getProviderPriority(a.provider);
      const bPriority = this.getProviderPriority(b.provider);

      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower number = higher priority
      }

      // Priority 4: Parameter count (larger > smaller, except for speed)
      const aParams = this.extractParams(a.id);
      const bParams = this.extractParams(b.id);

      if (category === "speed") {
        if (aParams > 0 && bParams > 0 && aParams !== bParams) {
          return aParams - bParams; // Smaller first
        }
      } else {
        if (aParams > 0 && bParams > 0 && aParams !== bParams) {
          return bParams - aParams; // Larger first
        }
      }

      // Priority 5: Release date (newer > older)
      const aDate = this.extractDate(a.id);
      const bDate = this.extractDate(b.id);

      if (aDate && bDate && aDate !== bDate) {
        return aDate > bDate ? -1 : 1;
      }

      // Priority 6: Alphabetical order (tiebreaker)
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * PHASE D: Functional Categorization
   *
   * Sorts models into functional categories based on ID patterns:
   * - coding: IDs with "coder", "code", "function"
   * - reasoning: IDs with "r1", "reasoning", "cot", "qwq"
   * - speed: IDs with "flash", "distill", "nano", "lite"
   * - multimodal: IDs with "vl", "vision"
   * - writing: General purpose models not in other categories
   */
  private categorizeModels(
    models: FreeModel[],
  ): Record<ModelCategory, FreeModel[]> {
    const categories: Record<ModelCategory, FreeModel[]> = {
      coding: [],
      reasoning: [],
      speed: [],
      multimodal: [],
      writing: [],
    };

    for (const model of models) {
      const id = model.id.toLowerCase();
      let categorized = false;

      // Check each category
      if (
        id.includes("coder") ||
        id.includes("code") ||
        id.includes("function")
      ) {
        categories.coding.push(model);
        categorized = true;
      }

      if (
        id.includes("r1") ||
        id.includes("reasoning") ||
        id.includes("cot") ||
        id.includes("qwq")
      ) {
        categories.reasoning.push(model);
        categorized = true;
      }

      if (
        id.includes("flash") ||
        id.includes("distill") ||
        id.includes("nano") ||
        id.includes("lite") ||
        id.includes("small")
      ) {
        categories.speed.push(model);
        categorized = true;
      }

      if (id.includes("vl") || id.includes("vision") || id.includes("molmo")) {
        categories.multimodal.push(model);
        categorized = true;
      }

      // Add to writing if not categorized elsewhere (general purpose)
      if (!categorized) {
        categories.writing.push(model);
      }
    }

    return categories;
  }

  /**
   * Generate category configuration from ranked models
   */
  private generateCategoryConfig(
    category: ModelCategory,
    rankedModels: FreeModel[],
  ): CategoryConfig {
    // Ultra-Free-Mode: Return ALL models when enabled
    const topModels = this.config.ultraFreeMode
      ? rankedModels // Return all models
      : rankedModels.slice(0, Math.min(5, rankedModels.length)); // Default: top 5

    const modelIds = topModels.map((m) => `${m.provider}/${m.id}`);

    return {
      model: modelIds[0],
      fallback: modelIds.slice(1),
      description: `Auto-ranked by Free Fleet v0.3.0 (Metadata Oracle) - ${category.toUpperCase()} category`,
    };
  }

  /**
   * Main discovery and ranking method
   * Returns categorized and ranked free models from ALL active providers
   * with metadata enrichment from external APIs
   */
  async discover(): Promise<Record<ModelCategory, ScoutResult>> {
    console.log(
      "\n🤖 Free Fleet v0.3.0 (Metadata Oracle) - Starting omni-provider discovery...\n",
    );

    // Initialize metadata oracle and antigravity check
    await this.initialize();

    // Detect active providers
    const detectionResult = await this.detectActiveProviders();

    if (detectionResult.errors.length > 0) {
      console.error("\n⚠️  Scout: Provider detection had errors:");
      detectionResult.errors.forEach((err) => console.error(`  - ${err}`));
    }

    if (detectionResult.providers.length === 0) {
      console.warn("\n⚠️  Scout: No active providers found");
      // Don't throw, return empty result to allow graceful failure
      // throw new Error('No active providers detected. Please configure at least one provider in OpenCode.');
    }

    // PHASE B: Fetch and Normalize with Metadata Oracle
    const allModels = await this.fetchAllModels();

    console.log(`\n✓ Scout: Total models discovered: ${allModels.length}`);
    console.log(
      `\n✓ Scout: Free models: ${allModels.filter((m) => m.isFree).length}\n`,
    );

    // PHASE C + D: Categorize and Rank
    console.log(
      "\n📊 Scout: Categorizing and ranking models with metadata...\n",
    );
    const categorizedModels = this.categorizeModels(allModels);

    for (const [category, models] of Object.entries(categorizedModels)) {
      console.log(
        `  ${category}: ${models.length} models (${models.filter((m) => m.isFree).length} free)`,
      );
    }

    const results: Record<ModelCategory, ScoutResult> = {} as any;

    for (const [category, models] of Object.entries(categorizedModels)) {
      const cat = category as ModelCategory;

      // Apply multi-provider benchmark ranking
      const rankedModels = await this.rankModelsByBenchmark(models, cat);

      // Identify elite models
      const eliteModels = rankedModels.filter((model) => model.isElite);

      results[cat] = {
        category: cat,
        models,
        rankedModels,
        eliteModels,
      };
    }

    return results;
  }

  /**
   * Print summary of results
   */
  printSummary(results: Record<ModelCategory, ScoutResult>): void {
    console.log("\n" + "=".repeat(60));
    console.log("📈 Free Fleet v0.2.0 (Metadata Oracle) Discovery Results\n");

    for (const [category, result] of Object.entries(results)) {
      console.log(
        `\n📈 ${category.toUpperCase()} (top ${Math.min(5, result.rankedModels.length)}):`,
      );

      result.rankedModels.slice(0, 5).forEach((model, i) => {
        const isElite = result.eliteModels.includes(model);
        const providerTag = model.provider
          ? `[${model.provider.toUpperCase()}]`
          : "";
        const confidence = model.confidence || 0;
        const confidenceBadge =
          confidence >= 1.0 ? "✅" : confidence >= 0.7 ? "⚠️" : "✓";
        console.log(
          `  ${i + 1}. ${providerTag}${model.id}${isElite ? " ⭐ ELITE" : ""} [${confidence.toFixed(2)}] ${model.category?.toUpperCase()}`,
        );
      });
    }

    console.log("\n" + "=".repeat(60) + "\n");

    // Print free tier breakdown by provider
    const providerStats = new Map<string, { total: number; free: number }>();
    for (const [category, result] of Object.entries(results)) {
      for (const model of result.models) {
        const provider = model.provider || "unknown";
        if (!providerStats.has(provider)) {
          providerStats.set(provider, { total: 0, free: 0 });
        }

        const stats = providerStats.get(provider);
        // Add check for undefined
        if (stats) {
          stats.total++;
          if (model.isFree) stats.free++;
        }
      }
    }

    console.log("\n📊 Free Models by Provider (Metadata Oracle):");
    for (const [provider, stats] of providerStats.entries()) {
      console.log(
        `  ${provider}: ${stats.free}/${stats.total} (${((stats.free / stats.total) * 100).toFixed(1)}%) free`,
      );
    }
  }

  /**
   * Get configuration info
   */
  async getConfiguration(): Promise<{
    antigravityActive: boolean;
    allowAntigravity: boolean;
    blocklist: string[];
    hasMetadataOracle: boolean;
    providersAvailable?: string[];
  }> {
    return {
      antigravityActive: this.antigravityActive,
      allowAntigravity: this.config.allowAntigravity || false,
      blocklist: Array.from(this.blocklist),
      hasMetadataOracle: true,
      providersAvailable: Object.keys(
        (await this.detectActiveProviders()).adapters,
      ),
    };
  }
}

/**
 * Create a new Scout instance with optional config
 */
export function createScout(config?: Partial<ScoutConfig>): Scout {
  return new Scout(config);
}
