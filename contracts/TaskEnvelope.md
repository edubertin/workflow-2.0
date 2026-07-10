# TaskEnvelope

Versao: `0.1.0-draft`

`TaskEnvelope` e o objeto que normaliza uma intencao em uma tarefa executavel pelo runtime.

Ele nao escolhe capacidades, nao escolhe executores e nao contem resultado. Sua funcao e carregar objetivo, escopo, restricoes e contexto autorizado de forma estavel.

## Responsabilidade

Representar o pedido como uma unidade de trabalho rastreavel antes da resolucao de capacidades.

## Proposito

- preservar a intencao original;
- declarar escopo e restricoes;
- carregar contexto permitido;
- informar side effects permitidos;
- declarar artefatos esperados quando conhecidos;
- fornecer base para `CapabilityPlan`.

## Campos obrigatorios

```yaml
task_version: "0.1.0"
task_id: "task_ulid_or_uuid"
trace_id: "trace_ulid_or_uuid"
intent:
  summary: "Objetivo humano curto"
  raw: "Pedido original ou referencia segura ao pedido"
scope:
  include:
    - "area-ou-recurso-incluido"
  exclude:
    - "area-ou-recurso-excluido"
constraints:
  - "restricao explicita"
allowed_side_effects:
  - "read|write|network|external_state|destructive"
requested_by:
  type: "human|system|schedule"
  id: "requester_id"
created_at: "iso-8601"
```

## Campos opcionais

```yaml
priority: "low|normal|high|urgent"
deadline: "iso-8601"
context_refs:
  - kind: "workspace|document|artifact|memory|external"
    uri: "referencia-segura"
expected_artifacts:
  - artifact_type: "document|decision|plan|patch|report|trace|manifest"
    title: "Nome esperado"
policy_hints:
  risk_level: "low|medium|high|critical"
  requires_approval: false
metadata:
  project_id: "optional_project_id"
```

## Invariantes

- `task_id` identifica uma tarefa e nao deve mudar durante o ciclo de execucao.
- `trace_id` conecta task, plano, execucao, eventos e artefatos.
- `TaskEnvelope` nao pode conter `executor_id`.
- `TaskEnvelope` nao pode conter lista final de capacidades; isso pertence ao `CapabilityPlan`.
- `allowed_side_effects` deve ser explicito, mesmo que contenha apenas `read`.
- Secrets, credenciais e payloads privados nao devem aparecer em `intent.raw` nem em `context_refs`.
- `scope.include` e `scope.exclude` devem reduzir ambiguidade operacional.
- `expected_artifacts` declara expectativas, nao artefatos produzidos.

## Relacao com Artifact Envelope

`TaskEnvelope` pode declarar `expected_artifacts`, mas nao produz artefatos.

Quando um artefato for criado, o `Artifact Envelope v0` deve referenciar a task:

```yaml
source:
  task_id: "task_ulid_or_uuid"
  capability_id: "capability_id"
  executor_id: "executor_id"
  trace_id: "trace_ulid_or_uuid"
```

## Exemplo valido

```yaml
task_version: "0.1.0"
task_id: "task_01JABC"
trace_id: "trace_01JABC"
intent:
  summary: "Especificar objetos centrais do runtime"
  raw: "Crie TaskEnvelope.md, CapabilityPlan.md e ExecutionResult.md sem implementar codigo."
scope:
  include:
    - "contracts"
  exclude:
    - "runtime executavel"
    - "agentes"
constraints:
  - "Nao implementar codigo"
  - "Nao fazer commit"
allowed_side_effects:
  - "read"
  - "write"
requested_by:
  type: "human"
  id: "eduardo"
created_at: "2026-07-10T12:00:00Z"
expected_artifacts:
  - artifact_type: "document"
    title: "TaskEnvelope.md"
  - artifact_type: "document"
    title: "CapabilityPlan.md"
  - artifact_type: "document"
    title: "ExecutionResult.md"
```

Por que e valido:

- declara objetivo, escopo e restricoes;
- permite apenas side effects compativeis com documentacao local;
- nao escolhe capacidade nem executor;
- declara artefatos esperados sem fingir que ja foram produzidos.

## Exemplo invalido

```yaml
task_version: "0.1.0"
task_id: "task_01JABC"
trace_id: "trace_01JABC"
intent:
  summary: "Fazer tudo"
scope:
  include:
    - "projeto inteiro"
constraints: []
allowed_side_effects:
  - "destructive"
executor_id: "architect_agent"
capabilities:
  - "documentation.write"
```

Por que e invalido:

- `intent.summary` e vago;
- `constraints` esta vazio;
- `destructive` nao foi justificado;
- `executor_id` nao pertence ao `TaskEnvelope`;
- `capabilities` pertence ao `CapabilityPlan`.
