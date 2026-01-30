/**
 * Provider Adapters for OpenCode Free Fleet v0.2.0
 *
 * Each adapter knows how to fetch models and identify free tier models
 * for a specific provider.
 */

import type {
  ProviderAdapter,
  ProviderModel,
  FreeModel
} from '../types/index.js';

/**
 * Base Provider Adapter
 * Default implementation for providers without special free tier logic
 */
export abstract class BaseAdapter implements ProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;

  constructor(providerId: string, providerName: string) {
    this.providerId = providerId;
    this.providerName = providerName;
  }

  abstract fetchModels(): Promise<ProviderModel[]>;

  /**
   * Default free tier detection
   * Override in provider-specific adapters
   */
  isFreeModel(model: ProviderModel): boolean {
    // Default: assume not free unless explicitly marked
    return model.pricing?.prompt === '0' || model.pricing?.completion === '0';
  }

  normalizeModel(model: ProviderModel): FreeModel {
    const isFree = this.isFreeModel(model);

    // Determine category
    const id = model.id.toLowerCase();
    let category: 'coding' | 'reasoning' | 'speed' | 'multimodal' | 'writing' = 'writing';

    if (id.includes('coder') || id.includes('code') || id.includes('function')) {
      category = 'coding';
    } else if (id.includes('r1') || id.includes('reasoning') || id.includes('cot') || id.includes('qwq')) {
      category = 'reasoning';
    } else if (id.includes('flash') || id.includes('distill') || id.includes('nano') || id.includes('lite')) {
      category = 'speed';
    } else if (id.includes('vl') || id.includes('vision') || id.includes('molmo')) {
      category = 'multimodal';
    }

    // Determine if elite
    const { ELITE_FAMILIES } = require('../types/index.js');
    const elitePatterns = ELITE_FAMILIES[category] || [];
    const isElite = elitePatterns.some((pattern: string) =>
      id.includes(pattern.toLowerCase())
    );

    return {
      id: model.id,
      provider: this.providerId,
      name: model.name || model.id.split('/')[1],
      description: model.description,
      contextLength: model.context_length,
      maxOutputTokens: model.max_output_tokens || model.architecture?.['context_length'],
      pricing: {
        prompt: model.pricing?.prompt || '0',
        completion: model.pricing?.completion || '0',
        request: model.pricing?.request || '0'
      },
      isFree,
      isElite,
      category
    };
  }
}

/**
 * OpenRouter Adapter
 * All models with pricing.prompt === "0" AND pricing.completion === "0" are free
 */
export class OpenRouterAdapter extends BaseAdapter {
  constructor() {
    super('openrouter', 'OpenRouter');
  }

  async fetchModels(): Promise<ProviderModel[]> {
    console.log('🔗 OpenRouter: Fetching models...');

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
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
      top_provider: model.top_provider
    }));
  }

  isFreeModel(model: ProviderModel): boolean {
    // OpenRouter: Free if both prompt and completion are "0"
    const isFreePrompt = model.pricing?.prompt === '0' || model.pricing?.prompt === '0.0';
    const isFreeCompletion = model.pricing?.completion === '0' || model.pricing?.completion === '0.0';
    return isFreePrompt && isFreeCompletion;
  }
}

/**
 * Groq Adapter
 * Currently (as of 2026), most Groq models are free
 */
export class GroqAdapter extends BaseAdapter {
  constructor() {
    super('groq', 'Groq');
  }

  async fetchModels(): Promise<ProviderModel[]> {
    console.log('🚀 Groq: Fetching models...');

    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.data || [];

    console.log(`✓ Groq: Found ${models.length} models`);

    return models.map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      context_length: model.context_length,
      architecture: model.architecture,
      pricing: model.pricing || {},
      top_provider: null
    }));
  }

  isFreeModel(model: ProviderModel): boolean {
    // Groq: Assume all models are free (current policy)
    return true;
  }
}

/**
 * Cerebras Adapter
 * All models are currently free
 */
export class CerebrasAdapter extends BaseAdapter {
  constructor() {
    super('cerebras', 'Cerebras');
  }

  async fetchModels(): Promise<ProviderModel[]> {
    console.log('⚡ Cerebras: Fetching models...');

    const response = await fetch('https://api.cerebras.ai/v1/models', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Cerebras API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const models = data.models || [];

    console.log(`✓ Cerebras: Found ${models.length} models`);

    return models.map((model: any) => ({
      id: model.id,
      name: model.name,
      description: model.description,
      context_length: model.context_length || model.context_window,
      architecture: model.architecture,
      pricing: model.pricing || {},
      top_provider: null
    }));
  }

  isFreeModel(model: ProviderModel): boolean {
    // Cerebras: Assume all models are free (current policy)
    return true;
  }
}

/**
 * Google Adapter
 * Free models are limited (Gemini Flash, Gemini Nano)
 */
export class GoogleAdapter extends BaseAdapter {
  constructor() {
    super('google', 'Google');
  }

