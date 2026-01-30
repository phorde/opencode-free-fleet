/**
 * The Scout - Automatic Free Model Discovery & Benchmark-Based Ranking
 *
 * This module discovers free LLM models from OpenRouter, ranks them by SOTA
 * benchmark performance, and provides optimized configuration for economic load balancing.
 *
 * Philosophy: Quality > Quantity - Only models with proven benchmark performance
 * are included in Elite tier.
 */

import type {
  OpenRouterModel,
  ScoutConfig,
  ScoutResult,
  ModelCategory,
  AntigravityAccounts,
  CategoryConfig
} from '../types/index.js';

/**
 * Default scout configuration
 */
const DEFAULT_CONFIG: ScoutConfig = {
  antigravityPath: `${process.env.HOME || ''}/.config/opencode/antigravity-accounts.json`,
  opencodeConfigPath: `${process.env.HOME || ''}/.config/opencode/oh-my-opencode.json`
};

/**
 * Scout class for model discovery and ranking
 */
export class Scout {
  private config: ScoutConfig;
  private blocklist: Set<string> = new Set();

  constructor(config: Partial<ScoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * PHASE A: Safety Check - Build blocklist of paid/authenticated models
   * This ensures we NEVER route free-only tasks to paid models accidentally.
   */
  private async buildBlocklist(): Promise<Set<string>> {
    const blocklist = new Set<string>();

    // Check antigravity-auth for Google/Gemini models
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.config.antigravityPath!, 'utf-8');
      const antigravity: AntigravityAccounts = JSON.parse(content);

      if (antigravity.accounts && antigravity.accounts.length > 0) {
        console.log(`⚠️  Scout: Found ${antigravity.accounts.length} Google/Gemini authenticated accounts`);
        // Block all Google models to ensure we stay on free tier
        blocklist.add('google');
        blocklist.add('gemini');
      }
    } catch (error) {
      console.log(`ℹ️  Scout: Could not read antigravity-auth config (may not be configured)`);
    }

    this.blocklist = blocklist;

    if (blocklist.size > 0) {
      console.log(`🚫 Scout: Blocklist - ${Array.from(blocklist).join(', ')}`);
    }

