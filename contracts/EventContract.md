# EventContract

Versao: `0.1.0-draft`

Este contrato define o formato universal de eventos do Workflow V2.

Eventos sao a trilha minima de auditoria do runtime. Eles devem permitir reconstruir uma execucao de forma deterministica a partir de inputs versionados, decisoes registradas, transicoes de estado e referencias a artefatos.

## Responsabilidade

Um evento registra uma mudanca, decisao ou observacao relevante do runtime.

Eventos devem:

- preservar ordem e causalidade;
- explicar decisoes do runtime;
- referenciar inputs versionados;
- registrar transicoes de estado;
- registrar alternativas consideradas quando houver decisao;
- apontar para artefatos quando uma decisao ou resultado precisar ser duravel;
- evitar dados sensiveis, prompts internos e payloads crus.

Eventos nao devem:

- substituir `TaskEnvelope`;
- substituir `CapabilityPlan`;
- substituir `ExecutionResult`;
- substituir `Artifact Envelope v0`;
- carregar conteudo completo de artefatos;
- depender de memoria implicita;
- conter comportamento de implementacao.

## Proposito

Eventos existem para responder, depois da execucao:

- o que aconteceu;
- quando aconteceu;
- qual task estava em execucao;
- qual capacidade estava envolvida;
- qual decisao foi tomada;
- quais inputs versionados foram considerados;
- quais alternativas foram descartadas;
- qual policy permitiu, bloqueou ou restringiu;
- qual artefato preserva o resultado ou a decisao;
- por que o runtime chegou ao `ExecutionResult` final.

## Campos obrigatorios

```yaml
event_version: "0.1.0"
event_id: "event_ulid_or_uuid"
event_type: "namespace.event_name"
occurred_at: "iso-8601"
recorded_at: "iso-8601"
trace_id: "trace_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
sequence:
  number: 1
  previous_event_id: null
producer:
  component: "runtime|policies|registry|capability|artifact_generation|observability"
  version: "component_version"
subject:
  kind: "task|plan|policy|registry|executor_selection|capability|attempt|artifact|result"
  id: "subject_id"
decision:
  kind: "none|state_transition|selection|registry_lookup|policy_outcome|validation|failure|result"
  outcome: "accepted|allowed|allowed_with_constraints|denied|selected|rejected|no_candidate|blocked|failed|succeeded|partial|cancelled|requires_approval|timed_out|late_result_observed"
input_refs:
  - kind: "task|plan|capability_contract|policy|registry_snapshot|artifact|memory|executor_metadata|command|effect|attempt|runtime_context"
    id: "input_id"
    version: "input_version_or_snapshot"
summary: "mensagem curta e segura"
```

## Campos opcionais

```yaml
state_transition:
  from: "previous_state"
  to: "next_state"
capability_ref:
  capability_id: "domain.action"
  capability_version: "0.1.0"
executor_ref:
  executor_id: "opaque_executor_id"
  metadata_version: "executor_metadata_version"
attempt_ref:
  attempt_id: "attempt_stable_id"
  attempt_version: "0.1.0"
  attempt_number: 1
  effect_id: "effect_stable_id"
  effect_version: "0.1.0"
  command_id: "command_stable_id"
  command_version: "0.1.0"
  previous_attempt_id: "attempt_stable_id_or_null"
alternatives:
  considered:
    - id: "candidate_id"
      version: "candidate_metadata_version"
  discarded:
    - id: "candidate_id"
      reason: "motivo seguro e objetivo"
policy_ref:
  policy_id: "policy_id"
  policy_version: "policy_version"
artifact_refs:
  - artifact_id: "artifact_ulid_or_uuid"
    artifact_version: "0.1.0"
    relation: "input|output|decision_record|validation_evidence"
error:
  code: "error_code"
  retryable: false
  message: "mensagem segura"
metadata:
  schema_notes: "campo livre para metadados nao sensiveis"
```

## Identidade

`event_id` identifica um evento imutavel.

Regras:

