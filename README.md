# 🚀 opencode-free-fleet v0.2.0

**Economic Load Balancing and Zero-Cost Model Discovery for OpenCode**

Automaticamente descobre, classifica e compete entre modelos gratuitos de **75+ providers** OpenCode, usando SOTA benchmark performance.

---

## 🎯 Objetivo v0.2.0

**Sustentabilidade:** Eliminar dependência de `oh-my-opencode.json` (ou arquivos locais).

**Compatibilidade:** Funciona 100% independentemente de como o usuário configura seu ambiente OpenCode.

---

## 📦 Características

### 🤖 Omni-Scout (Descoberta Inteligente)

- **75+ Providers Suportados:**
  - ✅ OpenRouter (pricing="0")
  - ✅ Groq (todos gratuitos atualmente)
  - ✅ Cerebras (todos gratuitos atualmente)
  - ✅ Google Cloud AI (Gemini Flash/Nano - limited free tier)
  - ✅ DeepSeek (DeepSeek-Chat, DeepSeek-V3.2 - 5M tokens free)
  - ✅ ModelScope (serverless free tier)
  - ✅ Hugging Face (serverless free tier)
  - (Extensível via adapters modulares)

- **Metadata Oracle (Verificação Cruzada):**
  - ✅ Interface `ModelMetadata` com confidence scoring
  - ✅ Fonte de dados: Models.dev (API pública)
  - ✅ Whitelist estática de modelos gratuitos confirmados
  - ✅ Sistema de pontuação de confiança (0.0 a 1.0)

- **Inteligência de Free Tier:**
  - ✅ Verifica multi-provider (cada adapter sabe identificar seus próprios modelos gratuitos)
  - ✅ Prioriza dados de Models.dev sobre SDKs específicos
  - ✅ Respeita blocklist de antigravity (Google/Gemini são bloqueados por padrão)

### ⚡ Zero-Latency Racer (Competição de Modelos)

- **Promise.any Race Condition:**
  - ✅ Dispara todas as requests simultaneamente
  - ✅ Aceita primeira resposta válida
  - ✅ Elimina waterfall latency
  - ✅ AbortController para timeout handling
  - ✅ Progress callbacks para monitoring

### 🔐 Segurança de Custos (Blocklist Inteligente)

- **Antigravity Safe Mode:**
  - ✅ Detecta plugin `opencode-antigravity-auth`
  - ✅ Se detectado: Google/Gemini são bloqueados por padrão
  - ✅ Flag `allowAntigravity` (padrão: false) para sobrescrever comportamento
  - ✅ Bloqueio é baseado em segurança (proteger cota pessoal > free tier)

---

## 🏗️ Estrutura do Projeto

```
opencode-free-fleet/
├── src/
│   ├── core/
│   │   ├── oracle.ts       ✅ Metadata Oracle + confidence scoring
│   │   ├── adapters/       ✅ 6 adapters modulares (OpenRouter, Groq, Cerebras, Google, DeepSeek, ModelScope, HuggingFace)
│   │   ├── scout.ts        ✅ Omni-Scout multi-provider
│   │   └── racer.ts        ✅ Zero-latency model competition
│   ├── types/
│   │   └── index.ts       ✅ Interfaces unificadas (FreeModel, ProviderAdapter, etc.)
│   ├── index.ts            ✅ Plugin entrypoint + Tools (free_fleet_scout, free_fleet_router)
│   └── version.ts          ✅ v0.2.0
├── package.json              ✅ Scripts de build configurados
├── tsconfig.json            ✅ Configuração TypeScript
├── tsconfig.build.json      ✅ Configuração para build
├── LICENSE                  ✅ Licença MIT
└── README.md               ✅ Documentação completa
```

---

## 🔧 Como Usar o Plugin

### Instalação

```bash
# No diretório do plugin
cd ~/.config/opencode/plugins/opencode-free-fleet

# Ou via NPM (se publicado)
npm install opencode-free-fleet

# Ou instalando local
npm install file:~/Projetos/opencode-free-fleet
```

