/**
 * Provider Adapters for OpenCode Free Fleet v0.2.0
 *
 * Each adapter knows how to fetch models and identify free tier models
 * for a specific provider.
 *
 * v0.2.1 - Build Repair: Removed dynamic imports
 */

import {
  ProviderAdapter,
  ProviderModel,
  FreeModel,
  ELITE_FAMILIES,
  ModelCategory,
  ProviderConfig,
} from "../../types/index.js";
import { CircuitBreaker } from "../circuit-breaker.js";

/**
 * Resilient Adapter Wrapper
 * Adds circuit breaker protection to any provider adapter
 */
class ResilientAdapter implements ProviderAdapter {
  private circuitBreaker: CircuitBreaker;

  constructor(private adapter: ProviderAdapter) {
    // 3 failures, 30s reset timeout (default)
    this.circuitBreaker = new CircuitBreaker();
  }

  get providerId(): string {
    return this.adapter.providerId;
  }

  get providerName(): string {
    return this.adapter.providerName;
  }

  async fetchModels(): Promise<ProviderModel[]> {
    return this.circuitBreaker.execute(() => this.adapter.fetchModels());
  }

  isFreeModel(model: ProviderModel): boolean {
    return this.adapter.isFreeModel(model);
  }

  normalizeModel(model: ProviderModel): FreeModel {
    return this.adapter.normalizeModel(model);
  }
}

/**
 * OpenRouter Adapter
 * All models with pricing.prompt === "0" AND pricing.completion === "0" are free
 */
class OpenRouterAdapter implements ProviderAdapter {
  readonly providerId = "openrouter";
  readonly providerName = "OpenRouter";

  async fetchModels(): Promise<ProviderModel[]> {
    console.log("🔗 OpenRouter: Fetching models...");

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const models = data.data || [];

    console.log(`✓ OpenRouter: Found ${models.length} models`);

    return models.map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      context_length: model.context_length,
      architecture: model.architecture,
      pricing: model.pricing,
      top_provider: model.top_provider,
    }));
  }

  isFreeModel(model: ProviderModel): boolean {
    // OpenRouter: Free if both prompt and completion are "0"
    const isFreePrompt =
      model.pricing?.prompt === "0" || model.pricing?.prompt === "0.0";
    const isFreeCompletion =
      model.pricing?.completion === "0" || model.pricing?.completion === "0.0";
    return isFreePrompt && isFreeCompletion;
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    // Determine category
    const id = model.id.toLowerCase();
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
      id.includes("lite") ||
      id.includes("small")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    // Determine if elite
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split("/")[1],
      description: model.description,
      contextLength: model.context_length,
      maxOutputTokens:
        model.max_output_tokens || model.architecture?.["context_length"],
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
      isFree,
      isElite,
      category,
      confidence: isFree ? 1.0 : 0.5,
      tier: isFree ? "CONFIRMED_FREE" : "UNKNOWN",
    };
  }
}

/**
 * Groq Adapter
 * Currently (as of 2026), most Groq models are free
 */
class GroqAdapter implements ProviderAdapter {
  readonly providerId = "groq";
  readonly providerName = "Groq";

