# ResultReferenceModel

Versao: `0.1.0-draft`

Este documento especifica, em alto nivel, como `ExecutionResult` e os demais
objetos centrais do Workflow V2 devem referenciar decisoes relevantes, eventos
decisivos, outcomes de policy, selecoes, erros, pendencias e artefatos.

Ele nao altera schemas, nao cria campos obrigatorios novos e nao implementa
codigo, pseudocodigo, SDK, CLI, servidor, banco, storage ou infraestrutura.

## Objetivo

O objetivo deste modelo e garantir que uma execucao possa ser auditada e
reconstruida de forma deterministica sem duplicar conteudo de artefatos e sem
depender de memoria implicita, prompts, personas, modelos ou estado `latest`.

O `ExecutionResult` deve funcionar como indice consolidado de fechamento. Ele
aponta para as evidencias que justificam o resultado, mas nao substitui essas
evidencias.

## Principios

- Eventos sao a fonte de verdade operacional.
- Artefatos sao a fonte de verdade de conteudo duravel.
- Contracts e snapshots versionados sao a fonte de verdade dos inputs usados em
  decisoes.
- `ExecutionResult` consolida referencias, status e resumo seguro.
- Toda decisao relevante deve ser rastreavel ate pelo menos um evento decisivo.
- Toda justificativa duravel que exceder o evento minimo deve ser preservada em
  artifact do tipo `decision`.
- Toda referencia decisiva deve conter identidade e versao ou snapshot.
- Nenhuma referencia pode apontar para `latest` como base de replay.
- Nenhum objeto deve copiar `content.body` de artifact quando uma referencia ao
  `ArtifactEnvelope` for suficiente.
- Policy denial, selection, validation, failure e pending devem permanecer
  distinguiveis no resultado final.

## Autoridade Das Evidencias

| Evidencia | Autoridade | O que preserva |
| --- | --- | --- |
| `EventContract` | Fatos, ordem causal e decisoes registradas | O que aconteceu, quando, por que input versionado e com qual outcome. |
| `ArtifactEnvelope` | Conteudo duravel e evidencia material | Documentos, decisions, plans, reports, traces, patches e manifests. |
| `TaskEnvelope` | Pedido normalizado | Objetivo, escopo, restricoes, side effects permitidos e contexto autorizado. |
| `CapabilityPlan` | Trabalho planejado por capacidades | Passos, dependencias, capability refs, criterios e artefatos esperados. |
| `CapabilityContract` | Semantica da capability | Entradas, saidas, criterios, side effects e eventos esperados. |
| `PolicyEngine` | Decisao de permissao | `allow`, `deny`, `allow_with_constraints` ou `requires_approval`. |
| `Registry` | Descoberta versionada | Snapshots, candidatos opacos e metadados de execucao. |
| `RuntimeContext` | Conjunto fechado de inputs de decisao | Estado reconstruido por eventos e referencias versionadas disponiveis. |
| `AttemptContract` | Correlacao de tentativas | Identidade deterministica, ordinal, effect causal, command iniciador e outcome terminal por eventos. |
| `ExecutionResult` | Fechamento auditavel | Status, referencias decisivas, erros, pendencias e resumo seguro. |

Nenhuma dessas evidencias deve assumir responsabilidade de outra. Em especial,
`ExecutionResult` nao e evento, artifact, policy decision, registry snapshot ou
memoria.

## Responsabilidades Por Objeto

### TaskEnvelope

`TaskEnvelope` deve referenciar apenas contexto autorizado e artefatos
esperados quando conhecidos.

Ele pode conter:

- `context_refs` versionados;
- `expected_artifacts`;
- constraints e side effects permitidos.

Ele nao deve conter:

- decision refs;
- event refs decisivos;
- executor selecionado;
- policy outcome final;
- resultado consolidado.

### CapabilityPlan

`CapabilityPlan` deve referenciar os inputs que justificam a decomposicao da
task em capacidades.

Ele pode conter:

- `input_refs` versionados;
- `capability_id` e `capability_version`;
- expected outputs;
- expected artifacts;
- blocked reasons quando o plano nao puder ficar `ready`.

Ele nao deve conter:

- executor final;
- resultado de execucao;
- conteudo de artifact;
- policy outcome final como se fosse decisao propria do plano.

### Command

