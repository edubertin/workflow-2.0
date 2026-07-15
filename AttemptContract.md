# AttemptContract

Versao: `0.1.0-draft`

Este documento define a especificacao normativa minima de `Attempt` no
Workflow V2.

Um attempt e uma tentativa concreta, identificavel e auditavel de realizar um
`Effect` declarado pela State Machine. Ele existe para separar uma solicitacao
externa declarada (`Effect`) das tentativas operacionais feitas para obter
evidencia.

Nao ha implementacao, pseudocodigo, SDK, CLI, API, transporte, scheduler,
storage, banco, servidor ou infraestrutura nesta especificacao.

## Objetivo

`AttemptContract` existe para tornar explicito como o runtime identifica e
correlaciona uma tentativa de execucao sem introduzir comportamento implicito
de retry, timeout ou late result.

Ele define:

- identidade da tentativa;
- versionamento;
- momento de criacao;
- causalidade com command, effect, task e eventos;
- relacao com `ExecutionResult`;
- regras futuras para retries, timeouts e late results;
- limites do que um attempt nao pode representar.

## Definicao

Um attempt representa uma unica tentativa de realizar um effect especifico.

Exemplos conceituais:

- uma tentativa de avaliar policy;
- uma tentativa de consultar Registry;
- uma tentativa de invocar executor para uma capability;
- uma tentativa de validar artifact;
- uma tentativa de consolidar resultado.

Um attempt nao muda estado por si so. A fonte de verdade operacional continua
sendo o event stream definido pelo `EventContract`.

## Autoridade documental

Este documento raiz e a autoridade semantica de `Attempt`.

Deve existir tambem `contracts/AttemptContract.md` como shape minimo porque
`Attempt` passa a ser objeto central de correlacao entre `Command`, `Effect`,
eventos e `ExecutionResult`. O arquivo em `contracts/` nao redefine a
semantica; ele registra a forma minima que futuras implementacoes devem aceitar
ou produzir quando attempts forem materializados.

## Responsabilidade

O attempt deve:

- identificar uma tentativa unica;
- preservar `trace_id` e `task_id`;
- referenciar exatamente um `Effect`;
- referenciar o `Command` que levou ao effect;
- preservar causalidade com eventos anteriores;
- declarar o alvo operacional da tentativa;
- referenciar inputs versionados usados para iniciar a tentativa;
- permitir correlacao com eventos de sucesso, falha, timeout, cancelamento ou
  late result;
- permitir retries futuros sem apagar tentativas anteriores;
- ser seguro para auditoria.

O attempt nao deve:

- executar trabalho por si so;
- declarar effect;
- solicitar transicao de estado;
- registrar fato historico no lugar de evento;
- substituir command;
- substituir effect;
- substituir executor;
- substituir policy decision;
- substituir Registry snapshot;
- substituir artifact;
- substituir `ExecutionResult`;
- carregar prompt, persona, modelo, chain-of-thought ou payload sensivel;
- depender de estado `latest` nao versionado.

## Campos obrigatorios

Todo attempt deve conter:

```yaml
attempt_version: "0.1.0"
attempt_id: "attempt_stable_id"
trace_id: "trace_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
attempt_number: 1
effect_ref:
  effect_id: "effect_ulid_or_uuid"
  effect_version: "0.1.0"
  effect_type: "policy.evaluate|registry.lookup|executor.invoke|artifact.validate|result.consolidate"
command_ref:
  command_id: "command_ulid_or_uuid"
  command_version: "0.1.0"
target:
  kind: "policy|registry|executor|artifact|result"
  id: "opaque_target_id"
created_at: "iso-8601"
created_by:
  component: "runtime|state_machine|effect_runner"
  version: "component_version"
causality:
  caused_by_event_id: "event_id_or_null"
  caused_by_command_id: "command_id_or_null"
  previous_attempt_id: "attempt_id_or_null"
input_refs:
  - kind: "task|plan|capability_contract|policy_decision|registry_snapshot|artifact|event|executor_metadata|runtime_context|effect"
    id: "input_id"
    version: "input_version_or_snapshot"
idempotency:
  key: "stable_attempt_idempotency_key"
  scope: "effect|trace|task"
```

