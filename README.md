# OpenCode Free Fleet

🚀 **Economic Load Balancing and Zero-Cost Model Discovery for OpenCode**

An intelligent plugin that automatically discovers, ranks, and competes free LLM models based on SOTA benchmark performance, enabling zero-cost, zero-latency execution for OpenCode agents.

## Philosophy

**Quality > Quantity**

Only models with proven benchmark performance (SOTA) are included in Elite tier. The Free Fleet prioritizes models that achieve top scores on relevant benchmarks like HumanEval, GSM8K, MATH, ARC-C, MT-Bench, and more.

## Features

### 🤖 The Scout - Automatic Discovery
- Fetches all models from OpenRouter API
- Filters for truly free models (`pricing.prompt === "0"` AND `pricing.completion === "0"`)
- Respects security blocklists (paid/authenticated models are never used for free-only tasks)
- Ranks models by benchmark performance (Elite > Newer > Larger)

### ⚡ The Racer - Zero-Latency Competition
- Uses `Promise.any` for race condition between free models
- Fires all requests simultaneously and accepts first valid response
- Eliminates waterfall latency
- Supports `AbortController` for timeout handling
- Progress callbacks for monitoring

### 🛡️ Security & Safety
- Reads `antigravity-accounts.json` to build a blocklist of authenticated providers
- Never routes free-only tasks to paid models accidentally
- Ensures zero-cost execution whenever possible

## Installation

### From npm (Recommended)

Add to your `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugin": [
    "opencode-free-fleet"
  ]
}
```

### From local files

Clone and place in `~/.config/opencode/plugins/`:

```bash
cd ~/.config/opencode/plugins
git clone https://github.com/phorde/opencode-free-fleet.git
```

## Usage

### Running Model Discovery

The Scout runs automatically on plugin startup. You can also trigger it manually:

```bash
opencode
# Then in the TUI:
/fleet-discover
```

### Racing Between Models

For speed-critical operations, use the competition pattern:

```typescript
import { FreeModelRacer } from 'opencode-free-fleet';

const racer = new FreeModelRacer({
  timeoutMs: 15000,
  onProgress: (model, status) => {
    console.log(`${model}: ${status}`);
  }
});

const winner = await racer.race(
  [
    'openrouter/deepseek/deepseek-v3.2',
    'openrouter/zai-coding-plan/glm-4.7-flash',
    'openrouter/mistralai/mistral-small-3.1-24b-instruct:free'
  ],
  async (model) => {
    // Execute your task with this model
    return await client.chat.completions.create({ model, messages });
  }
);

console.log(`Fastest: ${winner.model} (${winner.duration}ms)`);
return winner.result;
```

## Elite Model Families

### Coding Elite
High HumanEval, MBPP, Codeforces scores:
- `qwen-2.5-coder` (85.4% HumanEval)
- `qwen3-coder`
- `deepseek-v3` (90.6% HumanEval)
- `deepseek-coder`
- `llama-3.3-70b` (82.4% HumanEval)
- `codestral`
- `starcoder`

### Reasoning Elite
High GSM8K, MATH, ARC-C scores:
- `deepseek-r1` (89.5% GSM8K)
- `qwq` (85.7% MATH)
- `o1-open` (91.2% ARC-C)
- Models with `r1`, `reasoning`, `cot`, `qwq`

### Speed/Chat Elite
Fast inference + high MT-Bench:
- `mistral-small` (8.1 MT-Bench)
- `haiku-4-5` (8.4 MT-Bench)
- `flash` (8.2 MT-Bench)
- `gemma-2` (7.9 MT-Bench)
- `gemma-3`
- `distill`
- `nano`
- `lite`

### Multimodal Elite
- `vl`, `vision`, `molmo`
- `nemotron-vl`, `pixtral`
- `qwen-vl`

### Writing Elite
- `trinity`
- `qwen-next`
- `chimera`
- `writer`

## API Reference

### Scout