`Command` deve referenciar a solicitacao de mudanca e os inputs versionados que
a State Machine precisa avaliar.

Ele pode conter:

- causalidade com command ou evento anterior;
- `input_refs`;
- `expected_state`;
- `idempotency`;
- artifact refs quando a transicao usar ou validar artefatos.

Ele nao deve conter:

- fatos historicos;
- resultado de effect;
- conteudo de artifact;
- policy decision completa;
- estado mutado.

### RuntimeContext

`RuntimeContext` deve declarar o conjunto fechado de referencias que podem
influenciar uma decisao.

Ele pode conter:

- estado atual derivado de eventos;
- ultimo evento considerado;
- refs de task, plan, policy, registry, artifact, executor metadata e eventos;
- controles deterministicas como tempo logico e regra de ordenacao.

Ele nao deve conter:

- memoria implicita;
- estado `latest`;
- prompt;
- modelo;
- persona;
- conteudo completo de artifact;
- resultado consolidado.

### Event

Evento deve registrar fato, decisao ou transicao.

Ele pode conter:

- `input_refs` versionados;
- `decision.kind` e `decision.outcome`;
- policy refs;
- registry snapshot refs;
- alternatives considered e discarded;
- artifact refs;
- error seguro.

Ele nao deve conter:

- artifact content completo;
- prompt interno;
- payload sensivel bruto;
- regra interna completa de policy;
- estado operacional inteiro.

### Effect

Effect deve referenciar trabalho externo declarado pela State Machine.

Ele pode conter:

- command ref;
- transicao causal;
- inputs versionados usados para declarar o trabalho externo;
- side effects declarados;
- expected evidence descritiva.

Ele nao deve conter:

- resultado observado como fato final;
- estado mutado;
- artifact content;
- executor escolhido por persona;
- tentativa ou retry fora do `AttemptContract`.

### Attempt

Attempt deve correlacionar uma tentativa concreta de realizar um effect.

Ele pode conter:

- `attempt_id` derivado deterministicamente;
- `attempt_number` como ordinal normativo por `effect_id`;
- referencias a command, effect, task e trace;
- inputs versionados usados para iniciar ou classificar a tentativa.

Ele nao deve conter:

- resultado terminal como autoridade isolada;
- artifact content;
- retry policy;
- scheduler;
- estado `latest`;
- prompt, persona ou modelo.

### ArtifactEnvelope

`ArtifactEnvelope` deve preservar conteudo duravel ou referencia segura ao
conteudo.

Ele pode conter:

- `artifact_id`;
- `artifact_version`;
- `artifact_type`;
- status de ciclo de vida;
- source;
- content por `body` ou `uri`;
- provenance;
- validation.

Ele nao deve conter:

- event log completo;
- policy decision completa;
- selection ranking completo;
- estado operacional;
- `ExecutionResult` inteiro.

### ExecutionResult

`ExecutionResult` deve fechar a execucao como indice auditavel.

Ele pode conter:

- status global;
- resultados por capability;
- artifact refs;
- event refs;
- decision refs;
- policy outcomes;
- erros seguros;
- pendencias;
- resumo humano curto.

Ele nao deve conter:

- conteudo de artifact;
- eventos completos;
- policy rules completas;
- registry snapshot completo;
- prompt;
- persona;
- modelo;
- memoria implicita;
- decisao nova sem evento ou artifact referenciado.

## Categorias De Referencia

### Source References

Source references conectam objetos ao mesmo trabalho.

Devem preservar:

- `task_id`;
- `trace_id`;
- `plan_id` quando houver;
- `capability_id` e `capability_version` quando a decisao envolver capability;
- `executor_id` opaco quando um executor participou;
- versao ou snapshot do objeto referenciado.

Uso esperado:

- `ArtifactEnvelope.source`;
- `ExecutionResult.task_id`;
- `ExecutionResult.plan_id`;
- eventos de capability, artifact e result.

### Decision References

Decision references apontam para decisoes que mudaram o caminho da execucao.

Tipos iniciais ja aceitos pelo contrato de resultado:

- `policy`;
- `registry_lookup`;
- `executor_selection`;
- `artifact_validation`;
- `result`.

Regras:

- toda decision ref deve apontar para uma decisao registrada por evento ou por
  objeto versionado apropriado;
