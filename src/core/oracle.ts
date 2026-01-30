/**
 * Metadata Oracle - Cross-Provider Model Metadata Lookup
 *
 * This module aggregates free model information from multiple sources:
 * - Official provider SDKs (when available)
 * - External metadata APIs (Models.dev)
 * - Static knowledge base (curated, updatable)
 *
 * Purpose: Accurately determine if a model is FREE TIER
 * regardless of provider-specific pricing field formats.
 */

/**
 * Static knowledge base of confirmed free models
 * This can be updated without code changes
 */
const CONFIRMED_FREE_MODELS = new Set([
  // OpenRouter (verified free via pricing)
  'openrouter/qwen/qwen3-coder:free',
  'openrouter/deepseek/deepseek-v3.2',
  'openrouter/deepseek/deepseek-r1-0528:free',
  'openrouter/z-ai/glm-4.5-air:free',
  'openrouter/arcee-ai/trinity-large-preview:free',
  'openrouter/mistralai/mistral-small-3.1-24b-instruct:free',
  'openrouter/mistralai/mistral-tiny:free',
  'openrouter/nvidia/nemotron-3-nano-30b-a3b:free',
  'openrouter/nvidia/nemotron-3-nano-12b-v2-vl:free',
  'openrouter/nvidia/nemotron-3-nano-9b-v2:free',
  'openrouter/google/gemma-3n-e2b-it:free',
  'openrouter/google/gemma-3n-e4b-it:free',

  // DeepSeek (official documentation)
  'deepseek/deepseek-chat',
  'deepseek/deepseek-v3',
  'deepseek/deepseek-r1',

  // Z.Ai (current policies)
  'zai-coding-plan/glm-4.7-flash',

  // Groq (current policy - all models free)
  'groq/llama-3.1-8b-instruct',
  'groq/llama-3.1-70b-versatile-instruct',
  'groq/mixtral-8x7b-instruct',

  // Hugging Face (serverless free tier)
  'huggingface/Qwen/Qwen2.5-72B-Instruct-Turbo',

  // Google (limited free tier)
  'google/gemini-1.5-flash',
  'google/gemini-1.5-flash-8b'
]);

/**
 * External metadata APIs
 * Source for free tier verification
 */
const METADATA_SOURCES = [
  'models.dev' // Open source model metadata database
] as const;

/**
 * Oracle result with confidence score
 */
export interface ModelMetadata {
  id: string;
  provider: string;
  name: string;
  isFree: boolean;
  confidence: number; // 0-1: uncertain, 0.5-50: likely free, 1.0: confirmed free
  reason: string;
  lastVerified?: string;
}

/**
 * Provider adapter for metadata lookup
 */
export interface MetadataAdapter {
  providerId: string;
  providerName: string;

  /**
   * Fetch metadata for a specific model
   */
  fetchModelMetadata(modelId: string): Promise<ModelMetadata>;

  /**
   * Batch fetch multiple models
   */
  fetchModelsMetadata(modelIds: string[]): Promise<ModelMetadata[]>;

  /**
   * Check if this adapter is available
   */
  isAvailable(): boolean;
}

/**
 * Models.dev metadata API client
 */
class ModelsDevAdapter implements MetadataAdapter {
  readonly providerId = 'models.dev';
  readonly providerName = 'Models.dev';

  async fetchModelsMetadata(modelIds?: string[]): Promise<ModelMetadata[]> {
    if (modelIds && modelIds.length === 0) {
      console.log('📊 Models.dev: No model IDs provided, fetching all known free models');
    }

    const all = await this._fetchFromModelsDev();
    return modelIds ? all.filter(m => modelIds.includes(m.id)) : all;
  }

  async fetchModelMetadata(modelId: string): Promise<ModelMetadata> {
    const all = await this._fetchFromModelsDev();
    const model = all.find(m => m.id === modelId);

    if (!model) {
      return {
        id: modelId,
        provider: this.providerId,
        name: modelId,
        isFree: false,
        confidence: 0,
        reason: 'Model not found in Models.dev'
      };
    }

    // Determine if free based on Models.dev data
    const isFree = model.pricing?.prompt === '0' || model.pricing?.prompt === '0.0' ||
                    model.pricing?.completion === '0' || model.pricing?.completion === '0.0';

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id,
      isFree,
      confidence: isFree ? 1.0 : 0.7,
      reason: isFree ? `Confirmed free via Models.dev (prompt=${model.pricing?.prompt}, completion=${model.pricing?.completion})` : 'Uncertain pricing - SDK may differ',
      lastVerified: new Date().toISOString()
    };
  }

  private async _fetchFromModelsDev(): Promise<any[]> {
    console.log('📊 Models.dev: Fetching model metadata...');

    try {
      const response = await fetch('https://models.dev/api/v1/models', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Models.dev API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models = data.data || [];

      console.log(`✓ Models.dev: Found ${models.length} models`);

      return models;
    } catch (error) {
      console.error('❌ Models.dev API error:', error);
      return [];
    }
  }

  isAvailable(): boolean {
    // Always available (public API)
    return true;
  }
}

