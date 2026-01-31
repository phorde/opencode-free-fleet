# PRD.md - Product Requirements Document
## OpenCode Free Fleet: Sistema de Orquestração Inteligente de Modelos LLM

**Versão:** 1.0  
**Status:** Living Document  
**Última Atualização:** 31 de Janeiro de 2026  
**Proprietário:** Phorde Development Team

***

## 1. Visão Geral do Produto

### 1.1 Propósito
O **OpenCode Free Fleet** é uma infraestrutura de inteligência para descoberta, validação e orquestração de modelos de linguagem (LLMs) gratuitos, operando como sistema híbrido composto por:
1. **Plugin OpenCode** - Interface de usuário e orquestração em tempo de execução
2. **Fleet Intelligence Service** (futuro) - Daemon standalone para descoberta e validação contínua

### 1.2 Problema Resolvido
Desenvolvedores enfrentam três desafios críticos ao trabalhar com LLMs:
1. **Descoberta fragmentada:** Modelos gratuitos estão dispersos em 75+ provedores com políticas inconsistentes
2. **Risco financeiro:** Impossibilidade de distinguir tiers gratuitos de pagos programaticamente
3. **Performance imprevisível:** Ausência de métricas comparativas entre modelos

### 1.3 Proposta de Valor
- **Segurança financeira:** Classificação rigorosa baseada em múltiplas fontes de verdade (safety-first)
- **Performance otimizada:** Competição em tempo real entre modelos (zero-latency racing)
- **Inteligência de mercado:** Descoberta autônoma de políticas de precificação via scraping documental

***

## 2. Estado Atual da Aplicação (v0.4.0)

### 2.1 Arquitetura Implementada

#### 2.1.1 Componentes Core
**MetadataOracle** (`src/core/oracle.ts`)
- Agregação de metadados de múltiplas fontes
- Integração com Models.dev API
- Sistema de confiança (confidence scoring: 0.0 - 1.0)
- Whitelist estática de modelos confirmados como gratuitos

**Scout** (`src/core/scout.ts`)
- Descoberta multi-provedor (75+ providers suportados)
- Detecção automática via parsing de `oh-my-opencode.json`
- Categorização funcional (coding, reasoning, speed, multimodal, writing)
- Ranking baseado em benchmarks SOTA (HumanEval, GSM8K, MT-Bench, MMMU)

**ProviderAdapters** (`src/core/adapters/index.ts`)
- Sistema modular de adaptadores específicos por provedor
- 7 adaptadores implementados: OpenRouter, Groq, Cerebras, Google, DeepSeek, ModelScope, HuggingFace
- Lógica de detecção de tier gratuito específica por provedor

**Racer** (`src/core/racer.ts`)
- Competição paralela via `Promise.any()`
- Timeout configurável (padrão: 30s)
- Callbacks de progresso para monitoramento

#### 2.1.2 Funcionalidades Disponíveis
**Task Delegation System** (v0.4.0)
- Detecção automática de 10 tipos de tarefa (code_generation, code_review, debugging, reasoning, math, writing, summarization, translation, multimodal, general)
- Roteamento inteligente para categorias apropriadas
- Modos de delegação: `ultra_free`, `SOTA_only`, `balanced`

**Metrics Engine** (v0.4.0)
- Taxa de sucesso por modelo
- Latência média por modelo
- Tokens economizados (baseline: $3/1M tokens - taxa Claude Sonnet)
- Persistência em `~/.config/opencode/fleet-metrics.json`

**Comandos de Plugin**
- `/fleet-scout` - Descoberta de modelos gratuitos
- `/fleet-router` - Competição entre modelos
- `/fleet-config` - Configuração de modos de operação
- `/fleet-mode` - Alteração rápida de modo
- `/fleet-status` - Exibição de métricas e configuração
- `/fleet-delegate` - Delegação manual de tarefas

