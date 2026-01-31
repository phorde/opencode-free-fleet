# Generic Provider Adapter Implementation Plan

## Overview

Implement a "Generic Adapter" that allows `opencode-free-fleet` to support _any_ OpenAI-compatible provider (Ollama, vLLM, new APIs) without custom code. This adapter will dynamically discover models via standard `/v1/models` endpoints and validate their "free-tier" status using the existing `MetadataOracle` (models.dev).

## Current State Analysis

- **Hardcoded Adapters**: Each provider (Groq, Cerebras, OpenRouter) has a specific class in `src/core/adapters/index.ts`.
- **Limited Support**: Adding a new provider requires a code change and plugin update.
- **Config Limitation**: `oh-my-opencode.json` only supports `apiKey` per provider; it ignores custom `baseUrl`.
- **Discovery**: Relies on specific API implementations for each provider.

## Desired End State

- **Universal Support**: Users can add any provider to `oh-my-opencode.json` with a `baseUrl`.
- **Dynamic Discovery**: The plugin queries the user-provided `baseUrl/models` to list available models.
- **Safety**: The `MetadataOracle` continues to verify if discovered models are free, preventing accidental costs.
- **Zero-Code Updates**: Support new providers immediately by just updating the config file.

### Key Discoveries:

- OpenRouter is unique in providing pricing via API; others do not.
- `models.dev` (via `MetadataOracle`) is our source of truth for free-tier validation.
- `src/core/scout.ts` reads the config but currently ignores unknown fields like `baseUrl`.

## What We're NOT Doing

- We are NOT removing existing specialized adapters (OpenRouter, Groq) yet, as they may have specific optimizations.
- We are NOT implementing "cost tracking" for paid models; this remains a _Free_ Fleet plugin.

## Implementation Approach

1.  **Update Types & Config Parsing**: Allow `baseUrl` in provider configuration.
2.  **Implement `GenericAdapter`**: A class that speaks standard OpenAI API.
3.  **Update Factory Logic**: Fallback to `GenericAdapter` when no specific adapter exists.
4.  **Verify**: Test with a mock local endpoint (or Ollama if available).

---

## Phase 1: Configuration & Type Updates

### Overview

Enable the system to read and pass `baseUrl` from the user's configuration.

### Changes Required:

#### 1. Update Types

**File**: `src/types/index.ts`
**Changes**: Add `baseUrl` to `ProviderConfig` interface.

```typescript
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string; // New optional field
  // ... other existing fields
}
```

#### 2. Update Scout Config Parsing

**File**: `src/core/scout.ts`
**Changes**: Update `detectActiveProviders` to capture `baseUrl` and pass it when creating adapters.

```typescript
// In detectActiveProviders:
const config = JSON.parse(configContent);
// ...
for (const providerId of uniqueProviders) {
  const providerConfig = config.providers?.[providerId] || {};
  const adapter = createAdapter(providerId, providerConfig); // Pass full config
  // ...
}
```

### Success Criteria:

#### Automated Verification:

- [x] TypeScript compiles without errors: `npm run build`
- [x] Unit test verifies `baseUrl` is correctly read from a mock config

---

## Phase 2: Generic Adapter Implementation

### Overview

Create the universal adapter class that uses standard OpenAI endpoints.

### Changes Required:

#### 1. Implement GenericAdapter Class

**File**: `src/core/adapters/index.ts`
**Changes**: Add `GenericAdapter` class implementing `ProviderAdapter`.

```typescript
class GenericAdapter implements ProviderAdapter {
  constructor(
    readonly providerId: string,
    readonly providerName: string,
    private config: { apiKey?: string; baseUrl?: string },
  ) {}

  async fetchModels(): Promise<ProviderModel[]> {
    // Default to standard OpenAI endpoint if no baseUrl provided
    const baseUrl =
      this.config.baseUrl?.replace(/\/$/, "") ||
      `https://api.${this.providerId}.com/v1`;
    const url = `${baseUrl}/models`;

    // Fetch using standard Bearer auth
    // ... implementation ...
  }

  // ... isFreeModel implementation using Oracle ...
}
```

#### 2. Update Adapter Factory

**File**: `src/core/adapters/index.ts`
**Changes**: Update `createAdapter` to use `GenericAdapter` as fallback.

```typescript
export function createAdapter(
  providerId: string,
  config: any = {},
): ProviderAdapter {
  const adapters = {
    // ... existing adapters ...
  };

  // Fallback to GenericAdapter instead of BaseAdapter
  return (
    adapters[providerId]?.() ||
    new GenericAdapter(providerId, providerId, config)
  );
}
```

### Success Criteria:

#### Automated Verification:

- [x] `npm run build` passes.
- [x] Unit tests mock a generic provider API and verify model fetching works.

#### Manual Verification:

- [x] Add a "fake" provider to `oh-my-opencode.json` with a valid `baseUrl` (e.g., pointing to OpenRouter or a local mock) and verify `/fleet-scout` discovers it.

---

## Testing Strategy

### Unit Tests:

- [x] Mock `fetch` to simulate a generic provider response.
- [x] Verify `GenericAdapter` correctly parses the standard OpenAI JSON response format.
- [x] Verify `GenericAdapter` handles 401/403 errors gracefully.

### Manual Testing Steps:

1.  Edit `~/.config/opencode/oh-my-opencode.json`.
2.  Add a test provider:
    ```json
    "providers": {
      "test-generic": {
        "apiKey": "sk-...",
        "baseUrl": "https://openrouter.ai/api/v1"
      }
    }
    ```
    _(Using OpenRouter URL as a test since we know it complies)_
3.  Run `/fleet-scout`.
4.  Verify "test-generic" appears in the output with models found.