- decision refs nao devem copiar a decisao inteira;
- decision refs devem ser suficientes para encontrar o evento decisivo ou o
  artifact de decision quando existir;
- se a decisao tiver justificativa duravel, o evento decisivo deve apontar para
  artifact do tipo `decision`.

### Decisive Event References

Event refs decisivos sao os eventos minimos necessarios para explicar o status
do `ExecutionResult`.

Devem incluir, quando aplicavel:

- aceite da task;
- plano resolvido ou bloqueado;
- policy outcome;
- registry lookup;
- selecao de executor ou bloqueio de selecao;
- inicio e fim da capability;
- falha de capability;
- attempt terminal quando falha, timeout, cancelamento ou late result
  influenciarem o status;
- proposta, validacao ou rejeicao de artifact;
- consolidacao de result;
- evento terminal ou bloqueante.

`event_refs` nao precisa conter todos os eventos do trace. Ele deve conter os
eventos decisivos usados para derivar status, erros, pendencias e referencias
de artefatos.

### Policy Outcome References

Policy outcomes devem permanecer visiveis no `ExecutionResult` quando
influenciarem o fechamento.

Regras:

- `allow` pode ser referenciado quando habilitou execucao ou selecao;
- `allow_with_constraints` deve ser referenciado quando constraints afetaram
  contexto, executor, artifacts ou resultado;
- `deny` deve ser referenciado quando produziu `blocked` ou `failed`;
- `requires_approval` deve ser referenciado quando produziu
  `requires_approval`, `blocked`, `failed` ou `cancelled`;
- policy outcome nao deve ser reescrito como erro generico.

### Selection References

Selecoes devem preservar alternativas consideradas e descartadas por evento.

Regras:

- `ExecutionResult.decision_refs` pode apontar para a decisao de selecao;
- o evento de selecao deve referenciar Registry snapshot id, version, schema
  version, digest e candidate metadata;
- o evento de selecao deve referenciar selection rule id e versao;
- o evento de selecao deve preservar candidatos considerados, candidatos
  descartados, razoes objetivas de descarte, ranking final dos elegiveis e
  candidato selecionado quando houver;
- quando nao houver candidato elegivel, a decision ref deve apontar para a
  decisao de `registry_lookup`, nao para uma selecao de executor inexistente;
- quando houver candidatos retornados mas todos forem eliminados por
  eligibility ou empate irresoluvel, a decision ref deve apontar para
  `executor_selection`;
- alternativas descartadas devem aparecer no evento decisivo, nao no resultado
  como lista duplicada;
- empate deve referenciar criterio deterministico e versao;
- nenhum selection ref pode depender de persona, prompt, modelo ou preferencia
  implicita.

### Error References

Erros em `ExecutionResult.errors` devem classificar o problema de forma segura.

Regras:

- erro deve ter evento correspondente em `event_refs`;
- erro deve apontar para decisao, evento ou artifact que o justifica quando
  houver evidencia duravel;
- mensagem deve ser segura e curta;
- erro nao deve carregar stack trace longo, secrets, payload bruto ou artifact
  content;
- `retryable` descreve possibilidade conceitual de nova tentativa, nao executa
  retry nem altera terminalidade.

Quando erro, timeout, cancelamento ou late result dependerem de uma tentativa
concreta, `event_refs` deve incluir o evento de attempt correspondente. O
`ExecutionResult` nao ganha campo `attempt_refs` nesta versao; a rastreabilidade
vem dos eventos que carregam `attempt_ref`.

### Pending References

Pendencias descrevem o que falta para continuar ou revisar a execucao.

Regras:

- pendencia deve existir somente quando o status permitir acao futura clara,
  como `blocked`, `requires_approval` ou `partial`;
- pendencia deve ser explicada por evento bloqueante, policy outcome,
  validation event ou artifact ref;
- pendencia nao deve ser usada para esconder erro terminal;
- pendencia deve indicar qual input versionado, approval, contract, registry
  snapshot, policy version ou artifact novo poderia desbloquear o fluxo.

### Artifact References

Artifact refs conectam o resultado e os eventos ao conteudo duravel.

Regras:

- referencias devem usar `artifact_id` e `artifact_version`;
- `ExecutionResult.artifacts` deve conter apenas referencias consolidadas;
- artifact content permanece no `ArtifactEnvelope`;
- eventos devem usar artifact refs quando artifact for input, output,
  validation evidence ou decision record;