/**
 * Z.Ai SDK metadata adapter
 * Note: Need to check if AI SDK is actually available
 */
class ZAiAdapter implements MetadataAdapter {
  readonly providerId = 'zai-coding-plan';
  readonly providerName = 'Z.Ai Coding Plan';

  async fetchModelsMetadata(modelIds?: string[]): Promise<ModelMetadata[]> {
    console.log('🎲 Z.Ai SDK: Checking availability...');

    // Check if Z.Ai SDK is available
    try {
      const { ZaiModel } = await import('@zai/sdk');
      const zai = new ZaiModel({ apiKey: process.env.ZAI_API_KEY });
      await zai.initialize();

      const models = await zai.listModels();
      console.log(`✓ Z.Ai SDK: Found ${models.length} models`);

      // Map to ModelMetadata
      const metadata = models.map((model: any) => {
        const modelId = model.id || model.model_name;
        const isFree = !model.pricing || model.pricing?.prompt_price === '0';

        return {
          id: modelId,
          provider: this.providerId,
          name: model.name || model.display_name || modelId,
          isFree,
          confidence: isFree ? 0.95 : 0.3,
          reason: isFree ? `Confirmed free via Z.Ai SDK (prompt_price=${model.pricing?.prompt_price})` : `Z.Ai SDK pricing: ${JSON.stringify(model.pricing)}`
        };
      });

      return modelIds ? metadata.filter(m => modelIds.includes(m.id)) : metadata;
    } catch (error) {
      console.error('❌ Z.Ai SDK error:', error);
      console.log('⚠️  Z.Ai SDK: Using fallback (assuming models not free)');
      return [];
    }
  }

  async fetchModelMetadata(modelId: string): Promise<ModelMetadata> {
    const metadata = await this.fetchModelsMetadata([modelId]);

    if (metadata.length === 0) {
      return {
        id: modelId,
        provider: this.providerId,
        name: modelId,
        isFree: false,
        confidence: 0,
        reason: 'Model not found in Z.Ai SDK'
      };
    }

    return metadata[0];
  }

  isAvailable(): boolean {
    try {
      const { ZaiModel } = await import('@zai/sdk');
      return true; // SDK is available
    } catch {
      return false;
    }
  }
}

/**
 * Google Cloud AI metadata adapter
 * For Gemini Flash/Nano (limited free tier)
 */
class GoogleCloudAIAdapter implements MetadataAdapter {
  readonly providerId = 'google';
  readonly providerName = 'Google Cloud AI';

  /**
   * Free models with known IDs
   */
  private static readonly FREE_MODELS = new Set([
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'aistudio/cht-1.5-flash',
    'aistudio/cht-1.0-flash-001',
    'aistudio/cht-1.0-flash-002'
  ]);

  async fetchModelsMetadata(modelIds?: string[]): Promise<ModelMetadata[]> {
    console.log('🔵 Google: Checking Gemini Flash/Nano availability...');

    const models: ModelMetadata[] = [];

    // Add known free models from static list
    for (const modelId of this.FREE_MODELS) {
      if (!modelIds || modelIds.includes(modelId)) {
        models.push({
          id: modelId,
          provider: this.providerId,
          name: modelId,
          isFree: true,
          confidence: 1.0,
          reason: 'Static: Known free tier (Gemini Flash/Nano)'
        });
      }
    }

    return modelIds ? models.filter(m => modelIds.includes(m.id)) : models;
  }

  async fetchModelMetadata(modelId: string): Promise<ModelMetadata> {
    const models = await this.fetchModelsMetadata([modelId]);

    if (models.length === 0) {
      return {
        id: modelId,
        provider: this.providerId,
        name: modelId,
        isFree: false,
        confidence: 0,
        reason: 'Google model not found in free tier list'
      };
    }

    return models[0];
  }

