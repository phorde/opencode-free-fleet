/**
 * The Scout - Multi-Provider Free Model Discovery & Benchmark-Based Ranking
 *
 * v0.2.0 Upgrade: Omni-Provider Support
 *
 * This module discovers free LLM models from ALL connected providers,
 * ranks them by SOTA benchmark performance, and provides optimized
 * configuration for economic load balancing.
 *
 * Philosophy: Quality > Quantity - Only models with proven benchmark performance
 * are included in Elite tier.
 */

import type {
  FreeModel,
  ScoutConfig,
  ScoutResult,
  ModelCategory,
  ProviderAdapter,
  ProviderModel,
  ActiveProvidersResult,
  CategoryConfig
} from '../types/index.js';

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Default scout configuration
 */
const DEFAULT_CONFIG: ScoutConfig = {
  antigravityPath: `${process.env.HOME || ''}/.config/opencode/antigravity-accounts.json`,
  opencodeConfigPath: `${process.env.HOME || ''}/.config/opencode/oh-my-opencode.json`,
  allowAntigravity: false // Default to BLOCK Google/Gemini from Free Fleet
};

/**
 * Scout class for model discovery and ranking
 */
export class Scout {
  private config: ScoutConfig;
  private blocklist: Set<string> = new Set();
  private antigravityActive: boolean = false;

