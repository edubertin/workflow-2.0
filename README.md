# Workflow V2

Workflow V2 e um runtime de orquestracao orientado a capacidades.

Ele parte de uma escolha arquitetural deliberada: o kernel nao conhece personas de agentes. O kernel conhece capacidades, contratos, politicas, estado, memoria, eventos e artefatos. Agentes sao executores substituiveis que declaram quais capacidades conseguem cumprir.

## Filosofia

Workflow V2 nao tenta criar um elenco de agentes-personagem.

O sistema deve funcionar mesmo quando:

- o modelo muda;
- o provedor muda;
- o executor muda;
- uma capacidade passa a ser executada por codigo, humano, modelo ou ferramenta;
- o mesmo objetivo exige multiplas capacidades encadeadas.

A fonte de verdade do trabalho nao e a conversa nem a memoria implicita do agente. A fonte de verdade sao artefatos versionaveis, eventos auditaveis, contratos claros e decisoes explicitas.

## Principios

- Capacidades sao a unidade de roteamento.
- Agentes sao executores, nao entidades centrais do dominio.
- O kernel nunca roteia por persona.
- Runtime, policies, registry, capabilities, memory, observability e artifact generation sao responsabilidades separadas.
- Artefatos sao produtos verificaveis do runtime.
- Modelos entram por adaptadores, nunca pelo centro da arquitetura.
- Contratos vem antes de implementacao.

## Estado atual

Este repositorio contem apenas documentacao arquitetural e estrutura inicial.

Ainda nao existem:

- agentes implementados;
- SDK;
- CLI;
- servidor;
- persistencia real;
- adaptadores de modelo;
- ferramentas executaveis.

## Documentos principais

- `ARCHITECTURE.md`: arquitetura revisada do Workflow V2.
- `RuntimeFlow.md`: ciclo completo de execucao do runtime.
- `contracts/CapabilityContract.md`: contrato universal de capacidade.
- `contracts/TaskEnvelope.md`: envelope de tarefa normalizada.
- `contracts/CapabilityPlan.md`: plano de capacidades para uma task.
- `contracts/ExecutionResult.md`: resultado consolidado de execucao.
- `contracts/UNIVERSAL_AGENT_CONTRACT.md`: contrato de agente como executor de capacidades.
- `kernel/artifact-generation/README.md`: formato inicial de artefatos.
- `AGENTS.md`: regras operacionais para agentes que atuarem neste repositorio.
- `kernel/README.md`: mapa das responsabilidades do kernel.

## Estrutura

```text
.
|-- AGENTS.md
|-- ARCHITECTURE.md
|-- RuntimeFlow.md
|-- contracts/
|   |-- CapabilityContract.md
|   |-- CapabilityPlan.md
|   |-- ExecutionResult.md
|   |-- TaskEnvelope.md
|   `-- UNIVERSAL_AGENT_CONTRACT.md
`-- kernel/
    |-- README.md
    |-- adapters/
    |-- artifact-generation/
    |-- capabilities/
    |-- events/
    |-- memory/
    |-- observability/
    |-- orchestration/
    |-- policies/
    |-- registry/
    |-- runtime/
    |-- scheduler/
    `-- state/
```

## Decisoes explicitas

### 1. O kernel conhece capacidades, nao agentes

O kernel resolve trabalho por `capability_id`. Agentes aparecem depois, como candidatos para executar uma capacidade. Isso reduz acoplamento e evita que a arquitetura vire uma lista fixa de personagens.

### 2. CapabilityContract e separado do AgentContract

O contrato de capacidade define o trabalho. O contrato de agente define quem pode executar. Misturar os dois tornaria dificil trocar executor sem reescrever a semantica da capacidade.

### 3. Artefatos sao fonte de verdade

Conversas ajudam a conduzir o trabalho, mas o estado duravel deve estar em artefatos: documentos, planos, diffs, relatorios, traces, manifestos e registros de decisao.

### 4. Memoria nao substitui artefato

Memoria pode recuperar contexto, preferencias e historico. Ela nao deve ser usada como unica fonte de verdade para uma decisao, entrega ou contrato.

### 5. Simplicidade antes de multiagente

O runtime deve conseguir executar uma unica capacidade com um unico executor antes de coordenar fluxos complexos. Multiagente e uma consequencia, nao o ponto de partida.

## Nao objetivos desta fase

- Implementar agentes.
- Implementar runtime executavel.
- Escolher banco, fila ou provedor de modelo.
- Criar UI.
- Definir prompt de agente.
- Criar personas.
- Publicar SDK.