### 2.2 Limitações Conhecidas
1. **Ausência de cache persistente:** Metadados refechados a cada inicialização
2. **Validação estática:** Não há validação em tempo de execução de mudanças em políticas
3. **Scraping manual:** Descoberta de novos provedores requer atualização manual do código
4. **Monolítico:** Todo processamento ocorre no processo do plugin

***

## 3. Evolução Arquitetural Proposta

### 3.1 Princípios de Design

#### 3.1.1 Safety-First (Segurança por Design)
**Matriz de Risco Assimétrica:**
- Falso Negativo (bloquear modelo gratuito): Impacto = Redução de opções (aceitável)
- Falso Positivo (usar modelo pago): Impacto = Custo financeiro + quebra de confiança (inaceitável)

**Regra de Ouro:** Na dúvida, bloqueie.

#### 3.1.2 Separation of Concerns (Separação de Responsabilidades)
**Plugin Layer:**
- Integração com OpenCode
- Orquestração de inferência
- Interface de usuário (comandos)

**Intelligence Layer:**
- Descoberta de políticas (scraping)
- Validação de metadados
- Gestão de cache

### 3.2 Componentes Propostos

#### 3.2.1 Enhanced MetadataOracle
**Novas Capacidades:**
- Cache persistente em disco (`~/.config/opencode/cache/opencode-free-fleet-metadata.json`)
- TTL configurável (padrão: 6h)
- Estratégia de *stale-while-revalidate* para resiliência offline
- Taxonomia de custo: `CONFIRMED_FREE`, `FREEMIUM_LIMITED`, `UNKNOWN`, `CONFIRMED_PAID`

**Hierarquia de Fontes:**
1. APIs de catálogo dos provedores (fonte autoritativa)
2. Models.dev API (fonte agregadora)
3. Heurísticas de nomenclatura (fonte terciária)

#### 3.2.2 PolicyScraperOrchestrator (Novo)
**Responsabilidade:** Descoberta autônoma de políticas de precificação

**Estratégia de Scraping:**
1. **Localização de URLs:** Heurísticas para encontrar páginas de pricing (`/pricing`, `/docs/free-tier`, `/models`)
2. **Parsing HTML/Markdown:** Extração de tabelas, listas e seções com palavras-chave
3. **Interpretação Estruturada:** Transformação de texto livre em objetos JSON estruturados

**Exemplo de Transformação:**
- Input: "Groq offers free access to Llama 3.1 8B with limits of 30 requests/minute"
- Output: 
  ```json
  {
    "modelPattern": "llama-3.1-8b",
    "tier": "CONFIRMED_FREE",
    "freeQuota": {
      "requestsPerMinute": 30,
      "resetWindow": "minute"
    }
  }
  ```

**Cache de Políticas:**
- Localização: `~/.config/opencode/cache/provider-policies.json`
- TTL: 7 dias (menos volátil que modelos individuais)
- Estrutura por provedor com metadados de última validação

#### 3.2.3 Fleet Intelligence Service (Daemon Standalone)
**Arquitetura:**
- Processo independente executando como serviço de sistema
- API REST local (`localhost:7749`)
- Comunicação via HTTP entre plugin e daemon

**Endpoints Propostos:**
- `GET /api/v1/models/{providerId}/{modelId}` - Metadados enriquecidos
- `GET /api/v1/providers/{providerId}/policy` - Política de precificação
- `POST /api/v1/providers/{providerId}/refresh` - Force refresh sob demanda
- `GET /api/v1/health` - Status e última atualização

**Vantagens:**
1. Processamento assíncrono (scraping não bloqueia editor)
2. Cache sempre atualizado (independente de uso do plugin)
3. Compartilhamento entre múltiplas instâncias
4. Testabilidade isolada

#### 3.2.4 Ultra Free Mode (Enhanced)
**Critério Rigoroso:**
- Apenas modelos com `tier === CONFIRMED_FREE`
- Confidence score ≥ 0.9
- Validação por múltiplas fontes

**Comportamento:**
- Descarte silencioso de modelos incertos
- Logging de razões de bloqueio para debug
- Notificação ao usuário sobre modelos excluídos

