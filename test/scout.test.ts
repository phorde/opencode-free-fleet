/**
 * Scout unit tests
 *
 * Tests for model discovery, ranking, and categorization logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scout, createScout } from '../src/core/scout.js';
import type { OpenRouterModel } from '../src/types/index.js';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn()
}));

describe('Scout', () => {
  let scout: Scout;
  const mockFs = await import('fs/promises');

  beforeEach(() => {
    vi.clearAllMocks();
    scout = createScout({
      antigravityPath: '/mock/path/antigravity-accounts.json',
      opencodeConfigPath: '/mock/path/oh-my-opencode.json'
    });
  });

  describe('buildBlocklist', () => {
    it('should create empty blocklist when no antigravity config exists', async () => {
      (mockFs.readFile as any).mockRejectedValue(new Error('File not found'));

      await (scout as any).buildBlocklist();

      expect((scout as any).blocklist.size).toBe(0);
    });

    it('should block google and gemini when antigravity accounts exist', async () => {
      const mockAccounts = {
        version: 3,
        accounts: [
          { email: 'test@gmail.com', refreshToken: 'abc', enabled: true }
        ]
      };

      (mockFs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));

      await (scout as any).buildBlocklist();

      expect((scout as any).blocklist.has('google')).toBe(true);
      expect((scout as any).blocklist.has('gemini')).toBe(true);
      expect((scout as any).blocklist.size).toBe(2);
    });
  });

  describe('filterBlockedModels', () => {
    beforeEach(async () => {
      // Set up blocklist with google and gemini
      (mockFs.readFile as any).mockRejectedValue(new Error('File not found'));
      await (scout as any).buildBlocklist();
      // Manually add to blocklist
      (scout as any).blocklist.add('google');
      (scout as any).blocklist.add('gemini');
    });

    it('should filter out models from blocked providers', () => {
      const models: OpenRouterModel[] = [
        { id: 'deepseek/deepseek-v3', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'google/gemini-pro', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'openai/gpt-4', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'gemini/gemini-flash', pricing: { prompt: '0', completion: '0', request: '0' } } as any
      ];

      const filtered = (scout as any).filterBlockedModels(models);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(m => m.id)).toEqual(['deepseek/deepseek-v3', 'openai/gpt-4']);
    });

    it('should keep models from non-blocked providers', () => {
      const models: OpenRouterModel[] = [
        { id: 'deepseek/deepseek-v3', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'qwen/qwen2.5', pricing: { prompt: '0', completion: '0', request: '0' } } as any
      ];

      const filtered = (scout as any).filterBlockedModels(models);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(m => m.id)).toEqual(['deepseek/deepseek-v3', 'qwen/qwen2.5']);
    });
  });

  describe('rankModelsByBenchmark', () => {
    it('should prioritize elite models first', () => {
      const models: OpenRouterModel[] = [
        { id: 'some/random-model', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'qwen/qwen3-coder', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'deepseek/deepseek-r1', pricing: { prompt: '0', completion: '0', request: '0' } } as any
      ];

      const ranked = (scout as any).rankModelsByBenchmark(models, 'coding');

      expect(ranked[0].id).toBe('qwen/qwen3-coder'); // Elite model first
    });

    it('should prefer larger models except for speed category', () => {
      const models: OpenRouterModel[] = [
        { id: 'some/model-7b', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'some/model-70b', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'some/model-3b', pricing: { prompt: '0', completion: '0', request: '0' } } as any
      ];

      const rankedCoding = (scout as any).rankModelsByBenchmark(models, 'coding');
      const rankedSpeed = (scout as any).rankModelsByBenchmark(models, 'speed');

      // Coding: larger first
      expect(rankedCoding[0].id).toBe('some/model-70b');
      expect(rankedCoding[2].id).toBe('some/model-3b');

      // Speed: smaller first
      expect(rankedSpeed[0].id).toBe('some/model-3b');
      expect(rankedSpeed[2].id).toBe('some/model-70b');
    });
  });

  describe('categorizeModels', () => {
    it('should categorize models by functional patterns', () => {
      const models: OpenRouterModel[] = [
        { id: 'qwen/qwen3-coder', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'deepseek/deepseek-r1', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'mistralai/mistral-small', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'nvidia/nemotron-vl', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'some/generic-model', pricing: { prompt: '0', completion: '0', request: '0' } } as any
      ];

      const categorized = (scout as any).categorizeModels(models);

      expect(categorized.coding).toHaveLength(1);
      expect(categorized.coding[0].id).toBe('qwen/qwen3-coder');

      expect(categorized.reasoning).toHaveLength(1);
      expect(categorized.reasoning[0].id).toBe('deepseek/deepseek-r1');

      expect(categorized.speed).toHaveLength(1);
      expect(categorized.speed[0].id).toBe('mistralai/mistral-small');

      expect(categorized.multimodal).toHaveLength(1);
      expect(categorized.multimodal[0].id).toBe('nvidia/nemotron-vl');

      expect(categorized.writing).toHaveLength(1);
      expect(categorized.writing[0].id).toBe('some/generic-model');
    });

    it('should handle models that match multiple categories', () => {
      const models: OpenRouterModel[] = [
        { id: 'qwen/qwen3-coder-vl', pricing: { prompt: '0', completion: '0', request: '0' } } as any
      ];

      const categorized = (scout as any).categorizeModels(models);

      // Should be categorized by first match (coding)
      expect(categorized.coding).toHaveLength(1);
      expect(categorized.multimodal).toHaveLength(0);
    });
  });

  describe('generateCategoryConfig', () => {
    it('should generate config with top models', () => {
      const models: OpenRouterModel[] = [
        { id: 'model1', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'model2', pricing: { prompt: '0', completion: '0', request: '0' } } as any,
        { id: 'model3', pricing: { prompt: '0', completion: '0', request: '0' } } as any
      ];

      const config = (scout as any).generateCategoryConfig('coding', models);

      expect(config.model).toBe('openrouter/model1');
      expect(config.fallback).toEqual(['openrouter/model2', 'openrouter/model3']);
      expect(config.description).toContain('CODING');
    });

    it('should limit to top 5 models', () => {
      const models: OpenRouterModel[] = Array.from({ length: 10 }, (_, i) => ({
        id: `model${i}`,
        pricing: { prompt: '0', completion: '0', request: '0' }
      } as any);

      const config = (scout as any).generateCategoryConfig('coding', models);

      expect(config.fallback).toHaveLength(4); // 1 primary + 4 fallback = 5 total
    });
  });
});