  constructor(config: Partial<ScoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * PHASE A: Safety Check - Build blocklist of paid/authenticated models
   *
   * Enhanced in v0.2.0:
   * - Check for Antigravity auth presence/configuration
   * - Respect allowAntigravity flag to optionally include Google/Gemini
   */
  private async buildBlocklist(): Promise<Set<string>> {
    const blocklist = new Set<string>();

    // Check antigravity-auth plugin presence
    try {
      const antigravityPath = `${process.env.HOME || ''}/.config/opencode/plugins/opencode-antigravity-auth`;
      await fs.access(antigravityPath);
      this.antigravityActive = true;
      console.log('✓ Scout: Antigravity auth plugin detected');
    } catch {
      this.antigravityActive = false;
    }

    // Check antigravity-accounts.json for Google/Gemini accounts
    try {
      const content = await fs.readFile(this.config.antigravityPath!, 'utf-8');
      const antigravity = JSON.parse(content);

      if (antigravity.accounts && antigravity.accounts.length > 0) {
        console.log(`⚠️  Scout: Found ${antigravity.accounts.length} Google/Gemini authenticated accounts`);

        // Only block Google/Gemini if allowAntigravity is FALSE
        if (!this.config.allowAntigravity) {
          blocklist.add('google');
          blocklist.add('gemini');
          blocklist.add('opencode');
        }
      }
    } catch (error) {
      console.log(`ℹ️  Scout: Could not read antigravity-auth config (may not be configured)`);
    }

    this.blocklist = blocklist;

    if (blocklist.size > 0) {
      console.log(`🚫 Scout: Blocklist - ${Array.from(blocklist).join(', ')}`);
    } else {
      console.log('✓ Scout: No active blocklist');
    }

    return blocklist;
  }

  /**
   * Detect active providers from OpenCode configuration
   */
  private async detectActiveProviders(): Promise<ActiveProvidersResult> {
    console.log('\n🔍 Scout: Detecting active OpenCode providers...');

    const providers: string[] = [];
    const adapters = new Map<string, ProviderAdapter>();
    const errors: string[] = [];

    try {
      const configContent = await fs.readFile(this.config.opencodeConfigPath!, 'utf-8');
      const config = JSON.parse(configContent);

      // Check for configured providers
      if (config.providers) {
        providers.push(...Object.keys(config.providers));
      }

      // Also check categories for provider patterns
      if (config.categories) {
        const categoryModels = Object.values(config.categories)
          .map((cat: any) => cat.model)
          .concat(...Object.values(config.categories).map((cat: any) => cat.fallback || []))
          .map((model: string) => model.split('/')[0]);

        for (const provider of categoryModels) {
          if (!providers.includes(provider)) {
            providers.push(provider);
          }
        }
      }

      // Remove duplicates
      const uniqueProviders = [...new Set(providers)];
      console.log(`📊 Scout: Detected providers: ${uniqueProviders.join(', ')}`);

      // Create adapters for each provider
      const { createAdapter } = await import('./adapters/index.js');

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
    } catch (error) {
      const err = error as Error;
      errors.push(`Failed to read OpenCode config: ${err.message}`);
    }

    return {
      providers: uniqueProviders,
      adapters,
      errors
    };
  }

  /**
   * Fetch models from all active providers
   */
  private async fetchModelsFromProviders(
    adapters: Map<string, ProviderAdapter>
  ): Promise<Map<string, ProviderModel[]>> {
    const allModels = new Map<string, ProviderModel[]>();

    for (const [providerId, adapter] of adapters.entries()) {
      try {
        console.log(`\n📡 Scout: Fetching models from ${providerId}...`);
        const models = await adapter.fetchModels();
        allModels.set(providerId, models);
        console.log(`✓ Scout: ${providerId} - ${models.length} models fetched`);
      } catch (error) {
        const err = error as Error;
        console.error(`❌ Scout: Failed to fetch from ${providerId}: ${err.message}`);
        // Add error models as empty array to continue
        allModels.set(providerId, []);
      }
    }

    return allModels;
  }

  /**
   * PHASE B: Fetch and Normalize Models
   * From all active providers
   */
  private async fetchAllModels(): Promise<FreeModel[]> {
    const { providers, adapters, errors } = await this.detectActiveProviders();

    if (errors.length > 0) {
      console.error('\n⚠️  Scout: Errors during provider detection:');
      errors.forEach(err => console.error(`  - ${err}`));
    }

    if (adapters.size === 0) {
      console.warn('⚠️  Scout: No active providers found');
      return [];
    }

    // Fetch from all active providers
    const providerModels = await this.fetchModelsFromProviders(adapters);

    // Normalize all models to FreeModel interface
    const allModels: FreeModel[] = [];
    const { ELITE_FAMILIES } = await import('../types/index.js');

    for (const [providerId, models] of providerModels.entries()) {
      const adapter = adapters.get(providerId);

      if (!adapter) continue;

      for (const providerModel of models) {
        const freeModel = adapter.normalizeModel(providerModel);

        // Apply blocklist filter
        const isBlocked = this.blocklist.has(freeModel.provider);
        if (isBlocked) {
          continue;
        }

        // Only include if free tier
        if (!freeModel.isFree) {
          continue;
        }

        allModels.push(freeModel);
      }
    }

    console.log(`\n✓ Scout: Normalized ${allModels.length} free models from ${providerModels.size} providers`);

    return allModels;
  }

  /**
   * PHASE C: Ranking Algorithm - Sort by Benchmark Performance
   *
   * Priority order:
   * 1. Elite family membership (SOTA models)
   * 2. Release date (newer > older, when available)
   * 3. Parameter count (larger > smaller, except for speed category)
   */
  private rankModelsByBenchmark(
    models: FreeModel[],
    category: ModelCategory
  ): FreeModel[] {
    const elitePatterns = ELITE_FAMILIES[category] || [];

    return models.sort((a, b) => {
      // Priority 1: Elite family membership
      const aIsElite = elitePatterns.some((pattern: string) =>
        a.id.toLowerCase().includes(pattern.toLowerCase())
      );
      const bIsElite = elitePatterns.some((pattern: string) =>
        b.id.toLowerCase().includes(pattern.toLowerCase())
      );

      if (aIsElite && !bIsElite) return -1;
      if (!aIsElite && bIsElite) return 1;

      // Priority 2: Provider ranking (prioritize faster/free providers)
      const providerPriority: Record<string, number> = {
        'openrouter': 1,
        'groq': 2,
        'cerebras': 3,
        'deepseek': 4,
        'google': 5,
        'modelscope': 6,
        'huggingface': 7
      };

      const aPriority = providerPriority[a.provider] || 99;
      const bPriority = providerPriority[b.provider] || 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower number = higher priority
      }

      // Priority 3: Parameter count (infer from model name patterns)
      const extractParams = (id: string): number => {
        const match = id.match(/(\d+)b/i);
        return match ? parseInt(match[1]) : 0;
      };

      const aParams = extractParams(a.id);
      const bParams = extractParams(b.id);

      // For speed category, prefer smaller models
      if (category === 'speed') {
        if (aParams > 0 && bParams > 0 && aParams !== bParams) {
          return aParams - bParams; // Smaller first
        }
      } else {
        // For other categories, prefer larger models
        if (aParams > 0 && bParams > 0 && aParams !== bParams) {
          return bParams - aParams; // Larger first
        }
      }

      // Priority 4: Alphabetical as tiebreaker (newer models often have newer names)
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
  private categorizeModels(models: FreeModel[]): Record<ModelCategory, FreeModel[]> {
    const categories: Record<ModelCategory, FreeModel[]> = {
      coding: [],
      reasoning: [],
      speed: [],
      multimodal: [],
      writing: []
    };

    for (const model of models) {
      const id = model.id.toLowerCase();
      let categorized = false;

      // Check each category
      if (id.includes('coder') || id.includes('code') || id.includes('function')) {
        categories.coding.push(model);
        categorized = true;
      }

      if (id.includes('r1') || id.includes('reasoning') || id.includes('cot') || id.includes('qwq')) {
        categories.reasoning.push(model);
        categorized = true;
      }

      if (id.includes('flash') || id.includes('distill') || id.includes('nano') || id.includes('lite')) {
        categories.speed.push(model);
        categorized = true;
      }

      if (id.includes('vl') || id.includes('vision') || id.includes('molmo')) {
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
  private generateCategoryConfig(category: ModelCategory, rankedModels: FreeModel[]): CategoryConfig {
    const topModels = rankedModels.slice(0, Math.min(5, rankedModels.length));
    const modelIds = topModels.map((m) => `${m.provider}/${m.id}`);

    return {
      model: modelIds[0],
      fallback: modelIds.slice(1),
      description: `Auto-ranked by Free Fleet v0.2.0 - ${category.toUpperCase()} category`
    };
  }

  /**
   * Main discovery and ranking method
   * Returns categorized and ranked free models from ALL active providers
   */
  async discover(): Promise<Record<ModelCategory, ScoutResult>> {
    console.log('\n🤖 Free Fleet v0.2.0 - Starting omni-provider discovery...\n');

    // PHASE A: Safety Check - Build blocklist
    await this.buildBlocklist();

    // Detect active providers
    const detectionResult = await this.detectActiveProviders();

    if (detectionResult.errors.length > 0) {
      console.error('\n⚠️  Scout: Provider detection had errors, continuing...\n');
    }

    if (detectionResult.providers.length === 0) {
      console.warn('⚠️  Scout: No active providers found\n');
      throw new Error('No active providers detected. Please configure at least one provider in OpenCode.');
    }

    // PHASE B: Fetch and Normalize from all active providers
    const allModels = await this.fetchAllModels();

    console.log(`\n✓ Scout: Total free models discovered: ${allModels.length}`);

    // PHASE C + D: Categorize and Rank
    console.log('\n📊 Scout: Categorizing and ranking models...\n');
    const categorizedModels = this.categorizeModels(allModels);

    for (const [category, models] of Object.entries(categorizedModels)) {
      console.log(`  ${category}: ${models.length} models`);
    }

    const results: Record<ModelCategory, ScoutResult> = {} as any;

    for (const [category, models] of Object.entries(categorizedModels)) {
      const cat = category as ModelCategory;

      // Apply benchmark ranking
      const rankedModels = this.rankModelsByBenchmark(models, cat);

      // Identify elite models
      const { ELITE_FAMILIES } = await import('../types/index.js');
      const elitePatterns = ELITE_FAMILIES[cat] || [];
      const eliteModels = rankedModels.filter((model) =>
        elitePatterns.some((pattern: string) => model.id.toLowerCase().includes(pattern.toLowerCase()))
      );

      results[cat] = {
        category: cat,
        models,
        rankedModels,
        eliteModels
      };
    }

    return results;
  }

  /**
   * Print summary of results
   */
  printSummary(results: Record<ModelCategory, ScoutResult>): void {
    console.log('\n' + '='.repeat(60));
    console.log('📈 Free Fleet v0.2.0 Discovery Results\n');

    for (const [category, result] of Object.entries(results)) {
      console.log(`\n📈 ${category.toUpperCase()} (top ${Math.min(5, result.rankedModels.length)}):`);

      result.rankedModels.slice(0, 5).forEach((model, i) => {
        const isElite = result.eliteModels.includes(model);
        const providerTag = `[${model.provider.toUpperCase()}]`;
        console.log(`  ${i + 1}. ${providerTag}${model.id}${isElite ? ' ⭐ ELITE' : ''}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Get configuration info
   */
  getConfiguration(): {
    antigravityActive: boolean;
    allowAntigravity: boolean;
    blocklist: string[];
  } {
    return {
      antigravityActive: this.antigravityActive,
      allowAntigravity: this.config.allowAntigravity || false,
      blocklist: Array.from(this.blocklist)
    };
  }
}

/**
 * Create a new Scout instance with optional config
 */
export function createScout(config?: Partial<ScoutConfig>): Scout {
  return new Scout(config);
}