***

## 4. Casos de Uso

### 4.1 Desenvolvedor Individual
**Cenário:** Desenvolvedor deseja usar LLMs sem custo
1. Instala plugin OpenCode
2. Sistema detecta provedores configurados
3. Descobre automaticamente modelos gratuitos
4. Ativa modo `ultra_free` para garantia de custo zero
5. Utiliza `/fleet-delegate` para tarefas de código

**Resultado:** Acesso a 20+ modelos gratuitos com garantia de custo zero

### 4.2 Equipe de Desenvolvimento
**Cenário:** Equipe compartilha configuração de LLMs
1. Administrador instala Fleet Intelligence Service como daemon
2. Múltiplos desenvolvedores conectam plugins ao daemon compartilhado
3. Daemon mantém cache centralizado de políticas
4. Equipe recebe alertas sincronizados sobre mudanças em tiers

**Resultado:** Consistência de configuração + economia de scraping redundante

### 4.3 Pesquisador Acadêmico
**Cenário:** Pesquisador explora capacidades de múltiplos modelos
1. Usa modo `balanced` para maior diversidade
2. `/fleet-status` exibe métricas de performance por modelo
3. Exporta dados de `fleet-metrics.json` para análise
4. Publica comparativo de modelos gratuitos

**Resultado:** Dataset de benchmarks reais de uso

### 4.4 Integrador de Terceiros
**Cenário:** Desenvolvedor de outro editor quer usar inteligência
1. Fleet Intelligence Service expõe API REST
2. Plugin para VSCode/Cursor consome mesma inteligência
3. Compartilha descobertas com ecossistema

**Resultado:** Infraestrutura compartilhada entre ferramentas

***

## 5. Requisitos Funcionais

### 5.1 Alta Prioridade (v0.5.0 - Q2 2026)

**FR-001: Cache Persistente de Metadados**
- Sistema DEVE persistir metadados em disco
- TTL configurável por tipo de dado (modelos: 6h, políticas: 7 dias)
- Fallback para cache stale em caso de falha de rede

**FR-002: Taxonomia de Custo**
- Classificação em 4 tiers: CONFIRMED_FREE, FREEMIUM_LIMITED, UNKNOWN, CONFIRMED_PAID
- Confidence score obrigatório para todos os modelos
- Threshold de 0.9 para modo ultra_free

**FR-003: Scraping de Políticas**
- Descoberta automática de páginas de pricing via heurísticas
- Parsing de HTML/Markdown para extrair metadados
- Persistência em cache de políticas por provedor

### 5.2 Média Prioridade (v0.6.0 - Q3 2026)

**FR-004: Fleet Intelligence Service (Daemon)**
- Processo standalone executável como serviço
- API REST em localhost
- Plugin com fallback para modo direto se daemon indisponível

**FR-005: Monitoramento de Mudanças**
- Detecção de alterações em políticas de provedores
- Notificações ao usuário sobre modelos que mudaram de tier
- Histórico de mudanças em log estruturado

**FR-006: CLI Tools**
- `fleet-intelligence list-free-models` - Lista todos os modelos gratuitos
- `fleet-intelligence scrape <provider> --force` - Force refresh
- `fleet-intelligence export --format json` - Exporta políticas

### 5.3 Baixa Prioridade (v1.0.0 - Q4 2026)

**FR-007: Central Intelligence Hub**
- Serviço opcional na nuvem para agregação comunitária
- Opt-in para compartilhar descobertas anonimizadas
- CDN para distribuição de políticas validadas

**FR-008: Integração com Outros Editores**
- API pública documentada para terceiros
- SDKs para VSCode, Cursor, Zed
- Exemplos de integração

***

## 6. Requisitos Não-Funcionais

### 6.1 Performance
**NFR-001:** Inicialização do plugin < 2s (com cache quente)
**NFR-002:** Scraping de provedor individual < 10s
**NFR-003:** Resposta de API do daemon < 50ms (cache hit)

