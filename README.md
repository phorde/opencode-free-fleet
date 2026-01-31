# 🚀 opencode-free-fleet

**Economic Load Balancing and Zero-Cost Model Discovery for OpenCode**

Automatically ranks and competes free LLM models by benchmark performance from **75+ OpenCode providers** using SOTA benchmarks and metadata oracles.

---

## 📊 Current Status

| Badge                                                                                                                                   | Status     |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| [![NPM Version](https://img.shields.io/npm/v/opencode-free-fleet?style=flat-square)](https://www.npmjs.com/package/opencode-free-fleet) | `v0.4.0`   |
| [![License](https://img.shields.io/npm/l/opencode-free-fleet?style=flat-square)](https://opensource.org/licenses/MIT)                   | MIT        |
| [![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()                                                  | ✅ Passing |
| [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)]()                                                 | TypeScript |

---

## 🎯 Features

### 🤖 Omni-Scout (Multi-Provider Discovery)

**75+ Providers Supported:**

- OpenRouter, Groq, Cerebras, Google Cloud AI, DeepSeek
- ModelScope, Hugging Face, Z.Ai, and 70+ more

**Key Capabilities:**

- ✅ **Zero-Config Mode** - Works without `oh-my-opencode.json` (graceful fallback)
- ✅ **Automatic Provider Detection** - Scans `~/.config/opencode/` for active providers
- ✅ **Cross-Provider Metadata Lookup** - Verifies free tier via Models.dev API + provider reports
- ✅ **Confidence Scoring** - 0.0 (uncertain) to 1.0 (confirmed free)
- ✅ **Intelligent Blocklist** - Blocks Google/Gemini when Antigravity is active (respects `allowAntigravity` flag)
- ✅ **SOTA Benchmark Ranking** - Elite families prioritized by benchmark performance
- ✅ **Functional Categorization** - Coding, Reasoning, Speed, Multimodal, Writing

### 🎯 Task-Type Delegation (NEW in v0.4.0)

**Intelligent Task Routing:**

- ✅ **10 Task Types** - Automatically detects: code_generation, code_review, debugging, reasoning, math, writing, summarization, translation, multimodal, general
- ✅ **Category Mapping** - Routes tasks to optimal model categories (coding, reasoning, writing, speed, multimodal)
- ✅ **Pattern-Based Detection** - 3-5 regex patterns per task type for high accuracy

**Delegation Modes:**

- ✅ **Ultra Free** - Race ALL free models, unlimited fallback
- ✅ **SOTA Only** - Use only elite (top benchmark) models
- ✅ **Balanced (default)** - Race top N models (configurable, default 5)

**Fallback Chain Racing:**

- ✅ **Unlimited Retries** - `-1` for infinite attempts (ultra_free mode)
- ✅ **Batched Fallback** - 5 models at a time (balanced mode)
- ✅ **Progress Tracking** - Real-time fallback attempt notifications

### 📊 Metrics & Cost Tracking (NEW in v0.4.0)

**Per-Model Performance:**

- ✅ **Success Rate** - Tracks completed vs failed requests per model
- ✅ **Average Latency** - Rolling average response time per model
- ✅ **Token Usage** - Total tokens consumed per model
- ✅ **Last Used** - Timestamp of most recent invocation

**Session-Level Metrics:**

- ✅ **Delegation Count** - Total tasks delegated in session
- ✅ **Tokens Saved** - Estimated savings vs using paid models (baseline: 2000 tokens/delegation)
- ✅ **Cost Saved** - Monetary savings ($3/1M tokens = Claude Sonnet rate)
- ✅ **Historical Persistence** - Metrics saved to `~/.config/opencode/fleet-metrics.json`

**Metrics Location:** `~/.config/opencode/fleet-metrics.json`
**Auto-Load:** Historical metrics loaded on plugin initialization

### ⚡ Zero-Latency Racer

**Promise.any Competition:**

- ✅ Fires all model requests simultaneously (no waterfall)
- ✅ Accepts first valid response (fastest wins)
- ✅ Aborts pending requests immediately (saves tokens/cost)
- ✅ Timeout protection (configurable)
- ✅ Progress monitoring (onProgress callbacks)
- ✅ **Fallback Chain Support** (v0.4.0) - Unlimited retries with configurable batch size

### 🛠️ Plugin Tools (v0.4.0)

**5 New Delegation Tools:**

| Tool                 | Description            | Example                                                             |
| -------------------- | ---------------------- | ------------------------------------------------------------------- |
| `/fleet-config`      | Configure all settings | `/fleet-config --mode ultra_free --raceCount 10 --fallbackDepth -1` |
| `/fleet-mode`        | Quick mode switch      | `/fleet-mode SOTA_only`                                             |
| `/fleet-status`      | Show config + metrics  | Displays session stats, model breakdown, cost savings               |
| `/fleet-delegate`    | Manual delegation      | `/fleet-delegate "Write a React component"`                         |
| `/fleet-transparent` | Toggle auto-delegation | `/fleet-transparent --enabled true` (future: v0.5.0)                |

**Existing Tools (Unchanged):**
| Tool | Description |
|-------|-------------|
| `/fleet-scout` | Discover free models (v0.3.0+) |
| `/fleet-router` | Route to specific models (v0.3.0) |

**Configuration Options:**

| Option            | Type    | Default    | Description                                        |
| ----------------- | ------- | ---------- | -------------------------------------------------- |
| `mode`            | string  | `balanced` | Fleet mode: `ultra_free`, `SOTA_only`, `balanced`  |
| `raceCount`       | number  | `5`        | Number of models to race (ignored in `ultra_free`) |
| `transparentMode` | boolean | `false`    | Enable auto-delegation (future: v0.5.0)            |
| `fallbackDepth`   | number  | `3`        | Fallback attempts, `-1` for unlimited              |

### 🌐 Live Updates (Community Source)

The Oracle fetches fresh community-curated free models from GitHub:

- URL: `https://raw.githubusercontent.com/phorde/opencode-free-fleet/main/resources/community-models.json`
- Fire-and-forget (doesn't block boot)
- Graceful fallback if offline

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                                           OpenCode   │
│                                                Plugin System  │
│                                                     │
│  ┌──────────────────────────────────────┐    │
│  │   🤖 Scout (Discovery Engine)     │    │
│  │   ├── 📊 Metadata Oracle        │    │
│  │   │   └── 🌐 Community Source    │    │
│  │   │   └── 🧩 Provider Adapters     │    │
│  │   │                              │    │
│  │   └── 🏁 Racer (Competition)    │    │
│  │                               │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                                                     │
└──────────────────────────────────────────────────┘
            User Tools (Terminal)                │
```

---

## 📋 How It Works

### 1. Provider Detection

The plugin automatically scans your OpenCode configuration to detect active providers:

```jsonc
{
  "google_auth": false,
  "providers": {
    "openrouter": { "apiKey": "..." },
    "groq": { "apiKey": "..." },
  },
  "categories": {
    "free_code_generation": {
      "model": "openrouter/qwen/qwen3-coder:free",
      "fallback": ["zai-coding-plan/glm-4.7-flash"],
    },
  },
}
```

**Supported Providers:**

- OpenRouter (via API)
- Groq (via API)
- Cerebras (via API)
- Google Cloud AI (cached - Gemini Flash/Nano)
- DeepSeek (via API)
- ModelScope (cached)
- Hugging Face (cached)

### 2. Metadata Oracle (Free Tier Detection)

The plugin uses **multiple metadata sources** to verify if models are free:

**Sources:**

1. **Models.dev API** - Public model metadata database
2. **Community Source** - GitHub-hosted `community-models.json`
3. **Provider SDKs** - Native SDKs for each provider (OpenRouter, Groq, etc.)
4. **Static Whitelist** - Confirmed free models (curated, updatable)

**Confidence Scoring:**

- `1.0` - **Confirmed free** - Multiple sources say it's free
- `0.7` - **Likely free** - Metadata exists but not explicitly marked free
- `0.0` - **Uncertain** - No metadata available

### 3. Safety (Antigravity Blocklist)

**Default Behavior:**

- If `opencode-antigravity-auth` plugin is detected:
  - Google/Gemini models are **BLOCKED** from "Free Fleet"
  - This prevents consuming your personal Google quota

**Override Behavior:**

```typescript
const scout = new Scout({
  allowAntigravity: true, // Allow Google/Gemini even with Antigravity
});
```

### 4. Multi-Provider Ranking Algorithm

**Priority Order:**

1. **Confidence Score** (highest first) - Verified free models prioritized
2. **Elite Family** (SOTA benchmarks) - Models with proven performance
3. **Provider Priority** (performance-based) - Faster providers prioritized
   - Models.dev (1) > OpenRouter (2) > Groq (3) > Cerebras (4)
   - DeepSeek (7) > Google (6) > ModelScope (8) > HuggingFace (9)
4. **Parameter Count** (intelligence) - Larger models > smaller (except speed)
5. **Release Date** (newer first) - Recently released models prioritized
6. **Alphabetical** (tiebreaker) - A to Z when scores equal

**Example:**

```typescript
// DeepSeek R1 (Elite) vs Random Model
const ranked = scout.rankModelsByBenchmark(
  [deepseekR1, randomModel],
  "reasoning",
);

// Result: DeepSeek R1 wins (Elite family membership)
```

### 5. Tool Commands

**Discovery Tool (`/fleet-scout`):**

```bash
# Discover all free models from configured providers
/fleet-scout

# Filter by category (default: all)
/fleet-scout category="coding"

# Show top N models
/fleet-scout top=10
```

**Competition Tool (`/fleet-router`):**

```bash
# Race between free models and return fastest
/fleet-router category="coding" prompt="Write a function"

# With timeout (60s)
/fleet-router category="coding" prompt="..." timeoutMs=60000
```

---

## 🔧 Configuration

### Scout Config

```typescript
interface ScoutConfig {
  antigravityPath?: string; // Path to Antigravity accounts
  opencodeConfigPath?: string; // Path to OpenCode config
  allowAntigravity?: boolean; // Allow Google/Gemini (default: false)
  ultraFreeMode?: boolean; // Return ALL models (default: false)
}
```

**Default Values:**

- `antigravityPath`: `~/.config/opencode/antigravity-accounts.json`
- `opencodeConfigPath`: `~/.config/opencode/oh-my-opencode.json`
- `allowAntigravity`: `false` (Blocks Google/Gemini by default)
- `ultraFreeMode`: `false` (Returns top 5 models, not all)

### Ultra-Free-Mode

When `ultraFreeMode: true`, the Scout returns **ALL** verified free models instead of just the top 5.

**When to use:**

- You need maximum survivability (quantity over quality)
- You want to try every possible free model
- You're willing to accept longer fallback chains

**Example:**

```typescript
const scout = new Scout({
  ultraFreeMode: true, // Return ALL free models
});

const results = await scout.discover();
const codingModels = results.coding.rankedModels; // Could be 50+ models
```

### Race Config

```typescript
interface RaceConfig {
  timeoutMs?: number; // Timeout in milliseconds (default: 30000)
  onProgress?: (
    model: string,
    status: "started" | "completed" | "failed",
    error?: Error,
  ) => void;
}
```

**Default Values:**

- `timeoutMs`: `30000` (30 seconds)

---

## 📊 Elite Model Families

### Coding Elite (Top Benchmarks: HumanEval)

- `qwen-2.5-coder` - 85.4% HumanEval
- `qwen3-coder` - 90.6% HumanEval
- `deepseek-coder` - 83.5% HumanEval
- `deepseek-v3` - 90.6% HumanEval
- `llama-3.3-70b` - 82.4% HumanEval
- `codestral` - 76.5% HumanEval
- `starcoder` - 75.2% HumanEval

### Reasoning Elite (GSM8K)

- `deepseek-r1` - 89.5% GSM8K
- `deepseek-reasoner`
- `qwq`
- `o1-open`
- `o3-mini`

### Speed Elite (MT-Bench)

- `mistral-small` - 81.1% MT-Bench
- `haiku`
- `gemma-3n`
- `gemma-3n-e4b`
- `flash`
- `distill`
- `nano`
- `lite`

### Multimodal Elite (MMMU, MM-VET)

- `nvidia/nemotron-vl`
- `pixtral`
- `qwen-vl`
- `allenai/molmo`

### Writing Elite

- `trinity`
- `qwen-next`
- `chimera`
- `writer`

---

## 🚀 Installation

### From NPM (Recommended)

```bash
# Install from public registry
npm install opencode-free-fleet

# Or install from local directory
npm install file:~/Projetos/opencode-free-fleet
```

### Local Development

```bash
# Clone repository
git clone https://github.com/phorde/opencode-free-fleet.git

# Install dependencies
cd opencode-free-fleet
bun install

# Run tests
bun test

# Build for production
bun run build
```

---

## 🤝 Contributing

Contributions are welcome! Please see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details.

### Adding Free Models

The community-maintained list of free models is hosted at `resources/community-models.json`. To add or update free models:

1. Fork the repository
2. Edit `resources/community-models.json`:
   ```json
   {
     "version": "0.3.0",
     "lastUpdated": "2026-01-31",
     "models": ["provider/model-id:free"]
   }
   ```
3. Submit a pull request with a brief explanation

**Key Areas for Contribution:**

1. **Provider Adapters** - Add new providers by implementing the `ProviderAdapter` interface
2. **Metadata Sources** - Add new metadata sources for model verification
3. **Benchmark Rankings** - Update elite families with new SOTA models
4. **Free Models List** - Add newly discovered free models to `community-models.json`

---

## 📈 License

MIT License - See [LICENSE](./LICENSE) file for details.

---

## 📝 Version History

- **0.3.0** (Current) - Zero-Config Mode, Live Updates, and Ultra-Free-Mode
  - ✅ **Zero-Config Mode** - Graceful fallback when config missing
  - ✅ **Live Update Mechanism** - Fetches community free models from GitHub
  - ✅ **Ultra-Free-Mode** - Configurable "quantity over quality" mode
  - ✅ **Chief End Easter Egg** - Hidden theological reference

- **0.2.2** (Previous) - Metadata Oracle + 75+ Providers
  - Added Metadata Oracle for cross-provider free tier verification
  - Implemented modular adapter system for 75+ providers
  - Added intelligent blocklist based on Antigravity presence
  - Added confidence scoring (0.0 to 1.0) for free tier verification

- **0.1.0** (Initial) - OpenRouter-only support
  - Single provider (OpenRouter)
  - Hardcoded free tier detection (`pricing.prompt === "0"`)
  - Basic multi-provider support (5 adapters)

---

## 🔐 Security

**Data Privacy:**

- No telemetry collection
- All provider API keys stored locally in OpenCode config
- No external data transmission (except to Models.dev API for metadata lookup)

**Code Integrity:**

- Dependencies are from official npm registry (`@opencode-ai/plugin`)
- All code is type-checked and compiled
- Published with provenance verification

---

## 📊 Badges

[![NPM Version](https://img.shields.io/npm/v/opencode-free-fleet?style=flat-square)](https://www.npmjs.com/package/opencode-free-fleet)
[![License](https://img.shields.io/npm/l/opencode-free-fleet?style=flat-square)](https://opensource.org/licenses/MIT)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)]()

---

**Made with ❤️ by [Phorde](mailto:consultorio@phorde.com.br)**

**Repository:** https://github.com/phorde/opencode-free-fleet
