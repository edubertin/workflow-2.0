# CommandContract

Versao: `0.1.0-draft`

Este documento define a especificacao normativa minima de `Command` no
Workflow V2.

Um command e uma solicitacao para a State Machine avaliar uma transicao. Ele
nao e fato historico, nao executa trabalho externo e nao substitui evento,
effect, policy, task, plano, artefato ou resultado.

Nao ha implementacao, pseudocodigo, SDK, CLI, API, transporte, storage,
framework, banco ou servidor nesta especificacao.

## Objetivo

`CommandContract` existe para tornar explicito como uma mudanca e solicitada
sem quebrar determinismo, replay e auditabilidade.

Ele define:

- identidade do command;
- versao do formato;
- alvo da execucao;
- causalidade;
- idempotencia;
- referencias versionadas necessarias;
- relacao com eventos;
- relacao com effects;
- limites do que um command nao pode representar.

## Definicao

Um command e uma intencao operacional direcionada a uma execucao existente ou
em criacao.

Ele pede que a State Machine avalie se uma transicao pode ocorrer.

Um command aceito pode produzir:

- um ou mais eventos;
- um ou mais effects declarados;
- ambos.

Um command rejeitado nao muda estado. A rejeicao deve ser auditavel por evento
quando a tentativa de transicao for relevante para a execucao.

## Responsabilidade

O command deve:

- declarar qual mudanca esta sendo solicitada;
- identificar a execucao alvo;
- preservar `trace_id` e `task_id`;
- apontar para estado esperado quando necessario;
- carregar referencias versionadas dos inputs decisivos;
- preservar causalidade com eventos ou commands anteriores;
- permitir decisao idempotente;
- ser seguro para auditoria.

O command nao deve:

- executar effects;
- registrar fatos historicos;
- substituir eventos;
- substituir `TaskEnvelope`;
- substituir `CapabilityPlan`;
- substituir `ExecutionResult`;
- substituir policy decision;
- carregar conteudo completo de artefatos;
- conter prompts, personas, modelos ou chain-of-thought;
- depender de estado `latest` nao versionado.

## Campos obrigatorios

Todo command deve conter:

```yaml
command_version: "0.1.0"
command_id: "command_ulid_or_uuid"
command_type: "execution.command.type"
trace_id: "trace_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
requested_at: "iso-8601"
requested_by:
  kind: "runtime|state_machine|policy|registry|executor|human|system"
  id: "safe_requester_id"
target:
  kind: "execution|task|plan|capability|artifact|result"
  id: "target_id"
expected_state:
  state: "state_name"
  version: "state_machine_version_or_snapshot"
causality:
  caused_by_event_id: "event_id_or_null"
  caused_by_command_id: "command_id_or_null"
input_refs:
  - kind: "task|plan|capability_contract|policy_decision|registry_snapshot|artifact|event|executor_metadata|runtime_context"
    id: "input_id"
    version: "input_version_or_snapshot"
intent:
  action: "requested_action"
  reason: "motivo seguro"
idempotency:
  key: "stable_idempotency_key"
  scope: "trace|task|target"
```

Este formato e conceitual e normativo. Ele nao define schema executavel.

## command_type

`command_type` classifica a solicitacao que a State Machine deve avaliar.

Ele define a semantica operacional do command: quais estados podem aceita-lo,
quais validacoes sao exigidas, quais inputs versionados sao obrigatorios e
quais eventos ou effects podem resultar da aceitacao.

`command_type` e diferente de `intent.action`.

- `command_type` e vocabulario normativo do runtime.
- `intent.action` e descricao segura da acao solicitada neste command.
- `command_type` deve ser estavel para replay e validacao.
- `intent.action` pode ser mais especifico ao caso sem redefinir semantica.

Exemplo:

```yaml
command_type: "execution.executor.select"
intent:
  action: "selecionar executor para capability documentation.write"
```

Regras:

- todo `command_type` deve ter significado unico dentro de uma versao do
  contrato;
- `command_type` nao pode carregar persona, prompt, modelo, transporte ou
  executor narrativo;
- `intent.action` nao pode ampliar, restringir ou reinterpretar o significado
  de `command_type`;
- mudanca de significado de um `command_type` existente exige nova versao do
  contrato ou novo `command_type`;
- nomes antigos nao devem ser reutilizados para nova semantica;
- especializacao compativel deve criar novo `command_type` mais especifico ou
  campo opcional versionado, sem alterar historico;
- replay deve conseguir aplicar a mesma regra para o mesmo `command_type`,
  `command_version` e Runtime Context versionado.

## Catalogo minimo de command_type

