/**
 * Type definitions for OpenCode Free Fleet v0.2.0
 *
 * Multi-provider support: Adapters for 75+ OpenCode providers
 */

/**
 * Unified free model interface (provider-agnostic)
 */
export interface FreeModel {
  id: string;
  provider: string;
  name: string;
  description?: string;
  contextLength?: number;
  maxOutputTokens?: number;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
  };
  isFree: boolean;
  isElite: boolean;
  category: ModelCategory;
}

/**
 * Model category identifiers
 */
export type ModelCategory = 'coding' | 'reasoning' | 'speed' | 'multimodal' | 'writing';

/**
 * Provider adapter interface
 * Each provider knows how to fetch models and identify free ones
 */
export interface ProviderAdapter {
  /**
   * Provider identifier (e.g., 'openrouter', 'groq', 'google')
   */
  providerId: string;

  /**
   * Display name for the provider
   */
  providerName: string;

  /**
   * Fetch available models from this provider
   */
  fetchModels(): Promise<ProviderModel[]>;

  /**
   * Determine if a model is free tier
   */
  isFreeModel(model: ProviderModel): boolean;

  /**
   * Normalize provider model to FreeModel interface
   */
  normalizeModel(model: ProviderModel): FreeModel;
}

/**
 * Provider-specific model interface
 * Each provider may have different data structures
 */
export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  [key: string]: any; // Provider-specific fields
}

/**
 * Scout configuration
 */
export interface ScoutConfig {
  antigravityPath?: string;
  opencodeConfigPath?: string;
  allowAntigravity?: boolean; // NEW: Allow using Antigravity auth for Google/Gemini
}

/**
 * Scout result with ranked models
 */
export interface ScoutResult {
  category: ModelCategory;
  models: FreeModel[]; // Changed from OpenRouterModel to FreeModel
  rankedModels: FreeModel[];
  eliteModels: FreeModel[];
}

/**
 * OpenRouter model representation (v0.1.0 - kept for backward compatibility)
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_mode: Record<string, any>;
  };
  pricing: {
    prompt: string;
    completion: string;
    request: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
}

/**
 * OpenCode configuration structure
 */
export interface OpenCodeConfig {
  google_auth?: boolean;
  providers?: {
    [providerId: string]: any;
  };
  categories?: Record<string, CategoryConfig>;
}

/**
 * Category configuration with model selection and fallback chain
 */
export interface CategoryConfig {
  model: string;
  fallback: string[];
  description: string;
}

/**
 * Race execution result
 */
export interface RaceResult<T = unknown> {
  model: string;
  result: T;
  duration: number;
}

/**
 * Race configuration
 */
export interface RaceConfig {
  timeoutMs?: number;
  abortController?: AbortController;
  onProgress?: (model: string, status: 'started' | 'completed' | 'failed', error?: Error) => void;
}

/**
 * Provider discovery result
 */
export interface ProviderDiscoveryResult {
  providerId: string;
  providerName: string;
  models: FreeModel[];
  error?: string;
}

/**
 * Active provider detection result
 */
export interface ActiveProvidersResult {
  providers: string[];
  adapters: Map<string, ProviderAdapter>;
  errors: string[];
}

/**
 * Plugin context provided by OpenCode
 */
export interface PluginContext {
  project: any;
  client: any;
  $: any;
  directory: string;
  worktree: string;
}

/**
 * Plugin hook definitions
 */
export interface PluginHooks {
  onStart?: () => Promise<void> | void;
  tool?: Record<string, any>;
  [key: string]: any;
}

/**
 * Export type for Plugin function
 */
export type PluginFunction = (ctx: PluginContext) => Promise<PluginHooks>;

/**
 * SOTA benchmark elite families
 * These families are prioritized because they consistently achieve top scores
 */
export const ELITE_FAMILIES = {
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