Este formato e conceitual e normativo. Ele nao define schema executavel.

## Campos condicionais

### capability_ref

Obrigatorio quando a tentativa realiza ou observa uma capability.

```yaml
capability_ref:
  capability_id: "domain.action"
  capability_version: "0.1.0"
  step_id: "step_id"
```

### executor_ref

Obrigatorio quando a tentativa envolve executor selecionado.

```yaml
executor_ref:
  executor_id: "opaque_executor_id"
  metadata_version: "executor_metadata_version"
```

`executor_ref` nao pode conter persona, prompt, modelo, provedor ou nome
narrativo de agente.

### timeout_ref

Obrigatorio quando a tentativa possui deadline decisivo.

```yaml
timeout_ref:
  source_kind: "task|capability_contract|policy|runtime_context|event"
  source_id: "source_id"
  source_version: "source_version_or_snapshot"
  deadline_at: "iso-8601"
```

`timeout_ref` nao agenda timeout por si so. Agendamento de timeout continua
sendo effect ou comportamento futuro do runtime, sempre auditado por evento.

### expected_evidence

Opcional e descritivo.

```yaml
expected_evidence:
  - "policy_decision"
  - "registry_snapshot"
  - "executor_result"
  - "artifact_ref"
  - "execution_result"
```

`expected_evidence` orienta correlacao e auditoria. Ele nao e checklist
obrigatorio de implementacao e nao substitui eventos.

## Identidade

`attempt_id` identifica exatamente uma tentativa.

`attempt_id` deve ser derivado de forma deterministica. Ele nao pode ser UUID
aleatorio, ULID aleatorio, timestamp, wall-clock time, contador global,
estado implicito, estado `latest` ou valor vindo de storage externo.

Derivacao normativa:

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

`stable_id` significa uma funcao canonica e versionada de identificacao
estavel. Esta especificacao nao escolhe algoritmo de hash, encoding ou
storage. O algoritmo final deve ser versionado antes de ser usado por runtime
executavel.

Regras:

- todo attempt deve ter exatamente um `attempt_id`;
- `attempt_id` nao deve ser reutilizado;
- `attempt_id` deve ser imutavel depois de criado;
- correcao de attempt deve ser novo attempt ou evento de correcao, nunca
  mutacao silenciosa;
- `attempt_number` deve ser monotonicamente crescente dentro do mesmo
  `effect_id`;
- o primeiro attempt de um effect deve ter `attempt_number: 1`;
- retry futuro deve criar novo attempt com novo `attempt_id`;
- tentativas sucessivas do mesmo effect devem ser diferenciadas por
  `attempt_number`;
- `attempt_number` e ordinal normativo escopado por `effect_id`;
- `attempt_number` deve ser derivado por replay dos eventos de attempt ja
  registrados para o mesmo `effect_id`;
- o proximo ordinal valido deve ser `max(attempt_number) + 1` para aquele
  `effect_id`;
- dois attempts do mesmo `effect_id` nao podem compartilhar o mesmo
  `attempt_number`;
- identidade de attempt nao depende de transporte, fila, request HTTP,
  processo, arquivo, banco ou executor interno;
- ids gerados por ambiente externo so podem influenciar decisoes se forem
  registrados como evento ou input versionado antes de uso decisivo.

## Cardinalidade

A cardinalidade normativa entre `Command`, `Effect` e `Attempt` e:

- um command pode declarar zero ou mais effects;
- um effect deve ser causado por exatamente um command de declaracao;
- um effect pode ter zero attempts quando ainda nao foi iniciado;
- um effect pode ter um ou mais attempts ao longo do tempo;
- um attempt pertence a exatamente um effect;
- um attempt referencia exatamente um command iniciador da tentativa;
- o primeiro attempt de um effect normalmente referencia o command que causou
  a declaracao do effect;