O catalogo abaixo e suficiente apenas para o Walking Skeleton de uma task, uma
capability, um executor, uma policy minima, um Registry estatico, eventos,
artefatos e `ExecutionResult`.

Ele nao e o catalogo completo do runtime.

### execution.task.accept

Solicita que a State Machine aceite um `TaskEnvelope` valido.

Estados esperados:

- antes de `accepted`.

Pode produzir:

- evento `execution.task.accepted`;
- effect para resolucao de plano.

### execution.plan.resolve

Solicita resolucao ou validacao de um `CapabilityPlan` minimo.

Estados esperados:

- `accepted`;
- `plan_resolving`.

Pode produzir:

- evento `execution.plan.resolution.started`;
- evento `execution.plan.resolution.completed`;
- effect para avaliacao de policy.

### execution.policy.apply

Solicita aplicacao de policy decision versionada ao plano ou a capability.

Estados esperados:

- `plan_ready`;
- `policy_checking`.

Pode produzir:

- evento `policy.check.completed`;
- effect para consulta ao Registry quando outcome permitir prosseguir.

### execution.registry.apply

Solicita aplicacao de resultado de lookup do Registry por snapshot versionado.

Estados esperados:

- `policy_checking`;
- `registry_lookup`.

Pode produzir:

- evento `registry.lookup.completed`;
- effect para selecao deterministica de executor.

### execution.executor.select

Solicita selecao deterministica de executor a partir de candidatos versionados.

Estados esperados:

- `registry_lookup`;
- `executor_selecting`.

Pode produzir:

- evento `execution.executor.selected`;
- evento `execution.context.prepared`;
- effect para invocacao de executor.

### execution.capability.apply

Solicita aplicacao da evidencia de execucao de capability retornada por
executor autorizado.

Estados esperados:

- `running`.

Pode produzir:

- evento `capability.execution.started`;
- evento `capability.execution.completed`;
- evento `capability.execution.failed`;
- effect para validacao de artefato quando houver artefato esperado.

### execution.artifact.apply

Solicita aplicacao de artefato produzido ou validado.

Estados esperados:

- `running`;
- `artifact_collecting`.

Pode produzir:

- evento `capability.artifact.proposed`;
- evento `artifact.validation.completed`;
- effect para consolidacao de resultado.

### execution.result.consolidate

Solicita consolidacao de `ExecutionResult` a partir de eventos, decisions e
artefatos referenciados.

Estados esperados:

- `artifact_collecting`;
- `result_consolidating`.

Pode produzir:

- evento `execution.result.consolidation.started`;
- evento `execution.result.consolidation.completed`;
- evento `execution.completed`;
- evento `execution.failed`.

Regras do catalogo minimo:

- cada `command_type` acima deve preservar a semantica definida nesta versao;
- nenhum `command_type` acima pode depender de persona, prompt, modelo ou
  memoria implicita;
- cada command deve continuar obedecendo identidade, causalidade,
  idempotencia e inputs versionados;
- novos `command_type` para retry, timeout, recovery, approval ou memoria
  decisiva ficam fora do Walking Skeleton.

## requested_by.kind

`requested_by.kind` classifica a origem autorizada que solicitou o command.
Neste contrato, ele corresponde ao `requested_by_kind` conceitual.

O conjunto inicial e fechado nesta versao:

- `runtime`;
- `state_machine`;
- `policy`;
- `registry`;
- `executor`;
- `human`;
- `system`.

Regras:

- `requested_by.kind` deve conter apenas valor definido por esta versao do
  contrato;
- `requested_by.id` deve identificar a origem de forma segura e auditavel;
- `requested_by.kind` nao concede autoridade por si so;
- a autoridade efetiva deve ser validada por policy, estado, command type e
  Runtime Context versionado;
- `executor` nao implica agente-persona;
- `system` deve ser usado apenas para origem tecnica nao humana e nao deve
  esconder executor, policy ou registry quando uma origem mais especifica for
  conhecida;
- novos valores exigem nova versao do `CommandContract` ou extensao
  explicitamente versionada;
- valores historicos nao podem mudar de significado.

Governanca:

- qualquer novo valor deve declarar significado, autoridade pretendida e
  impacto em replay;
- qualquer novo valor deve declarar relacao com policy e eventos antes de uso;
- extensoes nao versionadas sao invalidas para decisions do runtime.

## Campos condicionais

Campos abaixo sao obrigatorios apenas quando a transicao solicitada depender
deles.

### state_transition

Obrigatorio quando o command solicita transicao explicita.

```yaml
state_transition:
  from: "previous_state"
  to: "requested_state"
```

### capability_ref

Obrigatorio quando o command envolve uma capability.

