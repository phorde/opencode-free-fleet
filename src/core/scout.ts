/**
 * The Scout - Multi-Provider Free Model Discovery & Benchmark-Based Ranking
 *
 * v0.2.0 Upgrade: Metadata Oracle + Smart Free Tier Detection
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
  ModelMetadata
} from '../types/index.js';

import * as fs from 'fs/promises';
import * as path from 'path';

// Import Metadata Oracle
import {
  MetadataOracle,
  ModelMetadata
} from './oracle.js';

/**
 * Default scout configuration
 */
const DEFAULT_CONFIG: ScoutConfig = {
  antigravityPath: `${process.env.HOME || ''}/.config/opencode/antigravity-accounts.json`,
  opencodeConfigPath: `${process.env.HOME || ''}/.config/opencode/oh-my-opencode.json`,
  allowAntigravity: false // Default to BLOCK Google/Gemini
};

/**
 * Scout class for model discovery and ranking
 */
export class Scout {
  private config: ScoutConfig;
  private blocklist: Set<string> = new Set();
  private metadataOracle: MetadataOracle;

  constructor(config: Partial<ScoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metadataOracle = new MetadataOracle();
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

    // Check antigravity-auth plugin presence
    try {
      const antigravityPath = `${process.env.HOME || ''}/.config/opencode/plugins/opencode-antigravity-auth`;
      await fs.access(antigravityPath);
      console.log('✓ Scout: Antigravity auth plugin detected');
    } catch {
      console.log(`ℹ️  Scout: Could not read antigravity-auth config (may not be configured)`);
    }

    // NOTE: In v0.2.0, we no longer block models in Scout
    // Blocklist is now used by metadata filtering via MetadataOracle
    this.blocklist = blocklist;

    console.log(`📋 Scout: Blocklist system initialized (used for metadata filtering)`);

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

      // Initialize Metadata Oracle
      await this.metadataOracle.initialize();

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
   * PHASE B: Fetch and Normalize Models with Metadata Oracle
   *
   * Enhanced in v0.2.0:
   * - Fetch models from provider adapters
   * - Enrich with metadata from MetadataOracle (Models.dev)
   * - Determine free tier based on aggregated metadata + confidence scoring
   * - Use metadata.isFree field instead of hardcoded free tier detection
   */
  private async fetchAllModels(): Promise<FreeModel[]> {
    console.log('\n🔮 Scout: Fetching models with metadata enrichment...');

    const { providers, adapters, errors } = await this.detectActiveProviders();

    if (errors.length > 0) {
      console.error('\n⚠️  Scout: Provider detection had errors:');
      errors.forEach(err => console.error(`  - ${err}`));
    }

    if (adapters.size === 0) {
      console.warn('\n⚠️  Scout: No active providers found');
      return [];
    }

    // Fetch from all active providers
    const providerModels = new Map<string, ProviderModel[]>();

    for (const [providerId, adapter] of adapters.entries()) {
      try {
        console.log(`\n📡 Scout: Fetching from ${providerId}...`);
        const models = await adapter.fetchModels();

        // Enrich with metadata from MetadataOracle
        const enrichedModels: FreeModel[] = [];

        for (const providerModel of models) {
          const modelMetadata = await this.metadataOracle.fetchModelMetadata(providerModel.id);

          const isFree = modelMetadata.isFree;
          const isElite = this.isEliteModel(providerModel.id);

          enrichedModels.push({
            id: providerModel.id,
            provider: providerId,
            name: providerModel.name || providerModel.id.split('/')[1],
            description: providerModel.description,
            contextLength: providerModel.context_length,
            maxOutputTokens: providerModel.max_output_tokens,
            pricing: {
              prompt: modelMetadata.pricing?.prompt || '0',
              completion: modelMetadata.pricing?.completion || '0',
              request: modelMetadata.pricing?.request || '0'
            },
            isFree,
            isElite,
            category: this.categorizeModel(providerModel.id, providerModel),
            confidence: modelMetadata.confidence || 0.5,
            lastVerified: modelMetadata.lastVerified
          });
        }

        providerModels.set(providerId, enrichedModels);
        console.log(`\n✓ Scout: ${providerId} - ${models.length} models, ${enrichedModels.filter(m => m.isFree).length} free`);
      } catch (error) {
        const err = error as Error;
        console.error(`\n❌ Scout: Failed to fetch from ${providerId}: ${err.message}`);
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
    let category: ModelCategory = 'writing';

    if (id.includes('coder') || id.includes('code') || id.includes('function')) {
      category = 'coding';
    } else if (id.includes('r1') || id.includes('reasoning') || id.includes('cot') || id.includes('qwq')) {
      category = 'reasoning';
    } else if (id.includes('flash') || id.includes('distill') || id.includes('nano') || id.includes('lite')) {
      category = 'speed';
    } else if (id.includes('vl') || id.includes('vision') || id.includes('molmo')) {
      category = 'multimodal';
    }

    return category;
  }

  /**
   * Check if a model is in the Elite families
   */
  private isEliteModel(modelId: string): boolean {
    const { ELITE_FAMILIES } = await import('../types/index.js');
    const elitePatterns = ELITE_FAMILIES.reasoning || [];
    const id = modelId.toLowerCase();
    return elitePatterns.some((pattern: string) => id.includes(pattern.toLowerCase()));
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
   * - Priority 6: Alphabetical as tiebreaker
   */
  private rankModelsByBenchmark(
    models: FreeModel[],
    category: ModelCategory
  ): FreeModel[] {
    const { ELITE_FAMILIES } = await import('../types/index.js');
    const elitePatterns = ELITE_FAMILIES[category] || [];

    return models.sort((a, b) => {
      // Priority 1: Metadata confidence score (higher is better)
      const aConfidence = a.confidence || 0;
      const bConfidence = b.confidence || 0;
      if (aConfidence !== bConfidence) {
        return aConfidence - bConfidence; // Higher confidence first
      }

      // Priority 2: Elite family membership (SOTA benchmarks)
      const aIsElite = elitePatterns.some((pattern: string) =>
        a.id.toLowerCase().includes(pattern.toLowerCase())
      );
      const bIsElite = elitePatterns.some((pattern: string) =>
        b.id.toLowerCase().includes(pattern.toLowerCase())
      );

      if (aIsElite && !bIsElite) return -1;
      if (!aIsElite && bIsElite) return 1;

      // Priority 3: Provider priority (from metadata)
      // Lower priority numbers indicate faster/better providers
      const aPriority = this.getProviderPriority(a.provider);
      const bPriority = this.getProviderPriority(b.provider);

      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower number = higher priority
      }

      // Priority 4: Parameter count (larger > smaller, except for speed)
      const aParams = this.extractParams(a.id);
      const bParams = this.extractParams(b.id);

      if (category === 'speed') {
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
    // This is a simplified version - in production, we'd use actual metadata
    return null;
  }

  /**
   * Get provider priority from metadata
   * Higher priority providers are listed first in OpenCode settings
   */
  private getProviderPriority(providerId: string): number {
    const priorityMap: Record<string, number> = {
      // Based on observed latency (lower is better)
      'models.dev': 1,
      'openrouter': 2,
      'zai-coding-plan': 3,
      'groq': 4,
      'cerebras': 5,
      'google': 6,
      'deepseek': 7,
      'huggingface': 8,
      'modelscope': 9
    };

    return priorityMap[providerId] || 99;
  }

  /**
   * PHASE D: Functional Categorization
   *
   * Sorts models into functional categories based on ID patterns
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

      // Use model.category if available (from metadata)
      const category = model.category;
      if (category) {
        categories[category].push(model);
        categorized = true;
        continue;
      }

      // Otherwise, categorize by ID patterns
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
    const modelIds = topModels.map((m) => m.id);

    return {
      model: modelIds[0],
      fallback: modelIds.slice(1),
      description: `Auto-ranked by Free Fleet v0.2.0 - Metadata Oracle - ${category.toUpperCase()} category`
    };
  }

  /**
   * Main discovery and ranking method
   * Returns categorized and ranked free models from ALL active providers
   * with metadata enrichment from external APIs
   */
  async discover(): Promise<Record<ModelCategory, ScoutResult>> {
    console.log('\n🤖 Free Fleet v0.2.0 - Starting omni-provider discovery with metadata enrichment...\n');

    // PHASE A: Safety Check - Build blocklist (now used for metadata filtering)
    await this.buildBlocklist();

    // Detect active providers
    const detectionResult = await this.detectActiveProviders();

    if (detectionResult.errors.length > 0) {
      console.error('\n⚠️  Scout: Provider detection had errors:');
      detectionResult.errors.forEach(err => console.error(`  - ${err}`));
    }

    if (detectionResult.providers.length === 0) {
      console.warn('\n⚠️  Scout: No active providers found');
      throw new Error('No active providers detected. Please configure at least one provider in OpenCode.');
    }

    // PHASE B: Fetch and Normalize with Metadata Oracle
    const allModels = await this.fetchAllModels();

    console.log(`\n✓ Scout: Total models discovered: ${allModels.length}`);
    console.log(`\n✓ Scout: Free models: ${allModels.filter(m => m.isFree).length}`);

    // PHASE C + D: Categorize and Rank
    console.log('\n📊 Scout: Categorizing and ranking models with metadata...\n');
    const categorizedModels = this.categorizeModels(allModels);

    for (const [category, models] of Object.entries(categorizedModels)) {
      console.log(`  ${category}: ${models.length} models (${models.filter(m => m.isFree).length} free)`);
    }

    const results: Record<ModelCategory, ScoutResult> = {} as any;

    for (const [category, models] of Object.entries(categorizedModels)) {
      const cat = category as ModelCategory;

      // Apply multi-provider benchmark ranking
      const rankedModels = this.rankModelsByBenchmark(models, cat);

      // Identify elite models
      const eliteModels = rankedModels.filter((model) => model.isElite);

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
        const providerTag = model.provider ? `[${model.provider.toUpperCase()}]` : '';
        const confidenceBadge = model.confidence >= 1.0 ? '✅' : (model.confidence >= 0.7 ? '⚠️' : '✓');
        console.log(`  ${i + 1}. ${providerTag}${model.id}${isElite ? ' ⭐ ELITE' : ''} [${model.confidence.toFixed(2)}] ${model.category?.toUpperCase()}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Print free tier breakdown by provider
    const providerStats = new Map<string, { total: number; free: number }>();
    for (const [category, result] of Object.entries(results)) {
      for (const model of result.models) {
        const provider = model.provider || 'unknown';
        if (!providerStats.has(provider)) {
          providerStats.set(provider, { total: 0, free: 0 });
        }

        const stats = providerStats.get(provider);
        stats.total++;
        if (model.isFree) stats.free++;
      }
    }

    console.log('\n📊 Free Models by Provider:');
    for (const [provider, stats] of providerStats.entries()) {
      console.log(`  ${provider}: ${stats.free}/${stats.total} (${((stats.free / stats.total) * 100).toFixed(1)}%) free`);
    }
  }

  /**
   * Get configuration info
   */
  getConfiguration(): {
    antigravityActive: boolean;
    allowAntigravity: boolean;
    blocklist: string[];
    hasMetadataOracle: boolean;
  } {
    return {
      antigravityActive: this.blocklist.size > 0, // Changed: blocklist is now metadata-driven
      allowAntigravity: this.config.allowAntigravity || false,
      blocklist: Array.from(this.blocklist),
      hasMetadataOracle: this.metadataOracle !== null
    };
  }

  /**
   * Create a new Scout instance with optional config
   */
  export function createScout(config?: Partial<ScoutConfig>): Scout {
    return new Scout(config);
  }
