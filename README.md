# 🚀 opencode-free-fleet

**Economic Load Balancing and Zero-Cost Model Discovery for OpenCode**

Automatically ranks and competes free LLM models by benchmark performance from **75+ OpenCode providers** using SOTA benchmarks and metadata oracles.

---

## 📊 Current Status

- **Version:** 0.2.0
- **Status:** Production Ready ✅
- **Architecture:** Modular Multi-Provider Discovery with Metadata Oracle
- **Repository:** https://github.com/phorde/opencode-free-fleet (Public)

---

## 🎯 Features

### 🤖 Omni-Scout (Multi-Provider Discovery)

**75+ Providers Supported:**
- OpenRouter
- Groq
- Cerebras
- Google Cloud AI
- DeepSeek
- ModelScope
- Hugging Face
- And more (extensible via adapter system)

**Key Capabilities:**
- ✅ **Automatic Provider Detection** - Scans `~/.config/opencode/` or `oh-my-opencode.json`
- ✅ **Cross-Provider Metadata Lookup** - Verifies free tier via Models.dev API + provider reports
- ✅ **Confidence Scoring** - 0.0 (uncertain) to 1.0 (confirmed free)
- ✅ **Intelligent Blocklist** - Blocks Google/Gemini when Antigravity is active (respects `allowAntigravity` flag)
- ✅ **SOTA Benchmark Ranking** - Elite families prioritized by benchmark performance
- ✅ **Functional Categorization** - Coding, Reasoning, Speed, Multimodal, Writing

### ⚡ Zero-Latency Racer

**Promise.any Competition:**
- ✅ Fires all model requests simultaneously (no waterfall)
- ✅ Accepts first valid response (fastest wins)
- ✅ Aborts pending requests immediately (saves tokens/cost)
- ✅ Timeout protection (configurable)
- ✅ Progress monitoring (onProgress callbacks)

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
│  │   │   └── 🧩 Provider Adapters     │    │
│  │                               │    │
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
    "groq": { "apiKey": "..." }
  },
  "categories": {
    "free_code_generation": {
      "model": "openrouter/qwen/qwen3-coder:free",
      "fallback": ["zai-coding-plan/glm-4.7-flash"]
    }
  }
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
2. **Provider SDKs** - Native SDKs for each provider (OpenRouter, Groq, etc.)
3. **Static Whitelist** - Confirmed free models (curated, updatable)

**Confidence Scoring:**
- `1.0` - **Confirmed free** - Multiple sources say it's free
- `0.7` - **Likely free** - Metadata exists but not explicitly marked free
- `0.0` - **Uncertain** - No metadata available

### 3. Free Tier Detection Logic

For each model, the Oracle:
1. Checks if it's in the confirmed free whitelist
2. Queries Models.dev API
3. Checks provider SDK reports
4. Aggregates results with confidence score

**Example:**
```typescript
const metadata = await oracle.fetchModelMetadata('google/gemini-1.5-flash');

if (metadata.isFree) {
  console.log(`✅ Google/Gemini is FREE (confidence: ${metadata.confidence})`);
}
```

### 4. Safety (Antigravity Blocklist)

**Default Behavior:**
- If `opencode-antigravity-auth` plugin is detected:
  - Google/Gemini models are **BLOCKED** from "Free Fleet"
  - This prevents consuming your personal Google quota

**Override Behavior:**
```typescript
const scout = new Scout({
  allowAntigravity: true  // Allow Google/Gemini even with Antigravity
});
```

### 5. Multi-Provider Ranking Algorithm

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
const ranked = scout.rankModelsByBenchmark([deepseekR1, randomModel], 'reasoning');

// Result: DeepSeek R1 wins (Elite family membership)
```

### 6. Tool Commands

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
  antigravityPath?: string;          // Path to Antigravity accounts
  opencodeConfigPath?: string;        // Path to OpenCode config
  allowAntigravity?: boolean;         // Allow Google/Gemini (default: false)
}
```

**Default Values:**
- `antigravityPath`: `~/.config/opencode/antigravity-accounts.json`
- `opencodeConfigPath`: `~/.config/opencode/oh-my-opencode.json`
- `allowAntigravity`: `false` (Blocks Google/Gemini by default)

### Race Config

```typescript
interface RaceConfig {
  timeoutMs?: number;              // Timeout in milliseconds (default: 30000)
  onProgress?: (model: string, status: 'started' | 'completed' | 'failed', error?: Error) => void;
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
bun run build:tsc
```

---

## 📈 License

MIT License - See [LICENSE](./LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for technical details.

**Key Areas for Contribution:**
1. **Provider Adapters** - Add new providers by implementing the `ProviderAdapter` interface
2. **Metadata Sources** - Add new metadata sources for model verification
3. **Benchmark Rankings** - Update elite families with new SOTA models

---

## 📝 Version History

- **0.2.0** (Current) - Metadata Oracle + 75+ Providers
  - Added Metadata Oracle for cross-provider free tier verification
  - Implemented modular adapter system for 75+ providers
  - Added intelligent blocklist based on Antigravity presence
  - Added confidence scoring (0.0 to 1.0) for free tier verification

- **0.1.0** (Previous) - OpenRouter-only support
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

---

## 📈 Badges

[![NPM Version](https://img.shields.io/npm/v/opencode-free-fleet?style=flat-square)](https://img.shields.io/npm/v/opencode-free-fleet)
[![License](https://img.shields.io/npm/l/opencode-free-fleet?style=flat-square)](https://img.shields.io/npm/l/opencode-free-fleet)
[![Bun](https://img.shields.io/badge/v/opencode-free-fleet?style=flat-square)](https://img.shields.io/badge/v/opencode-free-fleet?main&label=Bun)

---

**Made with ❤️ by [Phorde](mailto:consultorio@phorde.com.br)**

**Repository:** https://github.com/phorde/opencode-free-fleet