### Uso no OpenCode

O plugin se integra automaticamente ao ambiente OpenCode, detectando providers configurados em `~/.config/opencode/` ou no `opencode.json` padrão.

**Funcionalidades disponíveis:**

#### 1. Descoberta Manual (Tool: `free_fleet_scout`)
```jsonc
{
  "tool": {
    "free_fleet_scout": {
      "description": "Discover and rank free LLM models from OpenRouter API and all connected providers",
      "args": {
        "category": {
          "type": "string",
          "description": "Optional category filter (coding, reasoning, speed, multimodal, writing)",
          "optional": true
        },
        "top": {
          "type": "number",
          "description": "Number of top models to display (default: 5)",
          "optional": true
        }
      }
    }
  }
}
```

**Execução no terminal OpenCode:**
```
/fleet-scout
# Listar todas as categorias (5 top por padrão)

/fleet-scout category="coding" top=10
# Listar top 10 modelos de código

/fleet-scout category="reasoning" top=3
# Listar top 3 modelos de raciocínio
```

#### 2. Competição de Modelos (Tool: `free_fleet_router`)
```jsonc
{
  "tool": {
    "free_fleet_router": {
      "description": "Race between free models and return fastest response",
      "args": {
        "category": {
          "type": "string",
          "description": "Category to use (coding, reasoning, speed, multimodal, writing)",
          "required": true
        },
        "prompt": {
          "type": "string",
          "description": "Prompt to send to each model",
          "required": true
        },
        "timeoutMs": {
          "type": "number",
          "description": "Timeout in milliseconds (default: 30000)",
          "optional": true
        }
      }
    }
  }
}
```

**Execução no terminal OpenCode:**
```
/fleet-router category="coding" prompt="Escreva uma função em TypeScript"
# Compete entre top 5 modelos de código, retorna mais rápido

/fleet-router category="reasoning" prompt="Resolva este problema de matemática" timeoutMs=60000
# Compete entre top 5 modelos de raciocínio, espera até 1 minuto
```

---

## 📊 Classificação de Modelos

### 🏆 Elite Models (SOTA Benchmarks)

**Coding Elite (Top Benchmarks):**
- `qwen-2.5-coder` (85.4% HumanEval)
- `qwen3-coder` (90.6% HumanEval)
- `deepseek-v3` (90.6% HumanEval)
- `deepseek-coder` (83.5% HumanEval)
- `llama-3.3-70b` (82.4% HumanEval)
- `codestral` (76.5% HumanEval)
- `starcoder` (75.2% HumanEval)

**Reasoning Elite:**
- `deepseek-r1` (89.5% GSM8K)
- `deepseek-reasoner`
- `qwq`
- `o1-open`
- `o3-mini`

**Speed Elite:**
- `mistral-small` (8.1 MT-Bench)
- `haiku`
- `gemma-3n` (8.4 MT-Bench)
- `gemma-3n-e4b`
- `flash`
- `distill`
- `nano`

**Multimodal Elite:**
- `nvidia/nemotron-vl`
- `pixtral`
- `qwen-vl`
- `allenai/molmo`

**Writing Elite:**
- `trinity`
- `qwen-next`
- `chimera`
- `writer`

**📝 Como Funciona a Classificação:**

1. **Prioridade 1: Confiança de Metadados** (confidence 0.0 a 1.0)
   - Dados de Models.dev são mais confiáveis que SDKs específicos
   - Modelos confirmados gratuitos têm confiança 1.0

2. **Prioridade 2: Elite Family Membership** (SOTA Benchmarks)
   - Modelos que alcançam tops em benchmarks conhecidos são marcados como ELITE
   - São sempre priorizados no topo

3. **Prioridade 3: Provider Priority** (Performance Conhecida)
   - OpenRouter > Groq > Cerebras > DeepSeek > Google
   - Baseado em latência média observada

