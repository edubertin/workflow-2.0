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

Este repositorio contem documentacao arquitetural, estrutura inicial e um
Walking Skeleton minimo em `kernel/runtime/walking-skeleton.ts`.

Ainda nao existem:

- agentes implementados;
- SDK;
- CLI;
- servidor;
- runtime completo;
- persistencia real;
- adaptadores de modelo;
- infraestrutura distribuida.

## Documentos principais

- `ARCHITECTURE.md`: arquitetura revisada do Workflow V2.
- `RuntimeFlow.md`: ciclo completo de execucao do runtime.
- `ExecutionEngine.md`: especificacao arquitetural do motor de execucao.
- `ExecutionStateMachine.md`: maquina de estados arquitetural do Execution Engine.
- `CommandContract.md`: contrato normativo minimo de commands.
- `EffectContract.md`: contrato normativo minimo de effects declarados.
- `RuntimeContextContract.md`: contrato normativo minimo de contexto versionado de decisao.
- `AttemptContract.md`: contrato normativo minimo de tentativas de execucao.
- `PolicyConstraintsContract.md`: contrato normativo de constraints tipadas,
  versionadas, canonicas e reproduziveis por replay.
- `ExecutorSelectionContract.md`: contrato normativo da selecao deterministica de executores.
- `RegistrySnapshotContract.md`: contrato normativo de snapshots versionados do Registry.
- `EventCatalog.md`: catalogo conceitual de eventos do runtime.
- `EventContract.md`: contrato arquitetural de eventos.
- `ArtifactEnvelope.md`: especificacao do `Artifact Envelope v0`.
- `CapabilityContract.md`: contrato semantico arquitetural de uma capability.
- `PolicyEngine.md`: especificacao arquitetural do Policy Engine.
- `Registry.md`: especificacao arquitetural do Registry.
- `contracts/CapabilityContract.md`: contrato universal inicial de capacidade.
- `contracts/TaskEnvelope.md`: envelope de tarefa normalizada.
- `contracts/CapabilityPlan.md`: plano de capacidades para uma task.
- `contracts/ExecutionResult.md`: resultado consolidado de execucao.
- `contracts/PolicyConstraintsContract.md`: shape minimo de constraint set
  tipado e versionado.
- `contracts/RegistrySnapshotContract.md`: shape minimo de snapshots do Registry.
- `contracts/EventContract.md`: contrato universal inicial de eventos.
- `contracts/UNIVERSAL_AGENT_CONTRACT.md`: contrato de agente como executor de capacidades.
- `kernel/artifact-generation/README.md`: formato inicial de artefatos.
- `AGENTS.md`: regras operacionais para agentes que atuarem neste repositorio.
- `kernel/README.md`: mapa das responsabilidades do kernel.

## Autoridade documental

Esta documentacao e normativa dentro dos limites desta fase.

Camadas de autoridade:

- `README.md` e `AGENTS.md` definem filosofia, limites e regras de trabalho no repositorio.
- `ARCHITECTURE.md` define fronteiras de responsabilidade entre componentes.
- `ExecutionStateMachine.md` e a fonte normativa para estados, transicoes, terminalidade, replay, retries, timeouts e recovery.
- `ExecutionEngine.md` e a fonte normativa para o ciclo operacional do runtime.
- `EventContract.md`, `EventCatalog.md`, `ArtifactEnvelope.md`, `CapabilityContract.md`, `CommandContract.md`, `EffectContract.md`, `RuntimeContextContract.md`, `AttemptContract.md`, `PolicyConstraintsContract.md`, `ExecutorSelectionContract.md`, `RegistrySnapshotContract.md`, `PolicyEngine.md` e `Registry.md` definem a semantica normativa dos componentes e contratos centrais.
- `contracts/*.md` define os objetos normativos minimos que uma implementacao futura deve aceitar ou produzir.
- `kernel/*/README.md` e mapa estrutural, nao substitui as especificacoes normativas acima.

Se houver conflito, a especificacao semantica raiz define o significado e o
arquivo em `contracts/` deve ser atualizado antes de implementacao. Nenhuma
implementacao futura deve escolher uma interpretacao implicita quando a
documentacao exigir identificador, versao, snapshot, evento ou artefato.

## Estrutura

```text
.
|-- AGENTS.md
|-- ARCHITECTURE.md
|-- ArtifactEnvelope.md
|-- AttemptContract.md
|-- CapabilityContract.md
|-- CommandContract.md
|-- EffectContract.md
|-- EventCatalog.md
|-- EventContract.md
|-- ExecutionEngine.md
|-- ExecutionStateMachine.md
|-- ExecutorSelectionContract.md
|-- PolicyEngine.md
|-- PolicyConstraintsContract.md
|-- Registry.md
|-- RegistrySnapshotContract.md
|-- RuntimeContextContract.md
|-- RuntimeFlow.md
|-- contracts/
|   |-- CapabilityContract.md
|   |-- CapabilityPlan.md
|   |-- EventContract.md
|   |-- ExecutionResult.md
|   |-- PolicyConstraintsContract.md
|   |-- RegistrySnapshotContract.md
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
- Implementar runtime completo.
- Escolher banco, fila ou provedor de modelo.
- Criar UI.
- Definir prompt de agente.
- Criar personas.
- Publicar SDK.