    return blocklist;
  }

  /**
   * PHASE B: Collect and Filter Free Models from OpenRouter API
   * Fetches all models, filters for truly free ones (pricing.prompt === "0"),
   * and removes any blocked providers.
   */
  private async fetchFreeModels(): Promise<OpenRouterModel[]> {
    console.log('🔍 Scout: Fetching free models from OpenRouter API...');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models: OpenRouterModel[] = data.data || [];

      console.log(`📊 Scout: Total models fetched: ${models.length}`);

      // Filter for truly free models (prompt AND completion = "0")
      const freeModels = models.filter(model => {
        const isFreePrompt = model.pricing.prompt === '0' || model.pricing.prompt === '0.0';
        const isFreeCompletion = model.pricing.completion === '0' || model.pricing.completion === '0.0';
        return isFreePrompt && isFreeCompletion;
      });

      console.log(`✓ Scout: Free models found: ${freeModels.length}`);

      return freeModels;
    } catch (error) {
      console.error(`❌ Scout: Failed to fetch models: ${error}`);
      throw error;
    }
  }

  /**
   * Filter out blocked providers from free models
   */
  private filterBlockedModels(models: OpenRouterModel[]): OpenRouterModel[] {
    return models.filter(model => {
      const modelId = model.id.toLowerCase();

      // Check if any blocked provider prefix is in the model ID
      for (const blocked of this.blocklist) {
        if (modelId.startsWith(blocked.toLowerCase()) || modelId.includes(blocked.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
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
    models: OpenRouterModel[],
    category: ModelCategory
  ): OpenRouterModel[] {
    // Import ELITE_FAMILIES from types
    const ELITE_FAMILIES = {
      coding: [
        'qwen-2.5-coder',
        'qwen3-coder',
        'deepseek-coder',
        'deepseek-v3',
        'llama-3.3-70b',
        'llama-3.3',
        'codestral',
        'starcoder'
      ],
      reasoning: [
        'deepseek-r1',
        'deepseek-reasoner',
        'qwq',
        'qwq-32b',
        'o1-open',
        'o3-mini',
        'reasoning',
        'r1'
      ],
      speed: [
        'mistral-small',
        'haiku',
        'flash',
        'gemma-2',
        'gemma-3',
        'distill',
        'nano',
        'lite'
      ],
      multimodal: [
        'vl',
        'vision',
        'molmo',
        'nemotron-vl',
        'pixtral',
        'qwen-vl'
      ],
      writing: [
        'trinity',
        'qwen-next',
        'chimera',
        'writer'
      ]
    } as const;

    const elitePatterns = ELITE_FAMILIES[category] || [];

    return models.sort((a, b) => {
      // Priority 1: Elite family membership
      const aIsElite = elitePatterns.some(pattern =>
        a.id.toLowerCase().includes(pattern.toLowerCase())
      );
      const bIsElite = elitePatterns.some(pattern =>
        b.id.toLowerCase().includes(pattern.toLowerCase())
      );

      if (aIsElite && !bIsElite) return -1;
      if (!aIsElite && bIsElite) return 1;

      // Priority 2: Parameter count (infer from model name patterns)
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

      // Priority 3: Alphabetical as tiebreaker (newer models often have newer names)
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
  private categorizeModels(models: OpenRouterModel[]): Record<ModelCategory, OpenRouterModel[]> {
    const categories: Record<ModelCategory, OpenRouterModel[]> = {
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
  private generateCategoryConfig(category: ModelCategory, rankedModels: OpenRouterModel[]): CategoryConfig {
    const topModels = rankedModels.slice(0, Math.min(5, rankedModels.length));

    const modelIds = topModels.map(m => `openrouter/${m.id}`);

    return {
      model: modelIds[0],
      fallback: modelIds.slice(1),
      description: `Auto-ranked by Free Scout - ${category.toUpperCase()} category`
    };
  }

  /**
   * Main discovery and ranking method
   * Returns categorized and ranked free models
   */
  async discover(): Promise<Record<ModelCategory, ScoutResult>> {
    console.log('\n🤖 Free Scout - Starting model discovery...\n');

    // PHASE A: Safety Check
    await this.buildBlocklist();

    // PHASE B: Fetch and Filter
    const allFreeModels = await this.fetchFreeModels();
    const filteredModels = this.filterBlockedModels(allFreeModels);
    console.log(`✓ Scout: After blocklist filter: ${filteredModels.length} models\n`);

    // PHASE C + D: Categorize and Rank
    console.log('📊 Scout: Categorizing and ranking models...\n');
    const categorizedModels = this.categorizeModels(filteredModels);

    for (const [category, models] of Object.entries(categorizedModels)) {
      console.log(`  ${category}: ${models.length} models`);
    }

    const results: Record<ModelCategory, ScoutResult> = {} as any;

    for (const [category, models] of Object.entries(categorizedModels)) {
      const cat = category as ModelCategory;

      // Apply benchmark ranking
      const rankedModels = this.rankModelsByBenchmark(models, cat);

      // Identify elite models
      const elitePatterns = this.getElitePatterns(cat);
      const eliteModels = rankedModels.filter(model =>
        elitePatterns.some(pattern => model.id.toLowerCase().includes(pattern.toLowerCase()))
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
   * Get elite patterns for a category
   */
  private getElitePatterns(category: ModelCategory): string[] {
    const ELITE_FAMILIES = {
      coding: [
        'qwen-2.5-coder',
        'qwen3-coder',
        'deepseek-coder',
        'deepseek-v3',
        'llama-3.3-70b',
        'llama-3.3',
        'codestral',
        'starcoder'
      ],
      reasoning: [
        'deepseek-r1',
        'deepseek-reasoner',
        'qwq',
        'qwq-32b',
        'o1-open',
        'o3-mini',
        'reasoning',
        'r1'
      ],
      speed: [
        'mistral-small',
        'haiku',
        'flash',
        'gemma-2',
        'gemma-3',
        'distill',
        'nano',
        'lite'
      ],
      multimodal: [
        'vl',
        'vision',
        'molmo',
        'nemotron-vl',
        'pixtral',
        'qwen-vl'
      ],
      writing: [
        'trinity',
        'qwen-next',
        'chimera',
        'writer'
      ]
    } as const;

    return ELITE_FAMILIES[category] || [];
  }

  /**
   * Print summary of results
   */
  printSummary(results: Record<ModelCategory, ScoutResult>): void {
    console.log('\n' + '='.repeat(60));
    console.log('📈 Free Scout Discovery Results\n');

    for (const [category, result] of Object.entries(results)) {
      console.log(`\n📈 ${category.toUpperCase()} (top ${Math.min(5, result.rankedModels.length)}):`);

      result.rankedModels.slice(0, 5).forEach((model, i) => {
        const isElite = result.eliteModels.includes(model);
        console.log(`  ${i + 1}. ${model.id}${isElite ? ' ⭐ ELITE' : ''}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

/**
 * Create a new Scout instance with optional config
 */
export function createScout(config?: Partial<ScoutConfig>): Scout {
  return new Scout(config);
}
