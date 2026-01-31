/**
 * Metadata Oracle - Cross-Provider Model Metadata Lookup
 *
 * v0.3.0 - Added Live Update Mechanism (Community Source)
 */

/**
 * Remote community definitions URL
 */
const REMOTE_DEFINITIONS_URL =
  "https://raw.githubusercontent.com/phorde/opencode-free-fleet/main/resources/community-models.json";

/**
 * Interface for remote community definitions
 */
interface CommunityDefinitions {
  version: string;
  lastUpdated: string;
  models: string[];
}

/**
 * Static knowledge base of confirmed free models
 * This can be updated without code changes
 */
export const CONFIRMED_FREE_MODELS = new Set([
  // OpenRouter (verified free via pricing)
  "openrouter/qwen/qwen3-coder:free",
  "openrouter/deepseek/deepseek-v3.2",
  "openrouter/deepseek/deepseek-r1-0528:free",
  "openrouter/z-ai/glm-4.5-air:free",
  "openrouter/arcee-ai/trinity-large-preview:free",
  "openrouter/mistralai/mistral-small-3.1-24b-instruct:free",
  "openrouter/mistralai/mistral-tiny:free",
  "openrouter/nvidia/nemotron-3-nano-30b-a3b:free",
  "openrouter/nvidia/nemotron-3-nano-12b-v2-vl:free",
  "openrouter/nvidia/nemotron-3-nano-9b-v2:free",
  "openrouter/google/gemma-3n-e2b-it:free",
  "openrouter/google/gemma-3n-e4b-it:free",

  // DeepSeek (official documentation)
  "deepseek/deepseek-chat",
  "deepseek/deepseek-v3",
  "deepseek/deepseek-r1",

  // Groq (current policy)
  "groq/llama-3.1-8b-instruct",
  "groq/llama-3.1-70b-versatile-instruct",
  "groq/mixtral-8x7b-instruct",

  // Hugging Face (serverless free tier)
  "huggingface/Qwen/Qwen2.5-72B-Instruct-Turbo",

  // Google (limited free tier)
  "google/gemini-1.5-flash",
  "google/gemini-1.5-flash-8b",
]);

/**
 * External metadata APIs
 * Source for free tier verification
 */
const METADATA_SOURCES = [
  "models.dev", // Open source model metadata database
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
  pricing?: {
    prompt: string;
    completion: string;
    request: string;
  };
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
  fetchModelsMetadata(modelIds?: string[]): Promise<ModelMetadata[]>;

  /**
   * Check if this adapter is available
   */
  isAvailable(): boolean;
}

/**
 * Models.dev metadata API client
 */
class ModelsDevAdapter implements MetadataAdapter {
  readonly providerId = "models.dev";
  readonly providerName = "Models.dev";
  private cache: any[] | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour TTL

  async fetchModelsMetadata(modelIds?: string[]): Promise<ModelMetadata[]> {
    if (modelIds && modelIds.length === 0) {
      console.log(
        "📊 Models.dev: No model IDs provided, fetching all known free models",
      );
    }

    const all = await this._fetchFromModelsDev();
    return modelIds ? all.filter((m) => modelIds.includes(m.id)) : all;
  }