- `event_id` deve ser unico dentro do runtime.
- `trace_id` conecta eventos da mesma execucao.
- `task_id` conecta o evento a uma `TaskEnvelope`.
- `sequence.number` preserva ordem dentro de um `trace_id`.
- `sequence.previous_event_id` preserva encadeamento causal quando houver evento anterior.
- eventos de uma mesma execucao nao podem reutilizar o mesmo `sequence.number`.

## Timestamps

`occurred_at` e o momento em que o fato ocorreu.

`recorded_at` e o momento em que o evento foi registrado.

Regras:

- ambos devem usar ISO-8601;
- `recorded_at` nao pode ser anterior a `occurred_at`;
- diferenca entre `occurred_at` e `recorded_at` deve ser explicavel quando relevante;
- ordenacao principal dentro de uma execucao deve usar `sequence.number`, nao apenas timestamp.

## Versionamento

`event_version` versiona o contrato do evento, nao o runtime inteiro.

Todo evento deve referenciar as versoes ou snapshots dos inputs que influenciaram a decisao registrada.

Regras:

- `input_refs.version` e obrigatorio para todo input decisivo;
- snapshots de Registry devem aparecer como `kind: registry_snapshot`;
- Policies devem aparecer com `policy_id` e `policy_version`;
- metadados de executor devem ter versao ou snapshot;
- artefatos devem ser referenciados por `artifact_id` e `artifact_version`;
- Memory so pode aparecer por referencia versionada e autorizada por policy.

Sem inputs versionados, o evento nao sustenta reprodutibilidade historica.

## Invariantes

- Eventos sao append-only.
- Eventos nao podem ser editados depois de registrados.
- Correcao de evento deve ser outro evento, nunca alteracao retroativa.
- Todo evento deve pertencer a exatamente um `trace_id`.
- Todo evento deve pertencer a exatamente um `task_id`.
- Eventos de decisao devem registrar inputs considerados.
- Eventos de selecao devem registrar alternativas consideradas e descartadas.
- Eventos de falha devem registrar codigo seguro e status resultante.
- Eventos que apontam para artefatos devem usar `artifact_refs`, nao embutir conteudo.
- Eventos de attempt devem carregar `attempt_ref` com attempt, effect e command
  versionados.
- Eventos nao podem depender de estado `latest` para serem compreendidos historicamente.
- Eventos nao podem conter dados que violem policies de seguranca ou privacidade.

## Relacao com artefatos

Eventos registram que um artefato foi proposto, validado, rejeitado, usado como input ou produzido como output.

Artefatos preservam conteudo duravel. Eventos preservam causalidade.

Regras:

- eventos nao devem embutir `content.body` de artefatos;
- eventos devem referenciar artefatos por `artifact_id` e `artifact_version`;
- decisoes duraveis devem apontar para artefato do tipo `decision` quando existir;
- validacoes de artefato devem registrar `artifact.validation.status`;
- `ExecutionResult.artifacts` deve ser coerente com os eventos que registraram artefatos produzidos ou validados;
- `ExecutionResult.event_refs` deve referenciar eventos decisivos por `event_id` e `event_version`.

## Regras de imutabilidade

Uma vez registrado, um evento nao muda.

Se um evento estiver errado:

- registrar novo evento de correcao;
- referenciar o evento corrigido;
- explicar o motivo seguro;
- preservar o evento original.

Se uma decisao for revertida:

- registrar evento de reversao;
- referenciar a decisao original;
- apontar para artefato ou policy que justifica a reversao;
- nunca apagar o evento original.

## Eventos de decisao

Eventos que registram decisoes devem incluir:

- criterio aplicado;
- inputs versionados;
- alternativas consideradas, quando houver;
- alternativas descartadas, quando houver;
- outcome;
- motivo seguro;
- artifact refs quando a decisao for duravel.

Quando `decision.kind` for `policy_outcome`, o outcome generico do evento deve
mapear o outcome normativo de Policy sem substituir seu vocabulario:

- Policy `allow` -> Event `allowed`;
- Policy `allow_with_constraints` -> Event `allowed_with_constraints`;
- Policy `deny` -> Event `denied`;
- Policy `requires_approval` -> Event `requires_approval`.

Exemplos de decisoes:

- policy permitiu execucao;
- policy exigiu aprovacao;
- capability plan foi aceito;
- executor candidate foi selecionado;
- artifact foi validado;
- execution result foi consolidado.