- artifact invalidado ou rejeitado pode ser referenciado se for evidencia
  relevante para status, erro ou pendencia.

## Regras De Fechamento Do ExecutionResult

`ExecutionResult` deve ser fechado somente quando as referencias abaixo forem
coerentes.

### Matriz normativa por status

Esta matriz define obrigatoriedade de referencias sem alterar o schema de
`ExecutionResult`. As referencias devem usar os campos existentes:
`event_refs`, `decision_refs`, `artifacts`, `errors`, `pending` e
`policy_outcomes`.

| Status | Referencias obrigatorias | Referencias condicionais | Referencias proibidas |
| --- | --- | --- | --- |
| `succeeded` | `execution.completed`, `execution.result.consolidation.completed`, eventos de completion das capabilities obrigatorias, validacoes dos artifacts obrigatorios, decision ref de `result` e artifact refs finais obrigatorios. | Policy outcomes que permitiram execucao, registry snapshot e executor selection quando houve executor selecionado. | Errors ativos, pending bloqueante, artifact obrigatorio ausente, invalido ou rejeitado. |
| `partial` | Evento `execution.partial` ou result partial, decision ref de `result`, capabilities obrigatorias cumpridas, artifacts obrigatorios validos, pendencias nao bloqueantes identificadas. | Errors de partes opcionais, artifact refs parciais ou rejeitados quando forem evidencia, policy outcomes que permitam parcialidade. | Falha de capability obrigatoria tratada como parcial sem contrato ou policy que permita. |
| `blocked` | `execution.blocked`, causa objetiva do bloqueio, decision ref causadora, pending explicita e novo input versionado necessario para retomada quando identificavel. | Policy outcome `deny` ou `requires_approval`, registry snapshot, missing contract, missing input, artifact invalido ou rejected quando causarem bloqueio. | `execution.completed`, pending vaga, artifact de saida fabricado para preencher ausencia. |
| `requires_approval` | `policy.decision.requires_approval`, `execution.approval.required`, decision ref de policy, pending de aprovacao e subject versionado da aprovacao. | Approval id quando existir, constraints previas permitidas pela policy, artifacts de input ja existentes. | Executor invocation dependente da aprovacao, artifact de saida final produzido antes da aprovacao, aprovacao implicita. |
| `failed` | `execution.failed`, evento especifico de falha quando existir, error classificado, decision ref relacionada e result decision. | Policy denial terminal, capability failure, artifact validation failure, registry failure, artifact refs de evidencia duravel. | Error sem evento, policy denial escondido como `unexpected_error`, artifact de sucesso fabricado. |
| `cancelled` | `execution.cancelled`, origem segura do cancelamento, motivo seguro, estado em que cancelamento foi aceito e result decision. | Effects pendentes identificados, policy outcome que exigiu cancelamento, eventos de cancel request quando existirem. | `execution.completed` posterior no mesmo ciclo, artifact final produzido apos cancelamento sem nova execucao ou recovery explicito. |

Para todos os status, os inputs decisivos usados para fechar o resultado devem
permanecer rastreaveis por id e versao ou snapshot: `TaskEnvelope`,
`CapabilityPlan`, `CapabilityContract`, policy decision, Registry snapshot,
executor metadata, `ArtifactEnvelope`, Runtime Context e State Machine version
quando tiverem influenciado a decisao.

### Status succeeded

Deve referenciar:

- evento terminal `execution.completed`;
- evento `execution.result.consolidation.completed`;
- eventos de capability completed para capacidades obrigatorias;
- eventos de artifact validation para artefatos obrigatorios;
- artifact refs obrigatorios com `artifact_id`, `artifact_version`, tipo e
  status coerentes;
- decision ref de `result`;
- policy outcomes que permitiram execucao;
- selection decision quando houve executor selecionado.

Nao deve conter:

- erro obrigatorio sem resolucao;
- pendencia bloqueante;
- artifact obrigatorio ausente ou invalido.

Inputs rastreaveis obrigatorios:

- `TaskEnvelope`;
- `CapabilityPlan`;
- `CapabilityContract` das capabilities obrigatorias;
- policy decisions que permitiram execucao;
- Registry snapshot e executor metadata quando houve executor selecionado;
- `ArtifactEnvelope` de cada artifact obrigatorio.

### Status blocked