```yaml
capability_ref:
  capability_id: "domain.action"
  capability_version: "0.1.0"
```

### effect_request

Obrigatorio quando o command pode declarar effect.

```yaml
effect_request:
  effect_type: "invoke_executor|query_registry|evaluate_policy|validate_artifact|emit_result"
  side_effects:
    - "read|write|network|external_state|destructive"
```

`effect_request` nao executa o effect. Ele apenas declara que a transicao pode
resultar em um effect se a State Machine aceitar o command.

### artifact_refs

Obrigatorio quando o command usa ou valida artefatos.

```yaml
artifact_refs:
  - artifact_id: "artifact_ulid_or_uuid"
    artifact_version: "0.1.0"
    relation: "input|output|validation_target|decision_evidence"
```

## Identidade

`command_id` identifica uma solicitacao unica.

Regras:

- todo command deve ter exatamente um `command_id`;
- `command_id` nao deve ser reutilizado para outra solicitacao;
- command duplicado deve ser reconhecivel por `idempotency.key`;
- correcao de command deve ser novo command;
- command nao deve ser alterado depois de submetido a avaliacao;
- identidade de command nao depende de transporte, fila, request HTTP,
  processo, arquivo ou banco.

## Versionamento

`command_version` versiona o formato do command.

Regras:

- mudanca em campo obrigatorio exige nova versao;
- mudanca de semantica exige nova versao;
- commands historicos devem continuar compreensiveis;
- commands devem referenciar inputs decisivos por id e versao ou snapshot;
- command nao pode depender de `latest` para ser reavaliado depois;
- versionamento do command nao substitui versionamento de task, plano,
  policy, Registry, artifact, event ou State Machine.

## Causalidade

Causalidade explica por que o command existe.

Um command deve apontar para pelo menos uma causa auditavel quando nao for o
primeiro command da execucao.

Fontes validas de causalidade:

- evento anterior;
- command anterior;
- `TaskEnvelope`;
- policy decision versionada;
- Registry snapshot;
- artifact versionado;
- runtime context versionado.

Regras:

- causalidade deve usar ids e versoes;
- causalidade nao pode depender de ordem temporal isolada;
- `requested_at` nao basta para determinar ordem causal;
- commands derivados de effects devem referenciar o evento que confirmou ou
  falhou o effect;
- commands de recovery devem referenciar o evento ou gap que motivou a
  reconciliacao.

## Idempotencia

Idempotencia evita que reenvios ou duplicacoes solicitem transicoes diferentes.

Regras:

- todo command deve ter `idempotency.key`;
- a mesma `idempotency.key`, no mesmo escopo e com os mesmos inputs
  versionados, deve produzir a mesma decisao da State Machine;
- se um command equivalente ja foi aceito, nova avaliacao deve retornar a
  decisao ja registrada ou apontar para o evento correspondente;
- se um command equivalente ja foi rejeitado por contexto ainda vigente, nova
  avaliacao deve preservar a rejeicao;
- se inputs versionados mudarem, deve existir novo command ou nova chave de
  idempotencia;
- idempotencia de command nao autoriza repetir effect externo.

## Relacao com State Machine

A State Machine e a autoridade que avalia commands.

O command solicita transicao; a State Machine decide.

Regras:

- command nao muda estado por si so;
- command deve ser validado contra estado atual reconstruido por eventos;
- command deve ser validado contra Runtime Context versionado;
- command aceito deve resultar em evento, effect declarado ou ambos;
- command rejeitado nao produz transicao;
- command nao pode contornar terminalidade de estados finais.

## Relacao com Events

Eventos sao fatos. Commands sao solicitacoes.

Regras:

- command aceito deve ser explicavel por eventos;
- eventos de transicao devem referenciar command quando o command for a causa
  direta;
- command rejeitado deve gerar evento quando a rejeicao for relevante para
  auditoria;
- evento nao deve copiar command inteiro quando referencias forem suficientes;
- evento deve preservar `command_id` quando a rastreabilidade exigir;
- replay usa eventos, nao commands, como fonte de verdade.

## Relacao com Effects

Effects representam trabalho externo declarado pela State Machine.

Regras:

- command pode solicitar que a State Machine declare um effect;
- command nao executa effect;
- effect so pode existir como consequencia de command aceito e transicao
  validada;
- effect deve preservar referencia ao command que o originou;
- conclusao, falha ou resultado tardio de effect deve produzir evento ou novo
  command derivado;
- idempotencia de command e idempotencia de effect sao responsabilidades
  diferentes.

## Relacao com Attempts

Attempt representa uma tentativa de executar um effect ou capability.

Regras:

- command pode iniciar a primeira tentativa quando a transicao validada exigir
  execucao;