- attempts posteriores devem referenciar o command que autorizou retry,
  retomada ou nova tentativa;
- um command nao pode criar dois attempts com o mesmo `effect_id` e
  `attempt_number`;
- no Walking Skeleton atual, cada effect pode ter no maximo um attempt.

Esta cardinalidade nao implementa retries. Ela apenas impede que retries
futuros sejam modelados como repeticoes invisiveis do mesmo attempt.

## Quando uma nova tentativa e criada

Uma nova tentativa deve ser criada quando o runtime inicia uma tentativa
concreta de realizar um effect declarado.

Regras:

- attempt nao pode existir sem `Effect` anterior;
- attempt deve ser criado depois de command aceito e effect declarado;
- attempt deve ser criado antes de observar resultado externo como evidencia;
- attempt deve referenciar o effect que tenta realizar;
- tentativa de retry deve ser novo attempt, nao reutilizacao do attempt
  anterior;
- tentativa apos timeout deve ser novo attempt quando a execucao continuar;
- resultado tardio deve referenciar o attempt original, nao a tentativa nova;
- criacao de attempt decisivo deve ser auditavel por evento conforme
  `EventContract`;
- o evento normativo de declaracao/criacao de attempt e
  `attempt.declared`.

No Walking Skeleton atual, uma execucao pode ter no maximo uma tentativa por
effect. Este contrato nao exige implementar retries, timeouts ou late results
agora.

## Ciclo de vida normativo

O ciclo de vida de um attempt e derivado de eventos. O objeto attempt isolado
nao e fonte de verdade de estado.

Estados conceituais:

- `declared`: tentativa criada e identificada por `attempt.declared`;
- `started`: trabalho externo da tentativa iniciado por `attempt.started`;
- `succeeded`: tentativa concluiu com evidencia aceita por
  `attempt.completed`;
- `failed`: tentativa falhou por `attempt.failed`;
- `timed_out`: tentativa expirou por `attempt.timed_out`;
- `cancelled`: tentativa foi cancelada por `attempt.cancelled`;
- `late_result_observed`: evidencia tardia foi observada por
  `attempt.late_result.observed`, sem substituir outcome terminal anterior.

Transicoes normativas:

```text
declared -> started
started -> succeeded
started -> failed
started -> timed_out
started -> cancelled
failed -> late_result_observed
timed_out -> late_result_observed
cancelled -> late_result_observed
```

`late_result_observed` nao reabre o attempt. Ele registra uma observacao
posterior a um outcome terminal.

## Outcomes terminais

A taxonomia minima de outcomes terminais de attempt e:

- `succeeded`: evidencia esperada foi aceita para o attempt;
- `failed`: falha classificada impediu conclusao do attempt;
- `timed_out`: deadline versionado expirou antes de evidencia aceita;
- `cancelled`: tentativa foi interrompida por command, policy ou contexto
  autorizado.

`late_result_observed` nao e outcome terminal substituto. Ele e observacao
pos-terminal e deve referenciar o evento terminal anterior.

## Eventos normativos de attempt

Eventos de attempt obedecem ao `EventContract` e ao `EventCatalog`.

Tipos normativos iniciais:

- `attempt.declared`: declara/cria uma tentativa identificavel para um effect;
- `attempt.started`: registra inicio da tentativa;
- `attempt.completed`: registra conclusao bem-sucedida da tentativa;
- `attempt.failed`: registra falha terminal da tentativa;
- `attempt.timed_out`: registra timeout terminal da tentativa;
- `attempt.cancelled`: registra cancelamento terminal da tentativa;
- `attempt.late_result.observed`: registra evidencia tardia observada depois
  de outcome terminal ou depois de tentativa posterior iniciada.

Cada evento de attempt deve carregar:

- `attempt_id`;
- `attempt_version`;
- `attempt_number`;
- `effect_id`;
- `effect_version`;
- `command_id`;
- `command_version`;
- `trace_id`;
- `task_id`;
- `input_refs` com todos os inputs versionados que influenciaram a tentativa.

Eventos de attempts posteriores tambem devem carregar `previous_attempt_id`.

