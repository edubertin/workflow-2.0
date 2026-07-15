# AttemptContract

Versao: `0.1.0-draft`

`AttemptContract` e o shape minimo de uma tentativa concreta de realizar um
`Effect`.

O documento raiz `AttemptContract.md` e a autoridade semantica. Este arquivo
em `contracts/` existe para registrar os campos, invariantes e exemplos
minimos que uma implementacao futura deve respeitar quando materializar
attempts.

## Responsabilidade

Correlacionar uma tentativa identificavel com seu command iniciador, seu effect,
seu ordinal e os eventos que registram inicio, fechamento, timeout ou late
result.

## Proposito

- diferenciar tentativa de command e effect;
- impedir retries invisiveis;
- preservar causalidade por referencias versionadas;
- permitir replay de falhas, timeouts e late results;
- manter `ExecutionResult` como indice de referencias, nao como log completo.

## Campos obrigatorios

```yaml
attempt_version: "0.1.0"
attempt_id: "attempt_stable_id"
trace_id: "trace_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
attempt_number: 1
effect_ref:
  effect_id: "effect_stable_id"
  effect_version: "0.1.0"
  effect_type: "policy.evaluate|registry.lookup|executor.invoke|artifact.validate|result.consolidate"
command_ref:
  command_id: "command_stable_id"
  command_version: "0.1.0"
target:
  kind: "policy|registry|executor|artifact|result"
  id: "opaque_target_id"
causality:
  caused_by_event_id: "event_id_or_null"
  previous_attempt_id: "attempt_id_or_null"
input_refs:
  - kind: "task|plan|capability_contract|policy_decision|registry_snapshot|artifact|event|executor_metadata|runtime_context|effect|command"
    id: "input_id"
    version: "input_version_or_snapshot"
idempotency:
  key: "stable_attempt_idempotency_key"
  scope: "effect|trace|task"
```

## Campos opcionais

```yaml
capability_ref:
  capability_id: "domain.action"
  capability_version: "0.1.0"
  step_id: "step_id"
executor_ref:
  executor_id: "opaque_executor_id"
  metadata_version: "executor_metadata_version"
timeout_ref:
  source_kind: "task|capability_contract|policy|runtime_context|event"
  source_id: "source_id"
  source_version: "source_version_or_snapshot"
expected_evidence:
  - "policy_decision|registry_snapshot|executor_result|artifact_ref|execution_result"
```

## Identidade deterministica

`attempt_id` deve ser derivado deterministicamente:

```text
attempt_id = stable_id(
  "attempt",
  trace_id,
  task_id,
  effect_id,
  effect_version,
  command_id,
  command_version,
  attempt_number,
  attempt_version
)
```

`stable_id` deve ser canonico e versionado quando houver implementacao. Nao
pode depender de UUID aleatorio, wall-clock time, contador global, storage,
estado implicito ou valor `latest`.

## Ordinal

`attempt_number` e ordinal normativo escopado por `effect_id`.

Regras:

- o primeiro attempt de um effect deve usar `attempt_number: 1`;
- attempts posteriores devem usar o proximo ordinal derivado por replay dos
  eventos do mesmo `effect_id`;
- dois attempts do mesmo `effect_id` nao podem compartilhar o mesmo ordinal;
- `previous_attempt_id` e obrigatorio quando `attempt_number` for maior que 1.

## Cardinalidade

- Um command pode declarar zero ou mais effects.
- Um effect deve ser causado por exatamente um command de declaracao.
- Um effect pode ter zero ou mais attempts.
- Um attempt pertence a exatamente um effect.
- Um attempt referencia exatamente um command iniciador da tentativa.
- O Walking Skeleton atual pode manter um unico attempt por effect.

## Ciclo de vida

O ciclo de vida e derivado de eventos, nao do objeto isolado.

Eventos normativos:

- `attempt.declared`;
- `attempt.started`;
- `attempt.completed`;
- `attempt.failed`;
- `attempt.timed_out`;
- `attempt.cancelled`;
- `attempt.late_result.observed`.

Outcomes terminais minimos:

- `succeeded`;
- `failed`;
- `timed_out`;
- `cancelled`.

`late_result_observed` e uma observacao pos-terminal. Ele nao substitui
silenciosamente outcome terminal ja registrado.

## Relacao com Artifact Envelope

Attempt pode produzir ou observar evidencia que vire artifact, mas nao e
artifact e nao embute `content.body`.

Eventos que ligam attempt a artifact devem usar artifact refs.

## Invariantes

- Todo attempt deve ter `attempt_id` deterministico.
- Todo attempt deve ter `attempt_version`.
- Todo attempt deve pertencer a exatamente um `trace_id`.
- Todo attempt deve referenciar exatamente um `task_id`.
- Todo attempt deve referenciar exatamente um effect.
- Todo attempt deve referenciar exatamente um command iniciador.
- Todo attempt deve ter `attempt_number`.
- Todo retry futuro deve criar novo attempt.
- Todo timeout decisivo deve referenciar attempt.
- Todo late result deve referenciar attempt original e evento terminal
  anterior.
- Nenhum attempt pode existir antes de effect declarado.
- Nenhum attempt pode mudar estado sem evento correspondente.
- Nenhum attempt pode depender de persona, prompt, modelo, memoria implicita,
  wall-clock time ou estado `latest`.

## Exemplo valido

```yaml
attempt_version: "0.1.0"
attempt_id: "attempt_trace_01_effect_01_cmd_01_1_v010"
trace_id: "trace_01JABC"
task_id: "task_01JABC"
attempt_number: 1
effect_ref:
  effect_id: "effect_01JABC"
  effect_version: "0.1.0"
  effect_type: "executor.invoke"
command_ref:
  command_id: "command_01JABC"
  command_version: "0.1.0"
target:
  kind: "executor"
  id: "executor_01JABC"
causality:
  caused_by_event_id: "event_executor_selected"
  previous_attempt_id: null
input_refs:
  - kind: "effect"
    id: "effect_01JABC"
    version: "0.1.0"
  - kind: "command"
    id: "command_01JABC"
    version: "0.1.0"
idempotency:
  key: "attempt:trace_01JABC:effect_01JABC:1:0.1.0"
  scope: "effect"
```

Por que e valido:

- id e ordinal sao determinaveis por inputs versionados;
- referencia command e effect;
- nao depende de persona, prompt, relogio real ou estado atual;
- preserva causalidade sem executar trabalho por si so.

## Exemplo invalido

```yaml
attempt_version: "0.1.0"
attempt_id: "random_uuid_generated_now"
attempt_number: 2
effect_ref:
  effect_id: "latest_effect"
command_ref:
  command_id: "latest_command"
target:
  kind: "executor"
  id: "best_agent"
```

Por que e invalido:

- `attempt_id` nao e derivado deterministicamente;
- usa `latest`;
- falta `trace_id` e `task_id`;
- falta versao de command e effect;
- `attempt_number: 2` nao referencia `previous_attempt_id`;
- usa nome narrativo de agente como alvo.