  async fetchModels(): Promise<ProviderModel[]> {
    console.log("🚀 Groq: Fetching models...");

    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `Groq API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const models = data.data || [];

    console.log(`✓ Groq: Found ${models.length} models`);

    return models.map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      context_length: model.context_length,
      pricing: model.pricing || {},
      top_provider: null,
    }));
  }

  isFreeModel(model: ProviderModel): boolean {
    // Groq: Assume all models are free (current policy)
    return true;
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    // Determine category
    const id = model.id.toLowerCase();
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
      id.includes("lite") ||
      id.includes("small")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    // Determine if elite
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split("/")[1],
      description: model.description,
      contextLength: model.context_length,
      maxOutputTokens:
        model.max_output_tokens || model.architecture?.["context_length"],
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
      isFree,
      isElite,
      category,
      confidence: isFree ? 1.0 : 0.5,
      tier: isFree ? "CONFIRMED_FREE" : "UNKNOWN",
    };
  }
}

/**
 * Cerebras Adapter
 * All models are currently free
 */
class CerebrasAdapter implements ProviderAdapter {
  readonly providerId = "cerebras";
  readonly providerName = "Cerebras";

  async fetchModels(): Promise<ProviderModel[]> {
    console.log("⚡ Cerebras: Fetching models...");

    const response = await fetch("https://api.cerebras.ai/v1/models", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `Cerebras API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const models = data.models || [];

    console.log(`✓ Cerebras: Found ${models.length} models`);

    return models.map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      context_length: model.context_length || model.context_window,
      pricing: model.pricing || {},
      top_provider: null,
    }));
  }

  isFreeModel(model: ProviderModel): boolean {
    // Cerebras: Assume all models are free (current policy)
    return true;
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    // Determine category
    const id = model.id.toLowerCase();
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
      id.includes("lite") ||
      id.includes("small")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    // Determine if elite
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split("/")[1],
      description: model.description,
      contextLength: model.context_length || model.context_window,
      maxOutputTokens:
        model.max_output_tokens || model.architecture?.["context_length"],
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
      isFree,
      isElite,
      category,
      confidence: isFree ? 1.0 : 0.5,
      tier: isFree ? "CONFIRMED_FREE" : "UNKNOWN",
    };
  }
}

/**
 * Google Adapter
 * Free models are limited (Gemini Flash, Nano)
 */
class GoogleAdapter implements ProviderAdapter {
  readonly providerId = "google";
  readonly providerName = "Google";

  async fetchModels(): Promise<ProviderModel[]> {
    console.log("🔵 Google: Fetching models...");

    // Note: This requires OAuth flow
    // For now, return a placeholder list
    const freeModels = [
      {
        id: "gemini-1.5-flash",
        name: "Gemini 1.5 Flash",
        description: "Fast, lightweight multimodal model (Free Tier)",
        context_length: 28000,
        pricing: { prompt: "0", completion: "0", request: "0" },
      },
      {
        id: "gemini-1.5-flash-8b",
        name: "Gemini 1.5 Flash-8B",
        description: "Even smaller and faster (Free Tier)",
        context_length: 1000000,
        pricing: { prompt: "0", completion: "0", request: "0" },
      },
    ];

    console.log(`✓ Google: Found ${freeModels.length} free models (cached)`);

    return freeModels;
  }

  isFreeModel(model: ProviderModel): boolean {
    // Google: Check if explicitly marked as free (pricing === "0")
    const isFreePrompt =
      model.pricing?.prompt === "0" || model.pricing?.prompt === "0.0";
    const isFreeCompletion =
      model.pricing?.completion === "0" || model.pricing?.completion === "0.0";
    return isFreePrompt && isFreeCompletion;
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    // Determine category
    const id = model.id.toLowerCase();
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
      id.includes("lite") ||
      id.includes("small")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    // Determine if elite
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split("/")[1],
      description: model.description,
      contextLength: model.context_length,
      maxOutputTokens:
        model.max_output_tokens || model.architecture?.["context_length"],
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
      isFree,
      isElite,
      category,
      confidence: isFree ? 1.0 : 0.5,
      tier: isFree ? "CONFIRMED_FREE" : "UNKNOWN",
    };
  }
}

/**
 * DeepSeek Adapter
 * DeepSeek-V3.2 has 5M free tokens
 */
class DeepSeekAdapter implements ProviderAdapter {
  readonly providerId = "deepseek";
  readonly providerName = "DeepSeek";

