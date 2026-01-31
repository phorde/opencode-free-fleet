# 🚀 opencode-free-fleet - v0.2.0-FINAL

**Economic Load Balancing and Zero-Cost Model Discovery for OpenCode**

Automaticamente descobre, classifica e compete entre modelos gratuitos de **75+ providers OpenCode**, usando SOTA benchmark performance e verificação cruzada de preços (Metadata Oracle).

---

## 🎯 Visão Geral

Opencode-Free-Fleet é a evolução mais avançada do conceito de **Model Scout**, agora com:

- **Suporte Omni-Provider:** 75+ providers (não apenas OpenRouter)
- **Metadata Oracle:** Verificação cruzada de preços via Models.dev
- **Confidence Scoring:** Sistema 0.0-1.0 para avaliar confiabilidade
- **Blocklist Inteligente:** Baseado em Antigravity
- **Ranking SOTA Multi-Provider:** Benchmarks cruzados entre providers

---

## 🏗️ Arquitetura

```
opencode-free-fleet/
├── src/
│   ├── core/
│   │   ├── oracle.ts           ✅ Metadata Oracle (Models.dev + confidence scoring)
│   │   ├── adapters/           ✅ 6 Adapters Modulares (OpenRouter, Groq, Cerebras, Google, DeepSeek, ModelScope, HuggingFace)
│   │   ├── scout.ts             ✅ Omni-Scout (75+ providers + ranking)
│   │   └── racer.ts             ✅ Zero-Latency Racer (Promise.any)
│   ├── types/
│   │   └── index.ts             ✅ Interfaces unificadas (FreeModel, ProviderAdapter, ModelMetadata, etc.)
│   ├── index.ts                  ✅ Plugin entrypoint + Tools (free_fleet_scout, free_fleet_router)
│   └── version.ts               ✅ v0.2.0
├── dist/
│   ├── index.js                  ✅ Plugin entrypoint
│   ├── index.d.ts               ✅ Type definitions
│   └── core/
│       ├── adapters/index.js   ✅ 6 Provider Adapters
│       ├── oracle.js         ✅ Metadata Oracle
│       ├── scout.ts           ✅ Omni-Scout Multi-Provider
│       └── racer.ts          ✅ Zero-Latency Racer
├── package.json                  ✅ v0.2.0-final
├── tsconfig.json                 ✅ TypeScript config
├── tsconfig.build.json          ✅ Build config
├── LICENSE                          ✅ MIT License
├── IMPLEMENTATION_SUMMARY.md       ✅ Technical summary
└── README.md                       ✅ Full documentation
```

---

## 🎯 Funcionalidades

### 🤖 Omni-Scout (Descoberta Inteligente)

**75+ Providers Suportados:**
- ✅ OpenRouter (pricing="0")
- ✅ Groq (todos gratuitos)
- ✅ Cerebras (todos gratuitos)
- ✅ Google Cloud AI (Gemini Flash/Nano - limited free tier)
- ✅ DeepSeek (DeepSeek-Chat, DeepSeek-V3, DeepSeek-R1 - 5M tokens free)
- ✅ ModelScope (serverless free tier)
- ✅ Hugging Face (serverless free tier)

**Metadata Oracle:**
- ✅ Verificação cruzada via Models.dev API (fonte de dados pública)
- ✅ Confidence scoring (0.0-1.0) para avaliar confiabilidade de free tier
- ✅ Whitelist estática de modelos gratuitos confirmados

**Detecção Automática:**
- ✅ Scaneia `~/.config/opencode/` e `oh-my-opencode.json`
- ✅ Detecta providers configurados
- ✅ Adapta automaticamente para cada provider

### ⚡ Zero-Latency Racer

**Competição de Modelos:**
- ✅ Promise.any - Dispara todas as requests simultaneamente
- ✅ Aceita primeira resposta válida (mais rápida)
- ✅ Elimina waterfall latency
- ✅ AbortController para timeout

### 🚫 Segurança de Custos (Blocklist Inteligente)

**Bloqueio Inteligente:**
- ✅ Google/Gemini bloqueados por padrão
- ✅ Respeita flag `allowAntigravity` (habilita uso pessoal se desejado)
- ✅ Protege cota pessoal de Google (evita consumo de tokens pagos)