  isAvailable(): boolean {
    return true; // Assume available (Google Cloud AI APIs are generally accessible)
  }
}

/**
 * Unified metadata oracle
 * Aggregates data from multiple metadata sources
 */
export class MetadataOracle {
  private adapters: Map<string, MetadataAdapter> = new Map();

  constructor() {
    this._initializeAdapters();
  }

  /**
   * Initialize all metadata adapters
   */
  private async _initializeAdapters(): Promise<void> {
    console.log('🔮 Metadata Oracle: Initializing adapters...');

    // Models.dev - Always available
    this.adapters.set('models.dev', new ModelsDevAdapter());

    // Z.Ai SDK - Check if available
    try {
      const { ZaiModel } = await import('@zai/sdk');
      this.adapters.set('zai-coding-plan', new ZAiAdapter());
    } catch (error) {
      console.warn('⚠️  Metadata Oracle: Z.Ai SDK not available');
    }

    // Google Cloud AI - Always assume available
    this.adapters.set('google', new GoogleCloudAIAdapter());

    // Future: DeepSeek SDK, Groq SDK, etc.
  }

  /**
   * Check which adapters are available
   */
  getAvailableAdapters(): string[] {
    const available: string[] = [];

    for (const [providerId, adapter] of this.adapters.entries()) {
      if (await adapter.isAvailable()) {
        available.push(providerId);
      }
    }

    return available;
  }

  /**
   * Fetch metadata for a specific model from all available sources
   * This is the main method Scout should call for free tier detection
   */
  async fetchModelMetadata(modelId: string): Promise<ModelMetadata> {
    console.log(`\n🔮 Metadata Oracle: Fetching metadata for ${modelId}...\n`);

    const availableAdapters = this.getAvailableAdapters();
    const allMetadata: ModelMetadata[] = [];

    // Try each available adapter
    for (const providerId of availableAdapters) {
      const adapter = this.adapters.get(providerId);
      if (!adapter) continue;

      try {
        const metadata = await adapter.fetchModelMetadata(modelId);
        allMetadata.push(metadata);
      } catch (error) {
        console.warn(`⚠️  Metadata Oracle: Adapter ${providerId} failed: ${error}`);
      }
    }

    if (allMetadata.length === 0) {
      return {
        id: modelId,
        provider: 'unknown',
        name: modelId,
        isFree: false,
        confidence: 0,
        reason: 'Model not found in any metadata source'
      };
    }

    // Merge results with confidence scoring
    const freeResults = allMetadata.filter(m => m.isFree);
    const hasFreeResult = freeResults.length > 0;

    // Determine overall confidence
    let confidence = 0.3; // Low confidence if no metadata
    let reason = 'No metadata found';

    if (hasFreeResult) {
      confidence = 1.0; // High confidence if at least one source says free
      reason = `Confirmed free by ${freeResults.map(m => m.provider).join(', ')}`;
    } else if (allMetadata.length > 0) {
      confidence = 0.7; // Medium confidence if metadata exists but no free result
      reason = `Metadata found but not confirmed free (providers: ${allMetadata.map(m => m.provider).join(', ')})`;
    }

    // Return the first free result (highest confidence)
    const finalMetadata = hasFreeResult ? freeResults[0] : allMetadata[0];

    return {
      ...finalMetadata,
      confidence,
      reason,
      lastVerified: new Date().toISOString()
    };
  }

  /**
   * Batch fetch metadata for multiple models
   */
  async fetchModelsMetadata(modelIds: string[]): Promise<ModelMetadata[]> {
    console.log(`\n🔮 Metadata Oracle: Fetching metadata for ${modelIds.length} models...\n`);

    const availableAdapters = this.getAvailableAdapters();
    const allMetadata: ModelMetadata[] = [];

    for (const modelId of modelIds) {
      const metadata = await this.fetchModelMetadata(modelId);
      allMetadata.push(metadata);
    }

    return allMetadata;
  }

  /**
   * Get list of all confirmed free models
   */
  getConfirmedFreeModels(): Set<string> {
    return CONFIRMED_FREE_MODELS;
  }

  /**
   * Add a manually confirmed free model
   * This allows updating the static knowledge base
   */
  addConfirmedFreeModel(modelId: string): void {
    CONFIRMED_FREE_MODELS.add(modelId);
  }

  /**
   * Remove a model from confirmed free list
   */
  removeConfirmedFreeModel(modelId: string): void {
    CONFIRMED_FREE_MODELS.delete(modelId);
  }
}