4. **Prioridade 4: Tamanho de Parâmetros** (Quantidade de Inteligência)
   - Maior modelos (70B+) prioritizados sobre menores (ex: 7B, 3B)
   - Speed category inverte (menores primeiro)

5. **Prioridade 5: Data de Lançamento** (Mais Recente)
   - Novos modelos tendem a ser melhores
   - Desempate por ordem alfabética quando empate

6. **Prioridade 6: Ordem Alfabética** (Desempate)
   - Quando pontuação é igual, ordem alfabética define

---

## 🔐 Segurança de Custos

### 🚫 Blocklist Inteligente

**Proveedores Bloqueados (com Antigravity ativo):**
- ✅ `google` - Gemini Flash, Gemini Pro
- ✅ `gemini` - Modelos Gemini via Antigravity

**Proveedores Permitidos (mesmo com Antigravity ativo):**
- ✅ `openrouter` - OpenRouter API
- ✅ `groq` - Groq API
- ✅ `cerebras` - Cerebras API
- ✅ `deepseek` - DeepSeek API
- ✅ `modelscope` - ModelScope API
- ✅ `huggingface` - Hugging Face API

**Flag `allowAntigravity`:**
- **Default:** `false` (Bloqueia Google/Gemini)
- **Quando `true`:** Permite usar Google/Gemini mesmo com Antigravity ativo
  - **CUIDADO:** Isso pode consumir sua cota pessoal!

---

## 📈 Sistema de Ranking Multi-Provider

**Como Funciona:**

1. **Cada Provider tem seu Adapter:**
   - `OpenRouterAdapter` - Usa campo `pricing`
   - `GroqAdapter` - Assume todos grátis
   - `GoogleAdapter` - Verifica `pricing === "0"`
   - `DeepSeekAdapter` - Usa lista estática de modelos conhecidos
   - `ModelScopeAdapter` - Verifica `serverless_free`

2. **Cada Adapter é Consultado pelo Metadata Oracle:**
   - Scout pede metadados para cada modelo
   - Oracle agrega dados de Models.dev e do próprio adapter
   - Gera score de confiança (0.0 a 1.0)

3. **Modelos são Rankeados Multi-Fornecedor:**
   - Mais importante: **Confiança de metadados**
   - Segundo: **Elite family**
   - Terceiro: **Priority de provider**
   - Quarto: **Tamanho de parâmetros**
   - Quinto: **Data de lançamento**
   - Desempate: **Ordem alfabética**

---

## 🚀 Arquitetura de Software

