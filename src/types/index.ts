/**
 * Type definitions for OpenCode Free Fleet v0.2.0
 *
 * Simplified types to fix compilation errors
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
  confidence?: number; // Added for compatibility with Scout
}

/**
 * Model category identifiers
 */
export type ModelCategory = 'coding' | 'reasoning' | 'speed' | 'multimodal' | 'writing';

/**
 * Provider model interface
 */
export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  max_output_tokens?: number;
  pricing?: {
    prompt: string;
    completion: string;
    request: string;
    prompt_price?: string;
    top_provider?: any;
  }
  architecture?: any;
  top_provider?: any;
  serverless_free?: boolean;
  max_context_tokens?: number; // For DeepSeek
  modality?: string; // For DeepSeek
  tokenizer?: string; // For DeepSeek
  context_window?: number; // For Cerebras
}

/**
 * Provider Adapter interface
 */
export interface ProviderAdapter {
  readonly providerId: string;
  readonly providerName: string;
  fetchModels(): Promise<ProviderModel[]>;
  isFreeModel(model: ProviderModel): boolean;
  normalizeModel(model: ProviderModel): FreeModel;
}

/**
 * Scout configuration
 */
export interface ScoutConfig {
  antigravityPath?: string;
  opencodeConfigPath?: string;
  allowAntigravity?: boolean;
  ultraFreeMode?: boolean;
}

/**
 * Scout result with ranked models
 */
export interface ScoutResult {
  category: ModelCategory;
  models: FreeModel[];
  rankedModels: FreeModel[];
  eliteModels: FreeModel[];
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
export interface ActiveProvidersResult {
  providers: string[];
  adapters: Map<string, ProviderAdapter>;
  errors: string[];
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