  async fetchModels(): Promise<ProviderModel[]> {
    console.log('🔵 Google: Fetching models...');

    // Note: This requires OAuth flow
    // For now, return a placeholder list
    const freeModels = [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast, lightweight multimodal model (Free Tier)',
        context_length: 28000,
        pricing: { prompt: '0', completion: '0', request: '0' }
      },
      {
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash-8B',
        description: 'Even smaller and faster (Free Tier)',
        context_length: 1000000,
        pricing: { prompt: '0', completion: '0', request: '0' }
      }
    ];

    console.log(`✓ Google: Found ${freeModels.length} free models (cached)`);

    return freeModels;
  }

  isFreeModel(model: ProviderModel): boolean {
    // Google: Check if explicitly marked as free (pricing === "0")
    const isFreePrompt = model.pricing?.prompt === '0' || model.pricing?.prompt === '0.0';
    const isFreeCompletion = model.pricing?.completion === '0' || model.pricing?.completion === '0.0';
    return isFreePrompt && isFreeCompletion;
  }
}

/**
 * DeepSeek Adapter
 * DeepSeek-V3.2 has 5M free tokens
 */
export class DeepSeekAdapter extends BaseAdapter {
  constructor() {
    super('deepseek', 'DeepSeek');
  }

  async fetchModels(): Promise<ProviderModel[]> {
    console.log('🟣 DeepSeek: Fetching models...');

    const response = await fetch('https://api.deepseek.com/v1/models', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
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
        tokenizer: model.tokenizer || 'unknown'
      },
      pricing: model.pricing || {},
      top_provider: null
    }));
  }

  isFreeModel(model: ProviderModel): boolean {
    // DeepSeek: Check if marked as free or known free model
    const knownFreeModels = ['deepseek-chat', 'deepseek-coder', 'deepseek-v3', 'deepseek-v3.2'];
    const modelId = model.id.toLowerCase();

    return knownFreeModels.some(freeModel => modelId.includes(freeModel));
  }
}

/**
 * ModelScope Adapter
 * Some free models available
 */
export class ModelScopeAdapter extends BaseAdapter {
  constructor() {
    super('modelscope', 'ModelScope');
  }

  async fetchModels(): Promise<ProviderModel[]> {
    console.log('🔬 ModelScope: Fetching models...');

    // Note: This requires authentication
    // For now, return a placeholder list
    const freeModels = [
      {
        id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        name: 'Meta Llama 3.1 70B',
        description: 'Llama 3.1 with 128K context (Free Tier)',
        context_length: 128000,
        pricing: { prompt: '0', completion: '0', request: '0' }
      }
    ];

    console.log(`✓ ModelScope: Found ${freeModels.length} free models (cached)`);

    return freeModels;
  }

  isFreeModel(model: ProviderModel): boolean {
    // ModelScope: Check if explicitly marked as free
    const isFreePrompt = model.pricing?.prompt === '0' || model.pricing?.prompt === '0.0';
    const isFreeCompletion = model.pricing?.completion === '0' || model.pricing?.completion === '0.0';
    return isFreePrompt && isFreeCompletion;
  }
}

/**
 * Hugging Face Adapter
 * Some free serverless inference models
 */
export class HuggingFaceAdapter extends BaseAdapter {
  constructor() {
    super('huggingface', 'Hugging Face');
  }

  async fetchModels(): Promise<ProviderModel[]> {
    console.log('🤗 Hugging Face: Fetching free serverless models...');

    // Note: This requires complex filtering
    // For now, return a placeholder list
    const freeModels = [
      {
        id: 'Qwen/Qwen2.5-72B-Instruct',
        name: 'Qwen 2.5 72B',
        description: 'Qwen 2.5 with 128K context (Serverless Free)',
        context_length: 128000,
        pricing: { prompt: '0', completion: '0', request: '0' }
      }
    ];

    console.log(`✓ Hugging Face: Found ${freeModels.length} free models (cached)`);

    return freeModels;
  }

  isFreeModel(model: ProviderModel): boolean {
    // Hugging Face: Check if marked as serverless free
    return model.serverless_free === true || model.pricing?.prompt === '0';
  }
}

/**
 * Create adapter instance by provider ID
 */
export function createAdapter(providerId: string): ProviderAdapter {
  const adapters: Record<string, new () => ProviderAdapter> = {
    'openrouter': () => new OpenRouterAdapter(),
    'groq': () => new GroqAdapter(),
    'cerebras': () => new CerebrasAdapter(),
    'google': () => new GoogleAdapter(),
    'deepseek': () => new DeepSeekAdapter(),
    'modelscope': () => new ModelScopeAdapter(),
    'huggingface': () => new HuggingFaceAdapter()
  };

  const adapterFactory = adapters[providerId];

  if (!adapterFactory) {
    console.warn(`⚠️  No adapter found for provider: ${providerId}, using base adapter`);
    return new BaseAdapter(providerId, providerId);
  }

  return adapterFactory();
}