  async fetchModels(): Promise<ProviderModel[]> {
    console.log("🟣 DeepSeek: Fetching models...");

    const response = await fetch("https://api.deepseek.com/v1/models", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(
        `DeepSeek API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const models = data.data || [];

    console.log(`✓ DeepSeek: Found ${models.length} models`);

    return models.map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      context_length: model.context_length || model.max_context_tokens,
      architecture: {
        modality: model.modality,
        tokenizer: model.tokenizer || "unknown",
      },
      pricing: model.pricing || {},
      top_provider: null,
    }));
  }

  isFreeModel(model: ProviderModel): boolean {
    // DeepSeek: Check if marked as free or known free model
    const knownFreeModels = [
      "deepseek-chat",
      "deepseek-coder",
      "deepseek-v3",
      "deepseek-r1",
    ];
    const modelId = model.id.toLowerCase();
    return knownFreeModels.some((freeModel) => modelId.includes(freeModel));
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    // Determine category
    const id = model.id.toLowerCase();
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
      id.includes("lite") ||
      id.includes("small")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    // Determine if elite
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split("/")[1],
      description: model.description,
      contextLength: model.context_length || model.max_context_tokens,
      maxOutputTokens:
        model.max_output_tokens || model.architecture?.["context_length"],
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
      isFree,
      isElite,
      category,
      confidence: isFree ? 1.0 : 0.5,
      tier: isFree ? "CONFIRMED_FREE" : "UNKNOWN",
    };
  }
}

/**
 * ModelScope Adapter
 * Some free serverless inference models
 */
class ModelScopeAdapter implements ProviderAdapter {
  readonly providerId = "modelscope";
  readonly providerName = "ModelScope";

  async fetchModels(): Promise<ProviderModel[]> {
    console.log("🔬 ModelScope: Fetching free serverless models...");

    // Note: This requires authentication
    // For now, return a placeholder list
    const freeModels = [
      {
        id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        name: "Meta Llama 3.1 70B",
        description: "Llama 3.1 with 128K context (Serverless Free)",
        context_length: 128000,
        pricing: { prompt: "0", completion: "0", request: "0" },
      },
    ];

    console.log(
      `✓ ModelScope: Found ${freeModels.length} free models (cached)`,
    );

    return freeModels;
  }

  isFreeModel(model: ProviderModel): boolean {
    // ModelScope: Check if marked as serverless free
    return model.serverless_free === true || model.pricing?.prompt === "0";
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    // Determine category
    const id = model.id.toLowerCase();
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
      id.includes("lite") ||
      id.includes("small")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    // Determine if elite
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split("/")[1],
      description: model.description,
      contextLength: model.context_length,
      maxOutputTokens:
        model.max_output_tokens || model.architecture?.["context_length"],
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
      isFree,
      isElite,
      category,
      confidence: isFree ? 1.0 : 0.5,
      tier: isFree ? "CONFIRMED_FREE" : "UNKNOWN",
    };
  }
}

/**
 * Hugging Face Adapter
 * Some free serverless inference models
 */
class HuggingFaceAdapter implements ProviderAdapter {
  readonly providerId = "huggingface";
  readonly providerName = "Hugging Face";

  async fetchModels(): Promise<ProviderModel[]> {
    console.log("🤗 Hugging Face: Fetching free serverless models...");

    // Note: This requires complex filtering
    // For now, return a placeholder list
    const freeModels = [
      {
        id: "Qwen/Qwen2.5-72B-Instruct-Turbo",
        name: "Qwen 2.5 72B",
        description: "Qwen 2.5 with 128K context (Serverless Free)",
        context_length: 128000,
        pricing: { prompt: "0", completion: "0", request: "0" },
      },
    ];

    console.log(
      `✓ Hugging Face: Found ${freeModels.length} free models (cached)`,
    );

    return freeModels;
  }

  isFreeModel(model: ProviderModel): boolean {
    // Hugging Face: Check if marked as serverless free
    return model.serverless_free === true || model.pricing?.prompt === "0";
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    // Determine category
    const id = model.id.toLowerCase();
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
      id.includes("lite") ||
      id.includes("small")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    // Determine if elite
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split("/")[1],
      description: model.description,
      contextLength: model.context_length,
      maxOutputTokens:
        model.max_output_tokens || model.architecture?.["context_length"],
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
      isFree,
      isElite,
      category,
      confidence: isFree ? 1.0 : 0.5,
      tier: isFree ? "CONFIRMED_FREE" : "UNKNOWN",
    };
  }
}

/**
 * Base Adapter implementation
 */
class BaseAdapter implements ProviderAdapter {
  constructor(
    readonly providerId: string,
    readonly providerName: string,
  ) {}

  async fetchModels(): Promise<ProviderModel[]> {
    return [];
  }

  isFreeModel(model: ProviderModel): boolean {
    return false;
  }

  normalizeModel(model: ProviderModel): FreeModel {
    return {
      id: model.id,
      provider: this.providerId,
      name: model.name,
      pricing: { prompt: "0", completion: "0", request: "0" },
      isFree: false,
      isElite: false,
      category: "writing",
      confidence: 0,
      tier: "UNKNOWN",
    };
  }
}

/**
 * Generic Adapter (OpenAI Compatible)
 * Supports any provider that follows OpenAI API standards
 */
class GenericAdapter implements ProviderAdapter {
  constructor(
    readonly providerId: string,
    readonly providerName: string,
    private config: ProviderConfig,
  ) {}

  async fetchModels(): Promise<ProviderModel[]> {
    console.log(
      `🌐 ${this.providerName}: Fetching models (Generic Adapter)...`,
    );

    // Default to standard OpenAI endpoint structure if no baseUrl
    let baseUrl = this.config.baseUrl;
    if (!baseUrl) {
      baseUrl = `https://api.${this.providerId}.com/v1`;
      console.log(
        `ℹ️  No baseUrl provided for ${this.providerId}, guessing: ${baseUrl}`,
      );
    }

    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, "");
    const url = `${baseUrl}/models`;

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (this.config.apiKey) {
        headers["Authorization"] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Handle different response shapes (OpenAI vs others)
      const models = data.data || data.models || [];

      console.log(`✓ ${this.providerName}: Found ${models.length} models`);

      return models.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description,
        context_length: model.context_length || model.context_window || 4096,
        pricing: model.pricing || {},
        top_provider: null,
      }));
    } catch (error) {
      console.error(`❌ ${this.providerName} (Generic) failed:`, error);
      return [];
    }
  }

  isFreeModel(model: ProviderModel): boolean {
    // Generic adapter relies 100% on MetadataOracle for free validation
    // unless the API itself returns pricing (like OpenRouter)
    if (model.pricing?.prompt === "0" || model.pricing?.prompt === "0.0") {
      return true;
    }
    return false;
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    const id = model.id.toLowerCase();
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
      id.includes("lite") ||
      id.includes("small")
    ) {
      category = "speed";
    } else if (
      id.includes("vl") ||
      id.includes("vision") ||
      id.includes("molmo")
    ) {
      category = "multimodal";
    }

    // Determine if elite
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase()),
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split("/")[1] || model.id,
      description: model.description,
      contextLength: model.context_length,
      maxOutputTokens: model.max_output_tokens,
      pricing: {
        prompt: model.pricing?.prompt || "0",
        completion: model.pricing?.completion || "0",
        request: model.pricing?.request || "0",
      },
      isFree,
      isElite,
      category,
      confidence: isFree ? 1.0 : 0.5,
      tier: isFree ? "CONFIRMED_FREE" : "UNKNOWN",
    };
  }
}

/**
 * Create adapter instance by provider ID
 */
export function createAdapter(
  providerId: string,
  config: any = {},
): ProviderAdapter {
  const adapters: Record<string, () => ProviderAdapter> = {
    openrouter: () => new OpenRouterAdapter(),
    groq: () => new GroqAdapter(),
    cerebras: () => new CerebrasAdapter(),
    google: () => new GoogleAdapter(),
    deepseek: () => new DeepSeekAdapter(),
    modelscope: () => new ModelScopeAdapter(),
    huggingface: () => new HuggingFaceAdapter(),
  };

  const factory = adapters[providerId];
  if (factory) {
    const adapter = factory();
    // Wrap with circuit breaker for resilience
    return new ResilientAdapter(adapter);
  }

  // Generic fallback
  return new ResilientAdapter(
    new GenericAdapter(providerId, providerId, config),
  );
}