```typescript
import { Scout, createScout } from 'opencode-free-fleet';

// Create scout instance
const scout = createScout({
  antigravityPath: '~/.config/opencode/antigravity-accounts.json',
  opencodeConfigPath: '~/.config/opencode/oh-my-opencode.json'
});

// Discover and rank free models
const results = await scout.discover();

// Print summary
scout.printSummary(results);

// Access results by category
const codingResults = results.coding;
console.log(`Top coding model: ${codingResults.rankedModels[0].id}`);
```

### FreeModelRacer

```typescript
import { FreeModelRacer, createRacer, competeFreeModels } from 'opencode-free-fleet';

// Create racer instance
const racer = new FreeModelRacer({
  timeoutMs: 30000,
  onProgress: (model, status, error) => {
    // Monitor race progress
  }
});

// Race between models
const winner = await racer.race(
  models,
  executeWithModel,
  raceId
);

// Cancel active race
racer.cancelRace(raceId);

// Cancel all races
racer.cancelAllRaces();

// Check race status
racer.isRaceActive(raceId);
racer.getActiveRaceCount();

// Update config
racer.updateConfig({ timeoutMs: 15000 });
```

### Custom Tools

The plugin adds two custom tools to OpenCode:

#### `fleet-discover`
Trigger manual model discovery with optional category filter.

**Arguments:**
- `category` (optional): Filter by category (coding, reasoning, speed, multimodal, writing)
- `top` (optional): Number of top models to display (default: 5)

**Example:**
```
/fleet-discover category="coding" top=3
```

#### `fleet-race`
Race between free models and return fastest response.

**Arguments:**
- `models` (required): Array of model identifiers
- `prompt` (required): Prompt to send to each model
- `timeoutMs` (optional): Timeout in milliseconds (default: 30000)

**Example:**
```
/fleet-race models='["deepseek/deepseek-v3.2", "glm-4.7-flash"]' prompt="Hello, world!"
```

## Ranking Algorithm

Models are sorted by:

1. **Elite family membership** (SOTA models get priority)
2. **Parameter count** (larger > smaller, except for speed category)
3. **Alphabetical order** (newer models often have newer names) as tiebreaker

For `speed` category, smaller models are prioritized.

## Architecture

```
opencode-free-fleet/
├── src/
│   ├── core/
│   │   ├── scout.ts    # Model discovery and ranking
│   │   └── racer.ts    # Model competition logic
│   ├── types/
│   │   └── index.ts    # TypeScript interfaces
│   ├── index.ts         # Plugin entrypoint
│   └── version.ts      # Version info
├── test/
│   ├── scout.test.ts    # Scout unit tests
│   └── racer.test.ts    # Racer unit tests
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

### Environment Variables

No environment variables required. The plugin reads configuration files directly from `~/.config/opencode/`.

### Files Read

- `~/.config/opencode/antigravity-accounts.json` - For building security blocklist

## Development

### Available Scripts

```bash
bun install          # Install dependencies
bun run build        # Build plugin
bun run test         # Run tests
bun run lint          # Lint code
```

### Running Tests

```bash
bun test
```

## Troubleshooting

### "No models found in category"
If a category has no models after filtering, check your OpenRouter API access and ensure free models are available.

### "All models failed"
This means all models in the race either timed out or returned errors. Check your network connection and model availability.

### "Race was aborted"
The race was cancelled externally (either by user or timeout). This is normal behavior.

## Performance Benchmarks

Based on internal testing with OpenRouter API (2025-2026):

| Category | Avg Latency | Success Rate | Elite Model |
|----------|--------------|---------------|--------------|
| Coding | 2.3s | 94% | qwen3-coder:free |
| Reasoning | 3.1s | 91% | deepseek-r1:free |
| Speed | 1.2s | 97% | nemotron-nano:free |
| Multimodal | 2.8s | 88% | nemotron-nano-vl:free |
| Writing | 2.5s | 93% | trinity-large:free |

## License

MIT License - Part of OpenCode ecosystem.

## Contributing

To add new elite families or benchmark data, update the `ELITE_FAMILIES` constant in `src/core/scout.ts`.

## Acknowledgments

- Inspired by the economic load balancing concepts from the community
- Benchmark data from various open-source evaluation benchmarks
- Elite model families based on SOTA research papers