### 6.2 Confiabilidade
**NFR-004:** Disponibilidade de cache stale mesmo offline (99.9%)
**NFR-005:** Graceful degradation se daemon indisponível
**NFR-006:** Zero perda de dados em crashes (persistência atômica)

### 6.3 Segurança
**NFR-007:** API do daemon apenas em localhost (sem exposição de rede)
**NFR-008:** Validação de dados scraped antes de persistência
**NFR-009:** Sanitização de URLs antes de fetch

### 6.4 Manutenibilidade
**NFR-010:** Cobertura de testes ≥ 80%
**NFR-011:** Documentação inline para todos os métodos públicos
**NFR-012:** Changelog semântico (Conventional Commits)

***

## 7. Roadmap de Implementação

### 7.1 Fase 1: Fundação de Dados (v0.5.0) - 4 semanas
**Objetivos:**
- Implementar cache persistente
- Adicionar taxonomia de custo
- Criar PolicyScraperOrchestrator básico

**Entregáveis:**
- MetadataOracle com cache em disco
- Tipos TypeScript para CostTier/CostProfile
- Scraper funcional para 3 provedores principais (OpenRouter, Groq, Cerebras)

### 7.2 Fase 2: Ultra Free Estrito (v0.5.1) - 2 semanas
**Objetivos:**
- Implementar filtragem rigorosa
- Adicionar logging de bloqueios
- Documentar critérios de segurança

**Entregáveis:**
- `isUltraFreeSafe()` com threshold 0.9
- Dashboard de modelos bloqueados (`/fleet-blocked`)
- Documentação de safety-first

### 7.3 Fase 3: Daemon Standalone (v0.6.0) - 6 semanas
**Objetivos:**
- Extrair lógica de scraping para serviço separado
- Implementar API REST
- Criar instaladores de sistema

**Entregáveis:**
- `opencode-fleet-intelligence` como binário standalone
- API REST com 4 endpoints principais
- Systemd unit file + Homebrew formula

### 7.4 Fase 4: Ecossistema (v1.0.0) - 8 semanas
**Objetivos:**
- Documentar API pública
- Implementar Central Intelligence Hub
- Criar SDKs para terceiros

**Entregáveis:**
- API documentation (OpenAPI 3.0)
- Hub opcional na nuvem
- Exemplos de integração para VSCode

***

## 8. Métricas de Sucesso

### 8.1 Métricas de Produto
**M-001:** Número de modelos gratuitos descobertos (objetivo: > 50)
**M-002:** Taxa de falsos positivos (objetivo: < 0.1%)
**M-003:** Uptime do daemon (objetivo: > 99.5%)

### 8.2 Métricas de Usuário
**M-004:** Tempo médio para primeira inferência bem-sucedida (objetivo: < 30s)
**M-005:** Taxa de retenção semanal de usuários (objetivo: > 70%)
**M-006:** NPS (Net Promoter Score) (objetivo: > 50)

### 8.3 Métricas Técnicas
**M-007:** Cobertura de testes (objetivo: > 80%)
**M-008:** Tempo médio de build (objetivo: < 1min)
**M-009:** Tamanho de bundle do plugin (objetivo: < 500KB)

***

## 9. Considerações de Segurança

### 9.1 Threat Model
**T-001: Envenenamento de Cache**
- Mitigação: Validação de schema JSON antes de persistência
- Sanitização de dados scraped

**T-002: Scraping Malicioso**
- Mitigação: Whitelist de domínios permitidos para scraping
- User-Agent honesto identificando o projeto

**T-003: API Abuse**
- Mitigação: Rate limiting interno no daemon
- Exponential backoff em caso de 429

### 9.2 Privacy
**P-001:** Nenhuma telemetria sem opt-in explícito
**P-002:** Dados de usuário nunca saem da máquina local (exceto opt-in para Hub)
**P-003:** Cache não contém informações identificáveis

***

## 10. Dependências e Integrações