- command de retry futuro deve referenciar attempt anterior;
- um command pode declarar zero ou mais effects;
- um effect deve ser causado por exatamente um command de declaracao;
- um attempt pertence a exatamente um effect;
- um attempt deve referenciar exatamente um command iniciador da tentativa;
- um command nao pode criar dois attempts com o mesmo `effect_id` e
  `attempt_number`;
- o Walking Skeleton pode ter exatamente um attempt por effect;
- attempt nao substitui command;
- command nao carrega contador operacional de tentativas fora de referencia
  versionada;
- timeouts e resultados tardios devem apontar para attempt;
- `attempt_number` e `attempt_id` sao definidos por `AttemptContract.md`, nao
  por `CommandContract`.

## Relacao com contratos centrais

### TaskEnvelope

Commands devem referenciar `task_id`, `task_version` ou snapshot quando a task
for input decisivo.

Command nao altera objetivo, escopo ou side effects permitidos da task.

### CapabilityPlan

Commands que avancam planejamento ou execucao devem referenciar `plan_id` e
`plan_version` quando o plano existir.

Command nao reordena passos nem redefine dependencias.

### CapabilityContract

Commands que envolvem capability devem referenciar `capability_id` e
`capability_version`.

Command nao altera entradas, saidas, sucesso ou side effects da capability.

### PolicyEngine

Commands que dependem de policy devem referenciar `decision_id` e
`decision_version`.

Command nao amplia permissao concedida por policy.

### Registry

Commands que dependem de discovery ou selecao devem referenciar Registry
snapshot e metadados versionados de candidato.

Command nao escolhe executor por persona.

### ArtifactEnvelope

Commands que usam ou validam artefatos devem referenciar `artifact_id` e
`artifact_version`.

Command nao carrega `content.body` como substituto do artifact.

### ExecutionResult

Commands podem solicitar consolidacao de resultado.

O `ExecutionResult` deve ser derivado de eventos e artefatos, nao do command
isolado.

## Invariantes

- Todo command deve ter `command_id`.
- Todo command deve ter `command_version`.
- Todo command deve pertencer a exatamente um `trace_id`.
- Todo command deve referenciar exatamente um `task_id`.
- Todo command deve ter `command_type`.
- Todo command deve ter `requested_at`.
- Todo command deve ter solicitante seguro.
- Todo command deve ter `requested_by.kind` valido para a versao do contrato.
- Todo command deve ter alvo identificado.
- Todo command decisivo deve referenciar inputs versionados.
- Todo command deve ter chave de idempotencia.
- Nenhum command pode produzir estado sem evento correspondente.
- Nenhum command pode executar effect diretamente.
- Nenhum command pode depender de persona, prompt, modelo ou memoria implicita.
- Nenhum command pode depender de estado `latest` sem snapshot ou evento.
- Command rejeitado nao muda estado.
- Command aceito deve ser rastreavel por evento.

## O que um command nao e

Um command nao e:

- evento;
- fato historico;
- log;
- effect;
- executor;
- tentativa;
- policy decision;
- Registry snapshot;
- artifact;
- resultado;
- estado materializado;
- memoria;
- payload bruto de usuario;
- prompt;
- persona;
- modelo;
- transporte;
- endpoint de API;
- mensagem de fila;
- registro de banco;
- arquivo;
- schema executavel;
- implementacao.

Se alguma dessas informacoes for necessaria para avaliar um command, ela deve
ser referenciada por objeto apropriado, versionado e autorizado.

## Extensibilidade

Novos tipos de command podem ser adicionados sem quebrar historico se:

- nao alterarem semantica de commands existentes;
- preservarem `command_id`, `command_version`, `trace_id`, `task_id`,
  causalidade e idempotencia;
- declararem quais estados podem aceita-los;
- declararem quais inputs versionados sao obrigatorios;
- declararem quais eventos ou effects podem resultar da aceitacao;
- nao introduzirem dependencias de persona, prompt, modelo, memoria implicita
  ou estado mutavel nao versionado.

## Pontos em aberto

- Definir catalogo completo de `command_type` depois do Walking Skeleton.
- Definir convencao final para `idempotency.key`.
- Definir quando command rejeitado exige evento obrigatorio.
- Definir como commands de recovery referenciam gaps sem inventar eventos.

## Nao objetivos

- Implementar command handler.
- Definir transporte.
- Definir API.
- Definir storage.
- Definir fila.
- Definir banco.
- Definir framework.
- Definir SDK ou CLI.
- Implementar State Machine.
- Implementar Effect runner.
- Implementar Attempt tracking.
- Criar agentes.
- Criar prompts.