## O que nunca pode aparecer em eventos

Eventos nunca devem conter:

- secrets;
- tokens;
- senhas;
- chaves privadas;
- certificados;
- credenciais;
- prompts internos;
- system prompts;
- chain-of-thought;
- payloads crus de usuario;
- dados pessoais desnecessarios;
- e-mails completos quando nao forem essenciais;
- IPs completos quando nao forem essenciais;
- fotos, midias ou anexos crus;
- stack traces longos;
- conteudo completo de arquivos sensiveis;
- respostas completas de modelos;
- logs de adaptadores com dados privados;
- informacao que permita reconstruir credenciais ou dados sensiveis.

Quando um dado sensivel for relevante para auditoria, o evento deve registrar apenas referencia segura, classificacao, hash permitido ou resumo redigido por policy.

## Tipos iniciais de evento

Tipos iniciais devem seguir o padrao:

```text
domain.subject.action
```

Exemplos:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
registry.lookup.completed
registry.lookup.no_candidate
execution.executor.selected
execution.context.prepared
capability.execution.started
capability.execution.completed
capability.execution.failed
attempt.declared
attempt.started
attempt.completed
attempt.failed
attempt.timed_out
attempt.cancelled
attempt.late_result.observed
artifact.validation.completed
execution.result.consolidation.completed
execution.completed
execution.failed
```

Esta lista inicial nao cria componentes novos. Ela apenas formaliza eventos ja descritos no RuntimeFlow e no ExecutionEngine.

## Exemplo valido

```yaml
event_version: "0.1.0"
event_id: "event_01JABC"
event_type: "execution.executor.selected"
occurred_at: "2026-07-10T12:20:00Z"
recorded_at: "2026-07-10T12:20:01Z"
trace_id: "trace_01JABC"
task_id: "task_01JABC"
sequence:
  number: 7
  previous_event_id: "event_01JABB"
producer:
  component: "runtime"
  version: "0.1.0-draft"
subject:
  kind: "executor_selection"
  id: "step_2"
decision:
  kind: "selection"
  outcome: "selected"
input_refs:
  - kind: "plan"
    id: "plan_01JABC"
    version: "0.1.0"
  - kind: "capability_contract"
    id: "documentation.specify"
    version: "0.1.0"
  - kind: "registry_snapshot"
    id: "registry_snapshot_01JABC"
    version: "2026-07-10T12:19:59Z"
capability_ref:
  capability_id: "documentation.specify"
  capability_version: "0.1.0"
executor_ref:
  executor_id: "executor_01JABC"
  metadata_version: "executor_meta_01JABC"
alternatives:
  considered:
    - id: "executor_01JABC"
      version: "executor_meta_01JABC"
    - id: "executor_01JABD"
      version: "executor_meta_01JABD"
  discarded:
    - id: "executor_01JABD"
      reason: "capability version unsupported"
summary: "Executor candidate selected by contract compatibility and policy constraints."
```

Por que e valido:

- referencia inputs versionados;
- registra alternativa descartada;
- nao inclui prompt interno;
- nao inclui dado sensivel;
- explica a decisao com motivo seguro.

## Exemplo invalido

```yaml
event_version: "0.1.0"
event_id: "event_01JABC"
event_type: "execution.executor.selected"
trace_id: "trace_01JABC"
task_id: "task_01JABC"
decision:
  kind: "selection"
  outcome: "selected"
executor_ref:
  executor_id: "best_agent"
summary: "Escolhi porque parece melhor. Prompt interno: ..."
```

Por que e invalido:

- falta timestamp;
- falta sequencia;
- falta producer;
- falta subject;
- falta `input_refs`;
- nao registra alternativas descartadas;
- usa nome narrativo de agente como criterio;
- inclui prompt interno;
- nao permite reproducao historica.

## Pontos em aberto

- Definir catalogo final de `event_type`.
- Definir formato final de `producer.version`.
- Definir como representar hashes seguros quando necessario.
- Definir retencao e armazenamento de eventos sem implementar banco nesta fase.
- Definir como eventos de correcao referenciam eventos corrigidos.
- Definir regras de redacao por policy.