Deve referenciar:

- evento `execution.blocked`;
- causa objetiva do bloqueio;
- decisao, validacao ou evento que causou bloqueio;
- pending explicita;
- novo input versionado necessario para retomada, quando identificavel;
- policy outcome quando o bloqueio vier de policy;
- missing input, contract, registry snapshot ou artifact por referencia quando
  identificavel.

Nao deve conter:

- `execution.completed` como evento terminal;
- pending vaga sem evento correspondente;
- artifact de saida fabricado para mascarar ausencia de evidencia.

Inputs rastreaveis obrigatorios:

- input ausente ou invalido quando ele tiver identidade conhecida;
- policy decision quando policy causou bloqueio;
- Registry snapshot quando discovery ou selecao causou bloqueio;
- artifact ref quando validacao ou ausencia de artifact causou bloqueio;
- Runtime Context usado para determinar que a execucao nao podia prosseguir.

### Status failed

Deve referenciar:

- evento `execution.failed`;
- evento de falha especifica quando existir;
- evento de attempt terminal quando a falha vier de tentativa concreta;
- erro seguro e classificado;
- decision ref relacionada a falha;
- decision ref de `result`;
- artifact refs de evidencia quando duraveis.

Nao deve conter:

- status global `succeeded`;
- erro sem evento;
- policy denial escondido como `unexpected_error`.

Inputs rastreaveis obrigatorios:

- evento ou policy decision que tornou a falha terminal;
- `CapabilityContract` quando a falha vier de criterio obrigatorio;
- artifact ref quando a falha vier de artifact ausente, invalido ou rejeitado;
- Registry snapshot quando a falha vier de discovery ou selecao;
- Runtime Context usado para classificar a falha.

### Status requires_approval

Deve referenciar:

- policy outcome `requires_approval`;
- evento de approval required;
- decision ref de policy;
- pending que descreva aprovacao necessaria;
- subject da aprovacao por referencia versionada.

Pode referenciar:

- approval id quando existir;
- constraints previas retornadas pela policy;
- artifacts de input ja existentes, desde que nao sejam tratados como saida
  final aprovada.

Nao deve conter:

- execucao de effect que dependa da aprovacao antes de ela existir;
- aprovacao implicita;
- artifact de saida final produzido por acao que ainda depende de aprovacao.

Inputs rastreaveis obrigatorios:

- policy id e policy version;
- policy decision id e version;
- subject avaliado pela policy;
- Runtime Context usado para avaliar a necessidade de aprovacao.

### Status partial

Deve referenciar:

- evento de partial ou result partial;
- capacidades obrigatorias cumpridas;
- capacidades opcionais ou nao bloqueantes pendentes ou falhas, identificadas
  por `step_id` ou referencia equivalente;
- artifact refs produzidos;
- pending ou error coerente com parte nao concluida.

Nao deve conter:

- falha de capacidade obrigatoria tratada como parcial sem policy ou contrato
  que permita isso.

Inputs rastreaveis obrigatorios:

- `CapabilityPlan` com a distincao entre capacidades obrigatorias, opcionais
  ou nao bloqueantes;
- eventos que comprovem completion das partes obrigatorias;
- eventos que comprovem falha, bloqueio ou ausencia das partes nao
  bloqueantes;
- artifact refs validos para entregas produzidas.

### Status cancelled

Deve referenciar:

- evento `execution.cancelled`;
- origem segura do cancelamento;
- motivo seguro;
- estado em que o cancelamento foi aceito;
- effects pendentes identificados quando aplicavel;
- attempts pendentes, cancelados ou tardios quando influenciarem o fechamento;
- decision ref de `result`.

Nao deve conter:

- completed terminal posterior sem nova execucao ou recovery explicito.

Inputs rastreaveis obrigatorios:

- command, policy outcome ou evento que causou cancelamento;
- Runtime Context no qual o cancelamento foi aceito;
- effect refs ou eventos de effect pendente quando cancelamento afetar
  trabalho externo ja declarado.
- attempt events quando cancelamento afetar tentativa materializada.

## Exemplos Conceituais

### Execucao bem-sucedida

Um resultado bem-sucedido referencia:

- task e plan por identidade e versao;
- policy outcome `allow`;
- registry lookup com snapshot;
- executor selection com alternativas descartadas;
- capability completed;
- artifact validation completed;
- artifact final por `artifact_id` e `artifact_version`;
- result consolidation completed;
- execution completed.

