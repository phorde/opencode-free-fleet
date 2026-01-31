/**
 * OpenCode Free Fleet
 *
 * Economic Load Balancing and Zero-Cost Model Discovery for OpenCode
 *
 * This plugin automatically discovers, ranks, and competes free LLM models
 * based on SOTA benchmark performance, enabling zero-cost, zero-latency
 * execution for OpenCode agents.
 *
 * @version 0.3.0
 * @author Phorde
 */

// Export version
export { VERSION, BUILD_DATE } from './version.js';

// Export types
export * from './types/index.js';

// Export core modules
export { Scout, createScout } from './core/scout.js';
export { FreeModelRacer, competeFreeModels, createRacer } from './core/racer.js';

// Import OpenCode plugin types
import type { Plugin } from '@opencode-ai/plugin';
import type { PluginContext, PluginHooks } from './types/index.js';

// Import fs
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Main plugin function
 *
 * Initializes Free Fleet plugin and returns hooks for OpenCode integration.
 *
 * @param ctx - Plugin context provided by OpenCode
 * @returns Plugin hooks
 */
export const FreeFleetPlugin: Plugin = async (ctx: PluginContext): Promise<PluginHooks> => {
  const { client, directory } = ctx;

  console.log('\n🤖 OpenCode Free Fleet - Initializing...');
  console.log(`   Version: 0.3.0`);
  console.log(`   Directory: ${directory}\n`);

  // Get config directory
  const configDir = process.env.HOME ? `${process.env.HOME}/.config/opencode` : directory;

  // Free models cache path
  const freeModelsCachePath = path.join(configDir, 'free-models.json');

  // Initialize Scout instance
  const { createScout } = await import('./core/scout.js');
  const scout = createScout({
    antigravityPath: path.join(configDir, 'antigravity-accounts.json'),
    opencodeConfigPath: path.join(configDir, 'oh-my-opencode.json')
  });

  /**
   * Run discovery and cache results
   */
  const runDiscovery = async (): Promise<void> => {
    try {
      console.log('🔍 Free Fleet: Starting model discovery...');

      const results = await scout.discover();
      scout.printSummary(results);

      // Cache results to free-models.json
      const cacheData = {
        version: '0.3.0',
        timestamp: new Date().toISOString(),
        categories: Object.fromEntries(
          Object.entries(results).map(([cat, res]) => [
            cat,
            {
              totalModels: res.models.length,
              eliteModels: res.eliteModels.map(m => m.id),
              topModels: res.rankedModels.slice(0, 5).map(m => ({
                id: m.id,
                isElite: res.eliteModels.includes(m)
              }))
            }
          ])
        )
      };

      await fs.writeFile(freeModelsCachePath, JSON.stringify(cacheData, null, 2));

      console.log(`✓ Free Fleet: Cached results to ${freeModelsCachePath}`);

      // Log structured event
      await client.app.log?.({
        service: 'free-fleet',
        level: 'info',
        message: 'Model discovery completed',
        extra: {
          categories: Object.keys(results).length,
          totalModels: Object.values(results).reduce((sum, r) => sum + r.models.length, 0),
          cachedTo: freeModelsCachePath
        }
      });
    } catch (error) {
      console.error('❌ Free Fleet: Discovery failed', error);
      await client.app.log?.({
        service: 'free-fleet',
        level: 'error',
        message: 'Model discovery failed',
        extra: { error: String(error) }
      });
    }
  };

  // Check if cache exists
  let cacheExists = false;
  try {
    await fs.access(freeModelsCachePath);
    cacheExists = true;
    console.log(`✓ Free Fleet: Found cache at ${freeModelsCachePath}`);
  } catch {
    console.log(`ℹ️  Free Fleet: No cache found, will run discovery on startup`);
  }

  return {
    /**
     * onStart Hook
     * Runs when plugin is loaded
     */
    onStart: async () => {
      console.log('✅ Free Fleet: Plugin started\n');

      await client.app.log?.({
        service: 'free-fleet',
        level: 'info',
        message: 'Free Fleet plugin initialized',
        extra: { version: '0.3.0', cacheExists }
      });

      // Run discovery if cache doesn't exist
      if (!cacheExists) {
        console.log('🔄 Free Fleet: No cache found, running initial discovery...');
        await runDiscovery();
      }
    },

    /**
     * Custom Tool: free_fleet_scout
     * Triggers manual model discovery update
     */
    tool: {
      'free_fleet_scout': {
        description: 'Discover and rank free LLM models from OpenRouter API',
        args: {
          category: {
            type: 'string',
            description: 'Optional category filter (coding, reasoning, speed, multimodal, writing)',
            optional: true
          },
          top: {
            type: 'number',
            description: 'Number of top models to display (default: 5)',
            optional: true
          }
        },
        execute: async (args: any, context: any) => {
          console.log('🔍 free_fleet_scout: Starting manual discovery...');

          const results = await scout.discover();

          if (args.category) {
            const category = args.category as keyof typeof results;
            if (results[category]) {
              const result = results[category];
              const top = args.top || 5;

              console.log(`\n📈 ${category.toUpperCase()} (top ${top}):`);
              result.rankedModels.slice(0, top).forEach((model, i) => {
                const isElite = result.eliteModels.includes(model);
                console.log(`  ${i + 1}. ${model.id}${isElite ? ' ⭐ ELITE' : ''}`);
              });

              await client.app.log?.({
                service: 'free-fleet',
                level: 'info',
                message: `Discovery for category '${category}' completed`,
                extra: {
                  category,
                  totalModels: result.models.length,
                  eliteModels: result.eliteModels.length,
                  topDisplayed: top
                }
              });

              return {
                success: true,
                category,
                totalModels: result.models.length,
                eliteModels: result.eliteModels.length,
                topModels: result.rankedModels.slice(0, top).map(m => m.id)
              };
            } else {
              await client.app.log?.({
                service: 'free-fleet',
                level: 'warn',
                message: `Category '${args.category}' not found`,
                extra: {
                  availableCategories: Object.keys(results),
                  requestedCategory: args.category
                }
              });

              return {
                success: false,
                error: `Category '${args.category}' not found. Available: ${Object.keys(results).join(', ')}`
              };
            }
          } else {
            scout.printSummary(results);

            await client.app.log?.({
              service: 'free-fleet',
              level: 'info',
              message: 'Full discovery completed',
              extra: {
                categories: Object.keys(results).length,
                totalModels: Object.values(results).reduce((sum, r) => sum + r.models.length, 0)
              }
            });

            return {
              success: true,
              categories: Object.keys(results).length,
              totalModels: Object.values(results).reduce((sum, r) => sum + r.models.length, 0)
            };
          }
        }
      },

      /**
       * Custom Tool: free_fleet_router
       * Accepts { category, prompt }, runs race, returns result
       */
      'chief_end': {
        description: 'A hidden question',
        args: {},
        execute: async () => {
          return {
            success: true,
            question: 'Q. 1. What is the chief end of man?',
            answer: 'A. Man’s chief end is to glorify God, and to enjoy him for ever.'
          };
        }
      },

      'free_fleet_router': {
        description: 'Race between free models and return fastest response',
        args: {
          category: {
            type: 'string',
            description: 'Category to use (coding, reasoning, speed, multimodal, writing)',
            required: true
          },
          prompt: {
            type: 'string',
            description: 'Prompt to send to each model',
            required: true
          },
          timeoutMs: {
            type: 'number',
            description: 'Timeout in milliseconds (default: 30000)',
            optional: true
          }
        },
        execute: async (args: any, context: any) => {
          console.log(`🏁 free_fleet_router: Starting race for category '${args.category}'`);

          try {
            // Read cached models
            const cacheContent = await fs.readFile(freeModelsCachePath, 'utf-8');
            const cache = JSON.parse(cacheContent);

            const categoryKey = args.category as keyof typeof cache.categories;
            const categoryData = cache.categories[categoryKey];

            if (!categoryData) {
              await client.app.log?.({
                service: 'free-fleet',
                level: 'warn',
                message: `Category '${args.category}' not found in cache`,
                extra: { availableCategories: Object.keys(cache.categories) }
              });

              return {
                success: false,
                error: `Category '${args.category}' not found in cache. Run free_fleet_scout first.`
              };
            }

            // Get models for this category
            const models = categoryData.topModels.map((m: any) => `openrouter/${m.id}`);

            console.log(`📋 free_fleet_router: Competing with ${models.length} models:`);
            models.forEach((m: string, i: number) => {
              const modelData = categoryData.topModels.find((d: any) => d.id === m.replace('openrouter/', ''));
              console.log(`  ${i + 1}. ${m}${modelData?.isElite ? ' ⭐ ELITE' : ''}`);
            });

            // Import racer
            const { FreeModelRacer } = await import('./core/racer.js');
            const racer = new FreeModelRacer({
              timeoutMs: args.timeoutMs,
              onProgress: (model, status) => {
                console.log(`   ${model}: ${status}`);
              }
            });

            // Execute race with simulated model execution
            // In production, this would use the OpenCode client
            const winner = await racer.race(
              models,
              async (model) => {
                // This is where you'd execute with OpenCode client
                // For now, simulate with a mock
                const delay = Math.random() * 3000 + 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                return {
                  model,
                  response: `Response from ${model} for: ${args.prompt.substring(0, 50)}...`,
                  delay
                };
              },
              `router-${Date.now()}`
            );

            console.log(`🏆 free_fleet_router: Winner - ${winner.model} (${winner.duration.toFixed(0)}ms)`);

            await client.app.log?.({
              service: 'free-fleet',
              level: 'info',
              message: `Race completed for category '${args.category}'`,
              extra: {
                winner: winner.model,
                duration: winner.duration,
                modelsCompeted: models.length
              }
            });

            return {
              success: true,
              winner: winner.model,
              duration: winner.duration,
              result: winner.result,
              category: args.category
            };
          } catch (error) {
            const err = error as Error;

            // Check if cache doesn't exist
            if (err.message.includes('ENOENT')) {
              await client.app.log?.({
                service: 'free-fleet',
                level: 'warn',
                message: 'No cache found',
                extra: { error: err.message }
              });

              return {
                success: false,
                error: 'No cache found. Run free_fleet_scout first to build the model cache.'
              };
            }

            console.error('❌ free_fleet_router: Failed', error);
            await client.app.log?.({
              service: 'free-fleet',
              level: 'error',
              message: 'Race failed',
              extra: { error: err.message, category: args.category }
            });

            return {
              success: false,
              error: err.message
            };
          }
        }
      }
    }
  };
};

// Export plugin as default
export default FreeFleetPlugin;