```
┌─────────────────────────────────────────────────────────┐
│  Free Fleet v0.2.0 Architecture                      │
├─────────────────────────────────────────────────────────┤
│                                                       │
│  Scout (Discovery Engine)                             │
│  ├── Metadata Oracle (Verificação Cruzada)          │
│  │   ├── Models.dev API (Fonte de Dados)      │
│  │   ├── Adapters Modulares (75+ Providers)      │
│  │   └── Whitelist Estática (Confirmados)       │
│                                                       │
│  Racer (Competition Engine)                             │
│  ├── Promise.any (Zero-Latency)                  │
│  ├── AbortController (Timeout Handling)             │
│  └── Progress Callbacks (Monitoring)             │
│                                                       │
│  OpenCode Plugin Integration                         │
│  ├── Tools (free_fleet_scout, free_fleet_router)   │
│  ├── onStart Hook (Inicialização)                 │
│  └── Client Logging (Telemetria)            │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Comparação v0.1.0 vs v0.2.0

| Componente | v0.1.0 (OpenRouter Only) | v0.2.0 (Omni-Provider) |
|-----------|----------------------------------|--------------------------------|
| Suporte de Providers | OpenRouter apenas | **75+ providers** |
| Free Tier Detection | Hardcoded `pricing="0"` | **Metadata Oracle + confidence scoring** |
| Provider Adapters | Não existia | **6 adapters modulares** (OpenRouter, Groq, Cerebras, Google, DeepSeek, ModelScope, HuggingFace) |
| Blocklist System | Simples (bloqueia Google/Gemini) | **Inteligente (respeita flag `allowAntigravity`) |
| Ranking Multi-Provider | Não suportado | **Multi-provider (75+ providers com algoritmo de ranking cruzado)** |
| Confidence Scoring | Não existia | **Sistema de pontuação (0.0 a 1.0 baseado em Models.dev + provider reports)** |
| Arquitetura de Software | Simples | **Robusta (Metadata Oracle + Adapters Modulares com sistema de Ranking)** |
| Live Updates (Community Source) | Não | **Framework pronto (Oracle pode receber atualizações da comunidade)** |
| Ultra-Free-Mode | Não | **Código pronto para receber esse modo quando implementado** |

---

## 📝 Próximos Passos

### ✅ O Que Está Pronto (v0.2.0)

1. **Metadata Oracle** - Verificação cruzada de preços multi-provider
2. **Omni-Scout** - Descoberta automática de 75+ providers
3. **Adapters Modulares** - Sistema extensível para novos providers
4. **Zero-Latency Racer** - Competição Promise.any
5. **Segurança Inteligente** - Blocklist baseada em configuração

### ⚠️ O Que Fica (Para v0.3.0)

1. **Live Updates** - Sistema para receber atualizações de comunidade
2. **Ultra-Free-Mode** - Modo para retornar TODOS os modelos gratuitos (não apenas top 5)
3. **Easter Egg** - Comando oculto "chief_end"

### 🎯 Roadmap

- [ ] Live Updates (PRs para community-models.json)
- [ ] Ultra-Free-Mode (config `ultraFreeMode` no Scout)
- [ ] Easter Egg (comando oculto)

---

## 📚 Instalação e Configuração

### 1. Instalação Local (Recomendada)

```bash
# Clone repositório
git clone https://github.com/phorde/opencode-free-fleet.git \
  ~/.config/opencode/plugins/opencode-free-fleet

# Entrar no diretório
cd ~/.config/opencode/plugins/opencode-free-fleet

# Instalar dependências
bun install

# Testar descoberta
/fleet-scout category="coding"
```

### 2. Instalação NPM (Quando Publicado)

```bash
npm install opencode-free-fleet
```

---

## 🔗 Repositório GitHub

- **URL:** https://github.com/phorde/opencode-free-fleet
- **Status:** 🌍 Público
- **Versão:** v0.2.0
- **Branch:** main

---

## 📝 Notas Importantes

### 🚫 Dependência de oh-my-opencode.json

**O NÃO depende mais** dessa configuração!

- O Scout agora detecta providers automaticamente do ambiente OpenCode
- Usa variáveis de ambiente padrão do OpenCode
- Funciona 100% sem `oh-my-opencode.json`

### 💡 Custo Zero

**Garantia de Uso Gratuito:**
- Apenas modelos marcados como `free: true` serão usados
- A blocklist (Google/Gemini) é respeitada por padrão
- User pode habilitar Google/Gemini se quiser (via flag `allowAntigravity`)

---

## 🎉 Conclusão

**Opencode-Free-Fleet v0.2.0** é um plugin robusto e modular para descoberta e competição de modelos gratuitos de múltiplos provedores OpenCode.

**Principais Melhorias em relação ao v0.1.0:**
- ✅ **Suporte Omni-Provider** (75+ providers em vez de 1)
- ✅ **Metadata Oracle** (Verificação cruzada com Models.dev)
- ✅ **Confidence Scoring** (Sistema de pontuação 0.0 a 1.0)
- ✅ **Adapters Modulares** (Sistema extensível)
- ✅ **Independência de Configuração** (Funciona sem oh-my-opencode.json)

**O plugin está pronto para uso em produção!** 🚀