O resultado nao copia o documento produzido. Ele aponta para o artifact final.

### Policy denied com bloqueio

Um resultado `blocked` por policy referencia:

- policy decision com outcome `deny`;
- evento `policy.decision.denied`;
- evento `execution.blocked`;
- pending descrevendo qual aprovacao, input ou mudanca versionada pode
  desbloquear;
- erro seguro `policy_denied`, se o contrato de resultado exigir classificacao.

O resultado nao transforma denial em falha generica e nao inclui regras
internas completas de policy.

### Selecao sem candidato valido

Um resultado `blocked` ou `failed` por selecao referencia:

- registry snapshot usado;
- evento de lookup;
- `registry.lookup.no_candidate` quando o Registry snapshot retornou conjunto
  vazio antes da selecao;
- evento de `execution.executor.selection.blocked` quando havia candidatos mas
  nenhum permaneceu elegivel ou quando houve empate irresoluvel;
- candidatos considerados e descartados no evento decisivo aplicavel;
- pending quando novo registro ou novo snapshot puder desbloquear;
- erro seguro `no_executor_candidate`.

O resultado nao lista todo o snapshot do Registry. Ele aponta para o snapshot e
para o evento decisivo. A referencia deve ser suficiente para localizar o
snapshot versionado usado no replay, incluindo digest quando disponivel.

### Artifact invalido

Um resultado com artifact invalido referencia:

- artifact envelope produzido ou proposto;
- evento de validation completed ou validation failed;
- validation outcome;
- erro seguro `artifact_invalid`;
- pending quando artifact corrigido puder desbloquear.

O resultado nao copia o artifact content e nao reescreve o validation status.

## Requisitos De Replay

Replay deve conseguir reconstruir o mesmo fechamento usando:

- event stream do `trace_id`;
- `TaskEnvelope` versionado;
- `CapabilityPlan` versionado;
- `CapabilityContract` versionado;
- policy ids, versions e decisions;
- Registry snapshot;
- executor metadata versionado;
- attempts por eventos que carregam `attempt_ref` quando forem decisivos;
- `ArtifactEnvelope` por id e version;
- Runtime Context ou seus inputs versionados;
- State Machine versionada.

Replay nao deve consultar:

- Registry atual;
- policy atual;
- artifact latest;
- memoria implicita;
- prompt;
- modelo;
- persona;
- ordem de iteracao nao registrada;
- relogio de parede sem tempo logico registrado.

## Invariantes

- `ExecutionResult` nao pode introduzir decisao nova.
- Toda decision ref deve apontar para evento, policy decision ou artifact de
  decision versionado.
- Todo evento decisivo deve ser compativel com `EventContract`.
- Toda selecao deve preservar alternativas descartadas em evento decisivo.
- Todo policy outcome que afetar fechamento deve aparecer no resultado ou nos
  eventos decisivos referenciados.
- Todo erro em resultado deve ter evento correspondente.
- Toda pendencia deve ter evento, policy outcome, validation outcome ou artifact
  ref que explique sua existencia.
- Toda referencia a artifact deve usar id e version.
- Nenhum objeto deve duplicar artifact content quando reference for suficiente.
- Nenhuma decisao deve depender de persona, prompt, modelo ou memoria implicita.
- Nenhuma referencia decisiva pode apontar para estado `latest`.

## Pontos Em Aberto

- Definir taxonomia canonica de error codes sem alterar o contrato atual.
- Definir quais decisions exigem artifact do tipo `decision` obrigatorio.
- Definir convencao final para ids de decisions que sao eventos versus
  decisions externas versionadas.
- Definir granularidade minima de `event_refs` por status sem transformar o
  resultado em event log completo.
- Definir quando `RuntimeContext` deve ser referenciado diretamente pelo
  evento ou apenas por seus inputs versionados.
- Definir relacao futura com `ApprovalContract` para approvals duraveis.

## Nao Objetivos

Este documento nao define:

- schema executavel;
- novos campos obrigatorios;
- event store;
- storage de artifacts;
- algoritmo de replay;
- ranking de executor;
- policy language;
- retry engine;
- approval workflow;
- SDK, CLI, API, servidor ou banco;
- agentes, prompts, modelos ou personas.
