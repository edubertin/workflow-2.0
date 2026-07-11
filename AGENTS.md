# AGENTS.md

## Projeto

Este repositorio define a arquitetura do Workflow V2.

Workflow V2 e um runtime de orquestracao orientado a capacidades. O kernel nao conhece personas de agentes; ele conhece capacidades, contratos, politicas, registry, memoria, observabilidade, estado e artefatos.

## Regras para agentes neste repositorio

- Nao implementar agentes sem pedido explicito.
- Nao implementar runtime executavel sem pedido explicito.
- Nao transformar personas em primitivas arquiteturais.
- Roteamento deve ser descrito por `capability_id`, nunca por nome de agente.
- Agentes devem ser tratados como executores substituiveis de capacidades.
- Artefatos documentais sao fonte de verdade do projeto.
- Mudancas devem preservar a separacao entre Runtime, Policies, Registry, Capabilities, Memory, Observability e Artifact Generation.
- Toda decisao do runtime deve ser deterministica e auditavel por eventos e artefatos.

## Contratos centrais

- `CapabilityContract.md`: define a semantica arquitetural de uma capability.
- `ArtifactEnvelope.md`: define o envelope de artefato como fonte de verdade.
- `EventContract.md`: define o contrato arquitetural de eventos.
- `EventCatalog.md`: define familias conceituais de eventos do runtime.
- `ExecutionStateMachine.md`: define estados, transicoes, commands, events, effects e recovery.
- `PolicyEngine.md`: define decisoes de allow, deny, allow with constraints e requires approval.
- `Registry.md`: define descoberta deterministica por capacidades e candidatos opacos.
- `contracts/CapabilityContract.md`: define o contrato universal inicial de capacidade.
- `contracts/TaskEnvelope.md`: normaliza uma intencao em tarefa.
- `contracts/CapabilityPlan.md`: traduz tarefa em capacidades.
- `contracts/ExecutionResult.md`: consolida resultado de execucao.
- `contracts/EventContract.md`: define o contrato universal inicial de eventos.
- `contracts/UNIVERSAL_AGENT_CONTRACT.md`: define agente como executor de capacidades.
- `ExecutionEngine.md`: especifica como o runtime conduz task, plano, policies, registry, executor, eventos, artefatos e resultado.

## Limites

Este repositorio ainda nao deve conter:

- SDK;
- CLI;
- servidor;
- agentes implementados;
- adaptadores de modelo;
- persistencia real;
- integracoes externas executaveis.

## Publicacao

Nao fazer commit, push, PR, merge ou mudanca externa sem pedido explicito.