`attempt.late_result.observed` deve carregar:

- `attempt_id` original;
- evento terminal anterior do attempt;
- classificacao segura da evidencia tardia;
- artifact ref quando a evidencia tardia for duravel;
- decisao segura indicando que o outcome terminal anterior nao foi substituido.

## Decisoes que referenciam attempt

Toda decisao que cria, inicia, encerra, classifica, ignora ou observa uma
tentativa deve referenciar `attempt_id`, `effect_id`, `command_id` e os inputs
versionados usados.

Isso inclui:

- decisao de iniciar attempt;
- decisao de registrar sucesso;
- decisao de registrar falha;
- decisao de registrar timeout;
- decisao de aceitar ou rejeitar retry futuro;
- decisao de observar late result;
- decisao de consolidar `ExecutionResult` quando o status depender de attempt.

Quando a decisao for registrada em evento, os ids devem aparecer no evento.
Quando a decisao for preservada em artifact do tipo `decision`, o artifact deve
referenciar o evento decisivo em vez de duplicar o historico inteiro.

## Versionamento

`attempt_version` versiona o formato do attempt.

Regras:

- mudanca em campo obrigatorio exige nova versao;
- mudanca de semantica exige nova versao;
- attempts historicos devem continuar compreensiveis;
- attempt deve referenciar inputs decisivos por id e versao ou snapshot;
- attempt nao pode depender de `latest`;
- versionamento de attempt nao substitui versionamento de task, command,
  effect, event, policy, Registry, artifact, Runtime Context ou State Machine.

## Causalidade

Causalidade explica por que a tentativa existe.

Um attempt deve apontar para:

- command que levou ao effect;
- effect que esta sendo realizado;
- evento causal anterior quando existir;
- attempt anterior quando for retry;
- inputs versionados necessarios para iniciar a tentativa.

Regras:

- causalidade nao pode depender apenas de timestamp;
- `created_at` nao basta para ordenar attempts;
- retry deve referenciar attempt anterior;
- late result deve referenciar attempt original;
- timeout deve referenciar attempt afetado;
- cancelamento de tentativa deve referenciar attempt cancelado.

## Idempotencia

Idempotencia de attempt e separada de command e effect.

Regras:

- todo attempt deve ter `idempotency.key`;
- a mesma chave, no mesmo escopo e com os mesmos inputs versionados, deve
  identificar a mesma tentativa pretendida;
- idempotencia de attempt nao autoriza repetir effect externo sem garantia
  declarada;
- se a tentativa ja foi observada por evento, nova avaliacao deve apontar para
  os eventos existentes;
- se inputs versionados mudarem, deve existir novo attempt ou nova chave de
  idempotencia;
- retry nao e reenvio invisivel; retry e novo attempt causado por novo command
  ou evento autorizado.

## Relacao com TaskEnvelope

Attempt deve preservar `task_id` e `trace_id` da task original.

Regras:

- attempt nao altera objetivo, escopo, constraints ou side effects permitidos
  da task;
- attempt deve referenciar task por id e versao quando a task influenciar a
  tentativa;
- `deadline` da task, quando influenciar timeout, deve aparecer como input
  versionado ou `timeout_ref`.

## Relacao com CommandContract

Command solicita transicao. Attempt representa tentativa de realizar effect.

Regras:

- attempt deve referenciar o command que levou ao effect;
- retry futuro deve ser solicitado por command e gerar novo attempt;
- command nao deve carregar contador operacional de tentativas fora de
  referencia versionada;
- command rejeitado nao deve criar attempt;
- attempt nao muda estado solicitado pelo command;
- a cardinalidade normativa entre command, effect e attempt e definida neste
  contrato e nao deve ser reinterpretada por command handlers futuros.

## Relacao com EffectContract

Effect declara trabalho externo. Attempt tenta realizar esse trabalho.

Regras:

- todo attempt deve referenciar exatamente um effect;
- um effect pode ter zero attempts quando ainda nao foi iniciado;
- um effect pode ter um attempt no Walking Skeleton;
- um effect pode ter multiplos attempts no futuro quando retry for permitido;
- attempt nao amplia side effects declarados pelo effect;
- attempt nao pode alterar `effect_type`;
- attempt deve respeitar idempotencia e side effects do effect.

## Relacao com EventContract

Eventos sao fatos. Attempt e objeto de correlacao de tentativa.

Regras:

- criacao, inicio, sucesso, falha, timeout, cancelamento, retry e late result
  de attempt devem ser registrados por eventos quando forem decisivos;
- eventos que dependem de uma tentativa devem referenciar `attempt_id`,
  `attempt_version`, `attempt_number`, `effect_id`, `effect_version`,
  `command_id` e `command_version`;
- eventos de capability execution devem referenciar attempt quando houver mais
  de uma tentativa possivel;
- replay usa eventos como fonte de verdade, nao o attempt isolado;
- attempt nao substitui evento de falha, completion ou timeout.

## Relacao com ExecutionResult

`ExecutionResult` consolida o fechamento da execucao.

Regras:

- `ExecutionResult` deve explicar retries, timeouts e late results por meio de
  `event_refs`, `decision_refs`, `errors`, `pending` e artifact refs quando
  aplicavel;
- o contrato atual de `ExecutionResult` nao precisa de campo novo para
  `attempt_refs` nesta fase;
- quando attempt for decisivo para status final, os eventos referenciados pelo
  resultado devem conter ou apontar para o attempt relevante;
- resultado nao deve duplicar historico completo de attempts;
- erro relacionado a attempt deve ter evento correspondente;
- late result nao pode alterar resultado terminal sem command e eventos
  explicitos de novo ciclo, recovery ou correcao.

## Relacao com ArtifactEnvelope

Attempt pode produzir ou observar evidencia que vira artifact, mas nao e
artifact.

Regras:

- attempt nao deve embutir `content.body`;
- artifact produzido por uma tentativa deve referenciar task, trace,
  capability e executor conforme `ArtifactEnvelope`;
- eventos que ligam attempt a artifact devem usar artifact refs;
- attempt nao substitui provenance ou validation do artifact.

## Relacao com RuntimeContext

Attempt deve ser criado a partir de Runtime Context versionado quando a
tentativa depender de estado reconstruido ou inputs decisivos.

Regras:

- todo input decisivo usado para iniciar attempt deve estar em `input_refs` ou
  no Runtime Context referenciado;
- current state usado para iniciar attempt deve ser derivado por replay de
  eventos;
- attempt nao pode depender de memoria implicita;
- attempt nao pode depender de relogio de parede sem input ou evento
  versionado.

## Retries futuros

Retry e nova tentativa, nunca repeticao invisivel.

Regras futuras:

- retry deve ser solicitado por command ou permitido por evento de recovery;
- retry deve ser permitido por policy, capability contract e effect
  idempotency;
- retry deve criar novo `attempt_id`;
- retry deve referenciar `previous_attempt_id`;
- retry deve preservar falha, timeout ou cancelamento do attempt anterior por
  eventos;
- retry nao pode apagar ou sobrescrever evidencia anterior;
- retry nao pode reutilizar artifact de tentativa anterior como saida nova sem
  evento que declare essa reutilizacao;
- retry apos estado terminal deve iniciar novo ciclo explicito ou recovery
  definido, nunca mutacao silenciosa.

Este contrato nao implementa retry engine.

## Timeouts futuros

Timeout e fato operacional associado a uma tentativa.

Regras futuras:

- timeout deve ter origem versionada: task deadline, capability contract,
  policy, Runtime Context ou evento;
- timeout agendado deve ser auditavel por evento ou effect apropriado;
- ocorrencia de timeout deve gerar evento;
- timeout deve referenciar `attempt_id` e `attempt_version`;
- timeout nao implica automaticamente retry;
- timeout nao apaga resultado que chegar depois;
- estado resultante de timeout deve ser decidido pela State Machine com inputs
  versionados.

