/**
 * Type definitions for OpenCode Free Fleet
 *
 * This module implements economic load balancing and zero-cost model discovery
 * for OpenCode agents, prioritizing SOTA benchmark performance.
 */

/**
 * OpenRouter model representation from API
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
 * SOTA benchmark elite families
 * These families are prioritized because they consistently achieve
 * top scores on relevant benchmarks
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

/**
 * Model category identifiers
 */
export type ModelCategory = 'coding' | 'reasoning' | 'speed' | 'multimodal' | 'writing';

/**
 * Category configuration with model selection and fallback chain
 */
export interface CategoryConfig {
  model: string;
  fallback: string[];
  description: string;
}

/**
 * Scout configuration
 */
export interface ScoutConfig {
  antigravityPath?: string;
  opencodeConfigPath?: string;
}

/**
 * Antigravity accounts structure
 */
export interface AntigravityAccounts {
  version: number;
  accounts: Array<{
    email: string;
    refreshToken: string;
    enabled: boolean;
    [key: string]: any;
  }>;
}

/**
 * Scout result with ranked models
 */
export interface ScoutResult {
  category: ModelCategory;
  models: OpenRouterModel[];
  rankedModels: OpenRouterModel[];
  eliteModels: OpenRouterModel[];
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
 * Free Model Selection Result
 */
export interface FreeModelSelection {
  model: string;
  source: 'explicit' | 'category' | 'file-type' | 'default';
  category?: ModelCategory;
  reason?: string;
  fallbackChain: string[];
  isFree: boolean;
  estimatedCost: {
    input: number;
    output: number;
  };
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