### 10.1 Dependências Externas
- **OpenCode Plugin System:** `@opencode-ai/plugin` (peer dependency)
- **Models.dev API:** `https://models.dev/api/v1/models` (pública, sem auth)
- **Provider APIs:** APIs públicas de catálogo (OpenRouter, Groq, etc.)

### 10.2 Integrações Propostas
- **Systemd:** Para gerenciamento do daemon no Linux
- **Homebrew:** Distribuição no macOS
- **Chocolatey:** Distribuição no Windows
- **Docker:** Container opcional para deployment isolado

***

## 11. Questões em Aberto

**Q-001:** Qual linguagem para o daemon standalone? (Python vs Go vs Rust)
- **Contexto:** Python facilita scraping, Go gera binário standalone, Rust máxima performance
- **Decisão pendente:** Prototipar em Python, migrar para Go se necessário

**Q-002:** Como lidar com quotas dinâmicas? (ex: Groq muda limite de 30→60 req/min)
- **Contexto:** Scraping pode ficar desatualizado rapidamente
- **Decisão pendente:** Implementar runtime check opcional via headers HTTP

**Q-003:** Central Hub deve ser open-source?
- **Contexto:** Infraestrutura na nuvem tem custos
- **Decisão pendente:** Avaliar modelo freemium (self-hosted grátis, managed pago)

***

## 12. Glossário

**Confidence Score:** Métrica numérica (0.0-1.0) representando certeza sobre classificação de custo de um modelo

**Cost Tier:** Categoria de precificação (CONFIRMED_FREE, FREEMIUM_LIMITED, UNKNOWN, CONFIRMED_PAID)

**Elite Family:** Conjunto de modelos com performance SOTA em benchmarks específicos (ex: Qwen Coder na categoria coding)

**Safety-First:** Princípio de design onde incerteza resulta em bloqueio preventivo

**Stale-While-Revalidate:** Estratégia de cache onde dados expirados são servidos enquanto atualização ocorre em background

**TTL (Time-To-Live):** Duração que dados em cache são considerados válidos antes de necessitarem revalidação

**Ultra Free Mode:** Modo operacional onde apenas modelos com garantia de custo zero são utilizados

***

## 13. Apêndices

### A. Taxonomia Completa de Cost Tiers
| Tier | Definição | Exemplo |
|------|-----------|---------|
| CONFIRMED_FREE | Pricing explicitamente 0 em múltiplas fontes | Groq Llama 3.1 8B |
| FREEMIUM_LIMITED | Gratuito até quota conhecida | OpenRouter com 10 req/day free |
| UNKNOWN | Dados insuficientes ou conflitantes | Modelo novo sem metadata |
| CONFIRMED_PAID | Pricing > 0 em fonte autoritativa | Claude 3.5 Sonnet |

### B. Provider Adapters Implementados
| Provider | Método de Detecção | Confiança |
|----------|-------------------|-----------|
| OpenRouter | API campo `pricing.prompt === "0"` | 0.95 |
| Groq | Todos modelos gratuitos (policy atual) | 0.90 |
| Cerebras | Whitelist estática | 0.85 |
| Google | Gemini Flash/Nano (documentado) | 0.90 |
| DeepSeek | Whitelist estática | 0.85 |
| ModelScope | Serverless free tier | 0.70 |
| HuggingFace | Serverless free tier | 0.70 |

### C. Benchmark Families (Elite)
**Coding:** Qwen Coder (85.4% HumanEval), DeepSeek Coder (83.5%)
**Reasoning:** DeepSeek R1 (89.5% GSM8K), QWQ
**Speed:** Mistral Small (81.1% MT-Bench), Gemini Flash
**Multimodal:** Nemotron VL, Qwen VL

***

**Documento Vivo:** Este PRD será atualizado conforme feedback de usuários e evolução tecnológica do ecossistema LLM.

**Contato:** phorde@hotmail.com  
**Repositório:** [https://github.com/phorde/opencode-free-fleet](https://github.com/phorde/opencode-free-fleet)