Este contrato nao implementa scheduler.

## Late results futuros

Late result e evidencia observada depois de timeout, cancelamento ou depois de
uma tentativa posterior ter sido iniciada.

Regras futuras:

- late result deve referenciar o attempt original;
- late result deve gerar evento proprio;
- late result nao pode sobrescrever evento terminal;
- late result nunca pode substituir silenciosamente `succeeded`, `failed`,
  `timed_out` ou `cancelled` ja registrado para o attempt;
- late result nao pode substituir resultado de tentativa posterior;
- late result pode virar artifact ou diagnostico se autorizado por policy e
  registrado por evento;
- tratamento de late result deve ser deterministico e derivado de inputs
  versionados;
- se late result mudar uma decisao, isso exige command, eventos e regra de
  recovery ou correcao explicitamente versionada.

Este contrato nao implementa processamento de late results.

## Replay

Replay deve conseguir explicar attempts sem reexecutar trabalho externo.

Replay deve usar:

- eventos do `trace_id`;
- `TaskEnvelope` versionado;
- command versionado;
- effect versionado;
- Runtime Context ou seus inputs versionados;
- policy decisions;
- Registry snapshots;
- executor metadata versionado;
- artifact refs;
- attempt ids e versions presentes em eventos.

Replay nao deve usar:

- effect runner atual;
- executor interno;
- estado atual de Registry;
- policy atual sem versao;
- memoria implicita;
- prompt;
- persona;
- modelo;
- relogio de parede sem evento;
- ordem de chegada nao registrada.

## Invariantes

- Todo attempt deve ter `attempt_id`.
- Todo attempt deve ter `attempt_version`.
- Todo attempt deve pertencer a exatamente um `trace_id`.
- Todo attempt deve referenciar exatamente um `task_id`.
- Todo attempt deve referenciar exatamente um effect.
- Todo attempt deve referenciar command causal.
- Todo attempt deve ter `attempt_number`.
- Todo retry deve criar novo attempt.
- Todo retry deve referenciar attempt anterior.
- Todo timeout decisivo deve referenciar attempt.
- Todo late result deve referenciar attempt original.
- Nenhum attempt pode existir antes de effect declarado.
- Nenhum attempt pode mudar estado sem evento correspondente.
- Nenhum attempt pode ampliar side effects declarados.
- Nenhum attempt pode depender de persona, prompt, modelo ou memoria
  implicita.
- Nenhum attempt pode depender de estado `latest` sem snapshot ou evento.
- Nenhum attempt pode apagar, reescrever ou substituir evento historico.

## O que um attempt nao e

Um attempt nao e:

- command;
- effect;
- evento;
- executor;
- capability contract;
- policy decision;
- Registry snapshot;
- artifact;
- resultado;
- estado materializado;
- memoria;
- retry policy;
- timeout scheduler;
- recovery runner;
- transporte;
- fila;
- endpoint de API;
- registro de banco;
- log bruto;
- prompt;
- persona;
- modelo;
- SDK;
- CLI;
- implementacao.

Se alguma dessas informacoes for necessaria para auditoria, o attempt deve
referenciar objeto apropriado, versionado e autorizado, sem embutir conteudo
sensivel ou responsabilidade de outro contrato.

## Pontos em aberto

- Definir politica final de retry por capability e por effect type.
- Definir formato final de timeout e deadlines sem escolher scheduler.
- Definir como late result aparece no `ExecutionResult` quando for relevante
  mas nao alterar estado terminal.
- Definir se uma tentativa de `result.consolidate` deve ter tratamento
  diferente de tentativas externas como `executor.invoke`.

## Nao objetivos

- Implementar attempt runner.
- Implementar retry engine.
- Implementar timeout scheduler.
- Implementar recovery runner.
- Definir storage.
- Definir fila.
- Definir API.
- Definir banco.
- Definir framework.
- Definir SDK ou CLI.
- Alterar `ExecutionResult`.
- Alterar `EventContract`.
- Criar agentes.
- Criar prompts.
- Escolher modelo ou provedor.
