# RuntimeContextContract

Versao: `0.1.0-draft`

Este documento define a especificacao normativa minima de `RuntimeContext` no
Workflow V2.

Runtime Context e o conjunto fechado de referencias versionadas disponiveis
para a State Machine avaliar um command e declarar eventos ou effects de forma
deterministica.

Runtime Context nao e memoria, nao e storage, nao e event store, nao e
executor, nao e policy, nao e Registry e nao e infraestrutura.

Nao ha implementacao, pseudocodigo, SDK, CLI, API, transporte, storage,
framework, banco ou servidor nesta especificacao.

## Objetivo

`RuntimeContextContract` existe para impedir decisoes implicitas.

Ele define:

- identidade do contexto;
- versionamento;
- escopo de trace e task;
- estado reconstruido usado pela decisao;
- command avaliado;
- inputs versionados disponiveis;
- referencias de eventos;
- controles deterministicas minimos;
- limites do que nao pode influenciar uma decisao.

## Definicao

Um Runtime Context e uma fotografia logica dos inputs autorizados e
versionados que podem influenciar uma decisao da State Machine.

Ele deve ser suficiente para responder:

- qual command esta sendo avaliado;
- qual estado foi reconstruido antes da avaliacao;
- quais eventos sustentam esse estado;
- quais contratos, snapshots, artefatos e decisoes estavam disponiveis;
- quais valores deterministicas foram usados para ids, timestamps logicos ou
  ordenacao quando isso afetar replay.

## Responsabilidade

O Runtime Context deve:

- preservar `trace_id` e `task_id`;
- referenciar o command em avaliacao;
- declarar a versao da State Machine;
- declarar estado atual reconstruido por eventos;
- listar inputs decisivos por id e versao ou snapshot;
- listar eventos usados para reconstruir estado;
- fornecer controles deterministicas minimos;
- excluir memoria implicita, prompts, modelos e estado `latest`;
- permitir que a mesma decisao seja reproduzida historicamente.

O Runtime Context nao deve:

- executar commands;
- declarar effects;
- emitir eventos;
- consultar Registry;
- avaliar policy;
- executar capability;
- armazenar artefatos;
- substituir event stream;
- substituir `TaskEnvelope`, `CapabilityPlan` ou `ExecutionResult`.

## Campos obrigatorios

Todo Runtime Context deve conter:

```yaml
runtime_context_version: "0.1.0"
runtime_context_id: "runtime_context_ulid_or_uuid"
trace_id: "trace_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
created_at: "iso-8601"
state_machine:
  id: "execution_state_machine"
  version: "0.1.0-draft"
current_state:
  state: "state_name"
  version: "state_machine_version_or_snapshot"
command_ref:
  command_id: "command_ulid_or_uuid"
  command_version: "0.1.0"
event_stream_ref:
  last_event_id: "event_id_or_null"
  last_sequence_number: 0
input_refs:
  - kind: "task|plan|capability_contract|policy_decision|registry_snapshot|artifact|event|executor_metadata|runtime_context"
    id: "input_id"
    version: "input_version_or_snapshot"
determinism:
  logical_time: "iso-8601"
  id_namespace: "stable_namespace"
  ordering_rule: "ordering_rule_id"
```

Este formato e conceitual e normativo. Ele nao define schema executavel.

## Campos condicionais

### policy_refs

Obrigatorio quando a decisao depende de policy.

```yaml
policy_refs:
  - policy_id: "policy_id"
    policy_version: "policy_version"
    decision_id: "policy_decision_id_or_null"
    decision_version: "policy_decision_version_or_null"
```

### registry_refs

Obrigatorio quando a decisao depende de Registry.

```yaml
registry_refs:
  - registry_snapshot_id: "registry_snapshot_id"
    registry_snapshot_version: "0.1.0"
```

### artifact_refs

Obrigatorio quando a decisao depende de artefato.

```yaml
artifact_refs:
  - artifact_id: "artifact_id"
    artifact_version: "0.1.0"
    relation: "input|output|validation_target|decision_evidence"
```

### executor_refs

Obrigatorio quando a decisao depende de metadados de executor.

```yaml
executor_refs:
  - executor_id: "opaque_executor_id"
    metadata_version: "executor_metadata_version"
```

## Estado reconstruido

`current_state` deve ser derivado por replay de eventos do `trace_id`.
Ele e uma projecao para avaliacao, nunca a fonte de verdade operacional.

Regras:

- a fonte de verdade operacional continua sendo o stream de eventos;
- estado atual nao pode ser lido de fonte `latest` sem eventos;
- `event_stream_ref` deve indicar o ultimo evento considerado;
- se nenhum evento existir, `last_event_id` pode ser nulo e
  `last_sequence_number` deve refletir inicio logico;
- divergencia entre estado materializado e replay deve bloquear a decisao;
- Runtime Context nao corrige eventos faltantes.

## Inputs versionados

Todo input decisivo deve estar em `input_refs`.

Tipos iniciais:

- `task`;
- `plan`;
- `capability_contract`;
- `policy_decision`;
- `registry_snapshot`;
- `artifact`;
- `event`;
- `executor_metadata`;
- `runtime_context`.

Regras:

- cada input deve ter `id`;
- cada input deve ter `version` ou snapshot;
- input informativo nao pode determinar command, effect, evento ou resultado;
- ausencia de input decisivo deve bloquear a transicao;
- Runtime Context nao pode depender de memoria implicita.

## Controles deterministicas

`determinism` define valores minimos que removem dependencia de ambiente.

Semantica:

- `logical_time` e o tempo logico usado para decisions e objetos derivados;
- `id_namespace` e a raiz estavel para derivar identidades deterministicas;
- `ordering_rule` identifica a regra de ordenacao aplicada quando houver lista
  de candidatos, inputs ou artefatos.

Regras:

- decisao nao pode depender de relogio de parede sem `logical_time`;
- decisao nao pode depender de ordem de iteracao sem `ordering_rule`;
- decisao nao pode gerar ids comparaveis entre execucoes sem `id_namespace`;
- controles deterministicas devem ser tratados como inputs versionados da
  decisao.

## Relacao com CommandContract

Runtime Context e o contexto usado para avaliar um command.

Regras:

- todo Runtime Context deve referenciar exatamente um command;
- command deve referenciar Runtime Context quando este for input decisivo;
- `expected_state` do command deve ser validado contra `current_state`;
- `input_refs` do command devem estar contidos ou explicados pelo Runtime
  Context;
- Runtime Context nao altera semantica do command.

## Relacao com EffectContract

Effects devem ser declarados a partir de Runtime Context versionado.

Regras:

- effect deve referenciar Runtime Context quando ele influenciar sua
  declaracao;
- effect nao pode introduzir input decisivo ausente do Runtime Context;
- side effects permitidos devem ser verificaveis a partir de task, capability,
  policy e Runtime Context.

## Relacao com EventContract

Eventos registram fatos. Runtime Context preserva inputs de decisao.

Regras:

- eventos decisivos devem referenciar Runtime Context ou seus inputs
  versionados;
- Runtime Context nao substitui evento;
- replay reconstrui estado por eventos e usa Runtime Context para explicar a
  decisao tomada naquele ponto;
- evento nao deve embutir Runtime Context completo se referencias forem
  suficientes.

## Relacao com contratos centrais

### TaskEnvelope

Runtime Context deve referenciar `task_id` e `task_version` ou snapshot quando
task influenciar decisao.

### CapabilityPlan

Runtime Context deve referenciar `plan_id` e `plan_version` quando plano
existir e influenciar decisao.

### CapabilityContract

Runtime Context deve referenciar `capability_id` e `capability_version` quando
capability influenciar decisao.

### PolicyEngine

Runtime Context deve referenciar policy id, policy version e policy decision
quando policy influenciar decisao.

### Registry

Runtime Context deve referenciar Registry snapshot quando discovery ou selecao
depender de Registry.

### ArtifactEnvelope

Runtime Context deve referenciar artefatos por `artifact_id` e
`artifact_version` quando artefato influenciar decisao.

## Invariantes

- Todo Runtime Context deve ter `runtime_context_id`.
- Todo Runtime Context deve ter `runtime_context_version`.
- Todo Runtime Context deve pertencer a exatamente um `trace_id`.
- Todo Runtime Context deve referenciar exatamente um `task_id`.
- Todo Runtime Context deve referenciar exatamente um command.
- Todo Runtime Context deve declarar State Machine id e versao.
- Todo Runtime Context deve declarar estado reconstruido.
- Todo Runtime Context decisivo deve listar inputs versionados.
- Todo Runtime Context deve declarar controles deterministicas minimos.
- Nenhuma decisao pode depender de input ausente do Runtime Context.
- Nenhum Runtime Context pode depender de persona, prompt, modelo ou memoria
  implicita.
- Nenhum Runtime Context pode depender de `latest` sem snapshot ou evento.

## O que nao pertence ao RuntimeContext

Nao pertence ao Runtime Context:

- storage;
- banco;
- event store;
- fila;
- API;
- transporte;
- executor;
- command handler;
- effect runner;
- policy engine;
- Registry;
- artefato completo;
- conteudo de artefato;
- memoria implicita;
- prompt;
- persona;
- modelo;
- segredo;
- payload sensivel bruto;
- resultado consolidado.

## Pontos em aberto

- Definir formato final de `id_namespace`.
- Definir catalogo final de `ordering_rule`.
- Definir quando Runtime Context deve virar artefato de trace.
- Definir relacao com `MemoryReferenceContract` se Memory passar a ser
  decisiva.

## Nao objetivos

- Implementar contexto.
- Implementar event store.
- Implementar storage.
- Implementar banco.
- Implementar API.
- Implementar SDK ou CLI.
- Implementar State Machine.
- Implementar Registry.
- Implementar Policy Engine.
- Criar agentes.
- Criar prompts.
