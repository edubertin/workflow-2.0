# ExecutionResult

Versao: `0.1.0-draft`

`ExecutionResult` e o objeto que fecha uma execucao do runtime.

Ele consolida status, artefatos, eventos, decisoes, erros e pendencias. Nao e log bruto, nao e memoria e nao substitui os artefatos produzidos.

## Responsabilidade

Representar o resultado auditavel de uma task executada a partir de um `CapabilityPlan`.

## Proposito

- registrar o status final da execucao;
- consolidar resultados por capacidade;
- apontar artefatos produzidos;
- expor erros e bloqueios de forma segura;
- registrar decisoes tomadas;
- permitir retomada, auditoria e revisao.

## Campos obrigatorios

```yaml
result_version: "0.1.0"
result_id: "result_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
plan_id: "plan_ulid_or_uuid"
trace_id: "trace_ulid_or_uuid"
status: "succeeded|failed|blocked|partial|cancelled|requires_approval"
summary: "Resumo humano curto"
capability_results:
  - step_id: "step_id"
    capability_id: "domain.action"
    status: "succeeded|failed|blocked|partial|cancelled|requires_approval"
    summary: "Resumo do resultado da capacidade"
artifacts:
  - artifact_id: "artifact_ulid_or_uuid"
    artifact_version: "0.1.0"
    artifact_type: "document|decision|plan|patch|report|trace|manifest"
    status: "draft|proposed|final|superseded|rejected"
event_refs:
  - event_id: "event_ulid_or_uuid"
    event_version: "0.1.0"
    event_type: "execution.completed"
decision_refs:
  - kind: "policy|registry_lookup|executor_selection|artifact_validation|result"
    id: "decision_or_event_id"
    version: "decision_or_event_version"
completed_at: "iso-8601"
```

## Campos opcionais

```yaml
started_at: "iso-8601"
duration_ms: 1234
pending:
  - "pendencia ou pergunta aberta"
errors:
  - code: "error_code"
    message: "mensagem segura"
    retryable: false
policy_outcomes:
  - decision_id: "decision_policy_01JABC"
    decision_version: "0.1.0"
    outcome: "allow|deny|requires_approval|allow_with_constraints"
```

## Invariantes

- `ExecutionResult` deve referenciar exatamente um `task_id` e um `plan_id`.
- `trace_id` deve ser o mesmo usado por `TaskEnvelope`, `CapabilityPlan`, eventos e artefatos.
- `status` global deve ser derivado dos `capability_results`.
- Se qualquer capacidade obrigatoria falhar, o status global nao pode ser `succeeded`.
- `artifacts` deve conter referencias a `Artifact Envelope v0`, nao conteudo duplicado.
- Cada referencia em `artifacts` deve conter `artifact_id` e `artifact_version`.
- `event_refs` deve conter os eventos decisivos usados para derivar o status global.
- `decision_refs` deve conter referencias versionadas para decisoes de policy, selecao, validacao ou resultado que afetaram o fechamento.
- Quando status, erro, timeout, cancelamento ou late result depender de tentativa concreta, `event_refs` deve incluir eventos com `attempt_ref`; este contrato nao adiciona campo `attempt_refs` nesta versao.
- Erros devem ser seguros e nao devem expor secrets, payloads privados ou stack traces longos.
- `ExecutionResult` nao pode alterar retrospectivamente o `CapabilityPlan`.
- Decisoes duraveis devem tambem existir como artefato `decision` quando forem fonte de verdade.
- `ExecutionResult` nao pode introduzir decisao nova que nao esteja em evento ou artefato referenciado.
- Se `status` for `succeeded`, deve existir evento terminal `execution.completed`.
- Se `status` for `failed`, `blocked`, `cancelled`, `partial` ou `requires_approval`, deve existir evento terminal ou bloqueante correspondente.

## Relacao com Artifact Envelope

`ExecutionResult` referencia artefatos produzidos, mas nao embute seus conteudos.

Cada item em `artifacts` deve corresponder a um `Artifact Envelope v0` existente ou proposto. O envelope contem `source`, `content`, `provenance` e `validation`; o resultado contem apenas a referencia consolidada.

Exemplo de relacao:

```yaml
artifacts:
  - artifact_id: "artifact_01JABC"
    artifact_version: "0.1.0"
    artifact_type: "document"
    status: "final"
```

O artefato correspondente deve conter:

```yaml
source:
  task_id: "task_01JABC"
  capability_id: "documentation.specify"
  executor_id: "executor_01JABC"
  trace_id: "trace_01JABC"
```

## Exemplo valido

```yaml
result_version: "0.1.0"
result_id: "result_01JABC"
task_id: "task_01JABC"
plan_id: "plan_01JABC"
trace_id: "trace_01JABC"
status: "succeeded"
summary: "Tres contratos centrais do runtime foram especificados em documentacao."
capability_results:
  - step_id: "step_1"
    capability_id: "repository.inspect"
    status: "succeeded"
    summary: "Documentos relevantes foram lidos."
  - step_id: "step_2"
    capability_id: "documentation.specify"
    status: "succeeded"
    summary: "TaskEnvelope, CapabilityPlan e ExecutionResult foram documentados."
artifacts:
  - artifact_id: "artifact_task_envelope"
    artifact_version: "0.1.0"
    artifact_type: "document"
    status: "final"
  - artifact_id: "artifact_capability_plan"
    artifact_version: "0.1.0"
    artifact_type: "document"
    status: "final"
  - artifact_id: "artifact_execution_result"
    artifact_version: "0.1.0"
    artifact_type: "document"
    status: "final"
event_refs:
  - event_id: "event_capability_completed"
    event_version: "0.1.0"
    event_type: "capability.execution.completed"
  - event_id: "event_result_completed"
    event_version: "0.1.0"
    event_type: "execution.completed"
decision_refs:
  - kind: "result"
    id: "event_result_completed"
    version: "0.1.0"
completed_at: "2026-07-10T12:30:00Z"
```

Por que e valido:

- referencia task, plan e trace;
- status global e coerente com resultados das capacidades;
- artefatos aparecem como referencias, nao como conteudo duplicado;
- artefatos e eventos referenciados possuem versao;
- resumo e seguro e auditavel.

## Exemplo invalido

```yaml
result_version: "0.1.0"
result_id: "result_01JABC"
task_id: "task_01JABC"
trace_id: "trace_01JABC"
status: "succeeded"
summary: "Tudo certo"
capability_results:
  - step_id: "step_1"
    capability_id: "documentation.specify"
    status: "failed"
    summary: "Falhou ao criar documentos"
artifacts:
  - artifact_id: "artifact_task_envelope"
    content:
      body: "conteudo inteiro do documento"
completed_at: "2026-07-10T12:30:00Z"
```

Por que e invalido:

- falta `plan_id`;
- status global `succeeded` contradiz capacidade `failed`;
- `artifacts` embute conteudo que pertence ao `Artifact Envelope`;
- falta `artifact_version` na referencia do artefato;
- falta `event_refs` para justificar o fechamento;
- falta `decision_refs` para decisoes relevantes;
- o resumo e vago;
- falta `artifact_type` e `status` na referencia do artefato.