  async fetchModelMetadata(modelId: string): Promise<ModelMetadata> {
    const all = await this._fetchFromModelsDev();
    const model = all.find((m) => m.id === modelId);

    if (!model) {
      return {
        id: modelId,
        provider: this.providerId,
        name: modelId,
        isFree: false,
        confidence: 0,
        reason: "Model not found in Models.dev",
        pricing: { prompt: "0", completion: "0", request: "0" },
      };
    }

    // Determine if free based on Models.dev data
    const isFree =
      model.pricing?.prompt === "0" ||
      model.pricing?.prompt === "0.0" ||
      model.pricing?.completion === "0" ||
      model.pricing?.completion === "0.0";

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id,
      isFree,
      confidence: isFree ? 1.0 : 0.7,
      reason: isFree
        ? `Confirmed free via Models.dev (prompt=${model.pricing?.prompt}, completion=${model.pricing?.completion})`
        : "Uncertain pricing - SDK may differ",
      lastVerified: new Date().toISOString(),
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
    };
  }

  private async _fetchFromModelsDev(): Promise<any[]> {
    const now = Date.now();
    if (this.cache && now - this.lastCacheTime < this.CACHE_TTL) {
      console.log("📊 Models.dev: Using cached metadata");
      return this.cache;
    }

    console.log("📊 Models.dev: Fetching model metadata...");

    try {
      const response = await fetch("https://models.dev/api/v1/models", {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Models.dev API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const models = data.data || [];

      console.log(`✓ Models.dev: Found ${models.length} models`);

      this.cache = models;
      this.lastCacheTime = now;

      return models;
    } catch (error) {
      // Quietly handle API failures (likely rate limit or downtime)
      // console.error('❌ Models.dev API error:', error);
      if (this.cache) {
        console.warn("⚠️  Models.dev: API unavailable, using stale cache");
        return this.cache;
      }
      return [];
    }
  }

  isAvailable(): boolean {
    // Always available (public API)
    return true;
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
    // Fire-and-forget fetch of remote definitions
    this.fetchRemoteDefinitions().catch((err) => {
      console.warn(
        "⚠️  Oracle: Failed to fetch remote definitions:",
        err.message,
      );
    });
  }

  /**
   * Fetch remote community definitions and merge into CONFIRMED_FREE_MODELS
   */
  private async fetchRemoteDefinitions(): Promise<void> {
    try {
      console.log("🌐 Oracle: Fetching remote community definitions...");

      const response = await fetch(REMOTE_DEFINITIONS_URL, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as CommunityDefinitions;

      if (!data.models || !Array.isArray(data.models)) {
        throw new Error("Invalid format: expected models array");
      }

      // Merge models into CONFIRMED_FREE_MODELS
      let addedCount = 0;
      for (const modelId of data.models) {
        if (!CONFIRMED_FREE_MODELS.has(modelId)) {
          CONFIRMED_FREE_MODELS.add(modelId);
          addedCount++;
        }
      }

      console.log(
        `✓ Oracle: Fetched ${data.models.length} community models, added ${addedCount} new ones`,
      );
      console.log(
        `  Version: ${data.version}, Last Updated: ${data.lastUpdated}`,
      );
    } catch (error) {
      const err = error as Error;
      // Only log warnings, don't throw - this is optional enhancement
      console.warn(
        `⚠️  Oracle: Could not fetch remote definitions: ${err.message}`,
      );
      console.log("  Continuing with local CONFIRMED_FREE_MODELS set only...");
    }
  }

  /**
   * Initialize all metadata adapters
   */
  private _initializeAdapters(): void {
    console.log("🔮 Metadata Oracle: Initializing adapters...");

    // Models.dev - Always available
    this.adapters.set("models.dev", new ModelsDevAdapter());

    // Note: Removed Z.Ai SDK, Google Cloud AI SDK, etc.
    // These adapters are now implemented directly in src/core/adapters/index.ts
  }

  /**
   * Check which adapters are available
   */
  getAvailableAdapters(): string[] {
    const available: string[] = [];

    for (const [providerId, adapter] of this.adapters.entries()) {
      if (adapter.isAvailable()) {
        available.push(providerId);
      }
    }

    return available;
  }

  /**
   * Fetch metadata for a specific model from all available sources
   * This is the main method Scout should call for free tier detection
   */
  async fetchModelMetadata(
    modelId: string,
    providerId?: string,
  ): Promise<ModelMetadata> {
    console.log(`\n🔮 Metadata Oracle: Fetching metadata for ${modelId}...\n`);

    // 1. Check local/community confirmed list (Primary Source of Truth)
    // Check exact ID match
    if (CONFIRMED_FREE_MODELS.has(modelId)) {
      return this._createConfirmedMetadata(modelId, "community-list");
    }

    // Check provider-prefixed match (e.g. openrouter/vendor/model)
    if (providerId) {
      const prefixedId = `${providerId}/${modelId}`;
      if (CONFIRMED_FREE_MODELS.has(prefixedId)) {
        return this._createConfirmedMetadata(modelId, providerId);
      }

      // Special case: 'openrouter' prefix often used in community list
      if (providerId !== "openrouter") {
        const openRouterId = `openrouter/${modelId}`;
        if (CONFIRMED_FREE_MODELS.has(openRouterId)) {
          return this._createConfirmedMetadata(modelId, providerId);
        }
      }
    }

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
        console.warn(
          `⚠️  Metadata Oracle: Adapter ${providerId} failed: ${error}`,
        );
      }
    }

    if (allMetadata.length === 0) {
      return {
        id: modelId,
        provider: "unknown",
        name: modelId,
        isFree: false,
        confidence: 0,
        reason: "Model not found in any metadata source",
        pricing: { prompt: "0", completion: "0", request: "0" },
      };
    }

    // Merge results with confidence scoring
    const freeResults = allMetadata.filter((m) => m.isFree);
    const hasFreeResult = freeResults.length > 0;

    // Determine overall confidence
    let confidence = 0.3; // Low confidence if no metadata
    let reason = "No metadata found";

    if (hasFreeResult) {
      confidence = 1.0; // High confidence if at least one source says free
      reason = `Confirmed free by ${freeResults.map((m) => m.provider).join(", ")}`;
    } else if (allMetadata.length > 0) {
      confidence = 0.7; // Medium confidence if metadata exists but no free result
      reason = `Metadata found but not confirmed free (providers: ${allMetadata.map((m) => m.provider).join(", ")})`;
    }

    // Return first free result (highest confidence)
    const finalMetadata = hasFreeResult ? freeResults[0] : allMetadata[0];

    return {
      ...finalMetadata,
      confidence,
      reason,
      lastVerified: new Date().toISOString(),
    };
  }

  /**
   * Batch fetch metadata for multiple models
   */
  async fetchModelsMetadata(modelIds: string[]): Promise<ModelMetadata[]> {
    console.log(
      `\n🔮 Metadata Oracle: Fetching metadata for ${modelIds.length} models...\n`,
    );

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
   * This allows updating of static knowledge base
   */
  addConfirmedFreeModel(modelId: string): void {
    CONFIRMED_FREE_MODELS.add(modelId);
  }

  /**
   * Helper to create metadata for a confirmed free model
   */
  private _createConfirmedMetadata(
    modelId: string,
    source: string,
  ): ModelMetadata {
    return {
      id: modelId,
      provider: "community-list", // Standardized provider ID for community source
      name: modelId,
      isFree: true,
      confidence: 1.0,
      reason: `Confirmed free by Community List (via ${source})`,
      lastVerified: new Date().toISOString(),
      pricing: { prompt: "0", completion: "0", request: "0" },
    };
  }

  /**
   * Remove a model from confirmed free list
   */
  removeConfirmedFreeModel(modelId: string): void {
    CONFIRMED_FREE_MODELS.delete(modelId);
  }
}