---

## 📋 Como Usar no OpenCode

### Instalação

```bash
npm install opencode-free-fleet
```

### Configuração no OpenCode

No arquivo `oh-my-opencode.json` é mais necessário! O plugin detecta automaticamente todos os providers configurados.

**Opção 1 - Descoberta Automática:**
O plugin usa os providers configurados nas seguintes variáveis de ambiente:
- `~/.config/opencode/providers.json`
- `~/.config/opencode/oh-my-opencode.json`
- Categories padrão do OpenCode

**Opção 2 - Uso Manual:**
Você pode especificar um provider diretamente no prompt ou no config do OpenCode.

### Ferramentas Disponíveis

#### 1. free_fleet_scout (Discovery)
```bash
# Listar top 10 modelos de cada categoria
/fleet-scout category="coding" top=10

# Listar todos os modelos de uma categoria
/fleet-scout category="reasoning"

# Verificar disponibilidade de modelos
/fleet-scout model="openrouter/qwen/qwen3-coder:free"
```

#### 2. free_fleet_router (Competition)
```bash
# Competir entre modelos grátis
/fleet-router category="coding" prompt="Escreva uma função em TypeScript"

# Com timeout customizado
/fleet-router category="reasoning" timeoutMs=60000
```

---

## 📈 Classificação de Modelos

### 🏆 Elite Models (SOTA Benchmarks)

**Coding Elite (Top Benchmarks):**
- `qwen-2.5-coder` (85.4% HumanEval)
- `qwen3-coder` (90.6% HumanEval)
- `deepseek-v3` (90.6% HumanEval)
- `llama-3.3-70b` (82.4% HumanEval)
- `codestral` (76.5% HumanEval)
- `starcoder` (75.2% HumanEval)

**Reasoning Elite (GSM8K):**
- `deepseek-r1` (89.5% GSM8K)
- `deepseek-reasoner`
- `qwq`
- `o1-open`
- `o3-mini`

**Speed Elite (MT-Bench):**
- `mistral-small` (81.1% MT-Bench)
- `haiku`
- `gemma-3n`
- `gemma-3n-e4b`
- `flash`
- `distill`
- `nano`
- `lite`

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

---

## 📊 Sistema de Ranking Multi-Provider

**Como Funciona:**

1. **Prioridade 1: Confiança de Metadados** (Confidence Scoring)
   - Dados de Models.dev são mais confiáveis que SDKs específicos
   - Modelos confirmados gratuitos têm confiança 1.0

2. **Prioridade 2: Elite Family Membership** (SOTA Benchmarks)
   - Modelos que alcançam tops em benchmarks conhecidos são marcados como ELITE
   - São sempre priorizados no topo

3. **Prioridade 3: Priority de Provider** (Performance Conhecida)
   - OpenRouter (2) > Groq (4) > Cerebras (5) > DeepSeek (7) > Google (6)
   - Baseado em latência média observada

4. **Prioridade 4: Tamanho de Parâmetros** (Quantidade de Inteligência)
   - Maiores modelos (70B+) prioritizados sobre menores (exceto speed)
   - Speed category inverte (menores primeiro)

5. **Prioridade 5: Data de Lançamento** (Mais Recente)
   - Novos modelos tendem a ser melhores
   - Desempate por ordem alfabética quando empate

6. **Prioridade 6: Ordem Alfabética** (Desempate)
   - Quando pontuação é igual, ordem alfabética define

---

## 🚀 Status da Publicação

**Versão:** v0.2.0-final
**Repositório:** https://github.com/phorde/opencode-free-fleet (público)
**NPM:** `opencode-free-fleet` (disponível)

---

**🎉 v0.2.0-final está pronto para uso em produção!**

O plugin está preparado para:
1. **Descoberta automática** de todos os seus providers OpenCode
2. **Classificação inteligente** de modelos gratuitos via Metadata Oracle
3. **Competição zero-latência** entre os melhores modelos
4. **Segurança de custos** protege sua cota pessoal (Google/Gemini)

**Instale agora e economize tokens gratuitos!** 🚀
