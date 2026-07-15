# Executor Selection Contract

Versao: `0.1.0-draft`

Este documento especifica, de forma normativa e em alto nivel, como o
Workflow V2 seleciona deterministicamente um executor opaco para uma
capability.

Ele nao implementa ranking, nao adiciona multiplos executores ao Walking
Skeleton, nao define SDK, CLI, API, servidor, banco, fila, scheduler,
persistencia ou infraestrutura.

## Autoridade documental

`ExecutorSelectionContract.md` e a fonte normativa para a decisao de selecao
de executor.

As fronteiras de autoridade sao:

- `Registry.md` define descoberta por snapshot, registros de candidatos e
  metadados versionados;
- `PolicyEngine.md` define outcomes e constraints permitidas, negadas ou
  condicionadas;
- `ExecutionEngine.md` define quando a selecao ocorre no ciclo operacional;
- `ExecutionStateMachine.md` define estados e transicoes;
- `EventContract.md` e `EventCatalog.md` definem como a decisao deve ser
  registrada por eventos;
- `ResultReferenceModel.md` define como o `ExecutionResult` referencia a
  decisao sem duplicar seu conteudo.

O Registry nunca seleciona o executor final. O executor nunca participa da
decisao sobre a propria selecao.

## Objetivo

A selecao de executor transforma um conjunto versionado de candidatos
descobertos pelo Registry em exatamente um executor selecionado, ou em um
bloqueio explicito quando isso nao puder ser feito de forma deterministica.

A mesma task, capability, policy decision, Registry snapshot, metadados de
candidatos, Runtime Context e regra de selecao versionada devem produzir a
mesma selecao, o mesmo bloqueio e a mesma trilha de eventos.

## Distincoes obrigatorias

- Registry lookup descobre candidatos.
- Eligibility elimina candidatos incompativeis.
- Ranking ordena candidatos elegiveis.
- Selection escolhe exatamente um candidato.
- Invocation ocorre somente depois da selecao.

Essas fases nao devem ser colapsadas em uma decisao implicita.

## Inputs versionados da selecao

Toda selecao deve depender somente de inputs versionados ou snapshots
explicitos:

- `TaskEnvelope` id e versao;
- `CapabilityPlan` id e versao;
- `CapabilityContract` id e versao;
- `capability_id` e `capability_version` solicitados;
- Registry snapshot id e versao;
- registros de candidatos retornados pelo snapshot;
- `candidate_id` opaco e `candidate_metadata_version`;
- compatibility records usados pelo Registry, quando existirem;
- policy decision id e versao;
- policy outcome e constraints explicitas aplicaveis;
- Runtime Context id e versao;
- State Machine id e versao;
- command id e versao que solicitou selecao;
- selection rule id e versao;
- ordering rule id e versao, quando separada da selection rule.

Se qualquer input decisivo nao tiver identidade e versao ou snapshot, a
selecao deve bloquear antes da invocacao.

## Conjunto inicial de candidatos

O conjunto inicial de candidatos vem exclusivamente de um lookup do Registry
contra um snapshot explicito.

O resultado do lookup deve preservar:

- Registry snapshot id e versao;
- capability id e versao consultados;
- candidatos considerados, inclusive quando o conjunto for vazio;
- candidatos descartados pelo Registry, quando houver;
- motivo objetivo de descarte em cada descarte;
- versao dos metadados de cada candidato.

A ordem original de arrays, mapas, arquivos ou respostas do Registry nao e
input valido de selecao. Antes de eligibility e ranking, o conjunto deve ser
tratado como conjunto canonico identificado por campos versionados, nao como
lista incidental.

## Eligibility

Um candidato e elegivel somente quando todos os criterios aplicaveis sao
verificaveis por inputs versionados.

Criterios minimos:

- declara suporte ao `capability_id` e `capability_version` solicitados;
- possui `candidate_id` opaco e `candidate_metadata_version`;
- possui registro ativo no Registry snapshot usado;
- declara permissoes requeridas;
- declara side effects requeridos;
- side effects e permissoes sao compativeis com `TaskEnvelope`,
  `CapabilityContract` e policy decision;
- metadados decisivos usados por policy ou selecao estao versionados;
- constraints de policy aplicaveis sao satisfeitas sem interpretacao
  implicita pelo executor;
- nenhum criterio proibido foi usado.

Um candidato e inelegivel quando qualquer criterio obrigatorio falhar, estiver
ausente ou depender de input nao versionado.

## Constraints de Policy

Constraints de `allow_with_constraints` participam da eligibility como
criterios objetivos. Elas devem ser expressas de forma que o Execution Engine
possa verificar o candidato usando metadados versionados.

O formato normativo de constraints, operadores, tipos, composicao,
canonicalizacao, digest e replay e definido em
`PolicyConstraintsContract.md`.

Constraints nao podem ser entregues ao executor para interpretacao implicita
durante a selecao.

Se uma constraint for ambigua, invalida, depender de prompt, persona, modelo,
estado vivo ou `latest`, a selecao deve bloquear. O bloqueio deve referenciar
a policy decision, o constraint set e a constraint que nao pode ser aplicada
deterministicamente.

## Regra normativa de ranking

Toda selecao que possua mais de um candidato elegivel deve usar uma selection
rule versionada.

Formato conceitual minimo:

```yaml
selection_rule_id: "executor_selection.default"
selection_rule_version: "0.1.0"
applies_to:
  capability_id: "domain.action"
  capability_version: "0.1.0"
ranking_keys:
  - key: "declared_priority"
    source: "registry_candidate_metadata"
    direction: "ascending|descending"
    missing_value_behavior: "ineligible|rank_last|blocked"
  - key: "declared_risk_level"
    source: "registry_candidate_metadata|policy_constraint"
    direction: "ascending|descending"
    missing_value_behavior: "ineligible|rank_last|blocked"
final_tie_breaker:
  key: "canonical_candidate_identity"
  fields:
    - "candidate_id"
    - "candidate_metadata_version"
    - "registry_record_id"
    - "registry_record_version"
  direction: "ascending"
```

Este formato e normativo como semantica, nao como schema executavel.

## Ordenacao total deterministica

A regra de ranking deve produzir uma ordenacao total dos candidatos elegiveis.

Regras:

- cada ranking key deve declarar fonte, direcao e comportamento para valor
  ausente;
- ranking key nao pode depender de ordem original do Registry;
- valores incomparaveis devem bloquear quando a regra nao definir tratamento;
- o desempate final deve usar identidade canonica versionada;
- a identidade canonica deve ser estavel por replay;
- se dois candidatos permanecerem indistinguiveis depois do desempate final, a
  selecao e invalida e deve bloquear.

O desempate final inicial e a ordem ascendente da tupla:

```text
candidate_id, candidate_metadata_version, registry_record_id, registry_record_version
```

Se qualquer campo da tupla estiver ausente para candidato elegivel, a selecao
deve bloquear por `selection_tie_unresolved` ou `selection_input_unversioned`,
conforme a causa.

## Registro de candidatos considerados

A decisao de selecao deve preservar todos os candidatos retornados pelo
Registry snapshot para a capability solicitada.

Modelo conceitual minimo:

```yaml
considered_candidates:
  - candidate_id: "opaque_candidate_id"
    candidate_metadata_version: "0.1.0"
    registry_record_id: "registry_record_id"
    registry_record_version: "0.1.0"
```

Quando o Registry retorna conjunto vazio, `considered_candidates` deve ser
representado explicitamente como vazio pelo evento de lookup.

## Registro de candidatos descartados

Cada candidato descartado deve ter motivo objetivo.

Modelo conceitual minimo:

```yaml
discarded_candidates:
  - candidate_id: "opaque_candidate_id"
    candidate_metadata_version: "0.1.0"
    registry_record_id: "registry_record_id"
    registry_record_version: "0.1.0"
    discard_reason_code: "capability_version_unsupported|policy_constraint_failed|side_effect_not_allowed|permission_missing|metadata_unversioned|selection_input_invalid"
    discard_reason_summary: "Resumo seguro e curto"
    failed_criterion: "criterio_normativo"
    evidence_ref:
      kind: "policy_decision|registry_snapshot|capability_contract|task|runtime_context|event"
      id: "evidence_id"
      version: "evidence_version_or_snapshot"
```

O motivo de descarte nao deve expor prompts, secrets, payloads sensiveis ou
detalhes internos de policy.

## Origem de campos de ranking

Campos de ranking devem vir do Registry snapshot como metadados estruturados,
versionados e congelados.

`declared_priority` e permitido como ranking key somente quando:

- esta presente em `ranking_metadata` do Registry record;
- tem valor, governanca e versao congelados pelo
  `RegistrySnapshotContract.md`;
- foi validado pelo Registry antes da selecao;
- a selection rule versionada declara que esse campo participa do ranking;
- a direction da selection rule define se menor ou maior valor vence.

O executor nao pode alterar `declared_priority` durante invocation. Nome
amigavel, persona, prompt, narrativa ou preferencia de modelo nao podem ser
reinterpretados como prioridade.

## Registro de ranking e candidato selecionado

Quando houver candidato selecionado, a decisao deve preservar:

- selection rule id e versao;
- candidatos elegiveis em ordem final;
- ranking factors versionados usados para cada candidato;
- criterio de desempate aplicado, quando houver;
- candidato selecionado;
- Registry snapshot usado;
- policy decision e constraints aplicadas.

Modelo conceitual minimo:

```yaml
ranked_eligible_candidates:
  - rank: 1
    candidate_id: "opaque_candidate_id"
    candidate_metadata_version: "0.1.0"
    ranking_factors:
      - key: "declared_priority"
        value_ref:
          kind: "registry_candidate_metadata"
          id: "opaque_candidate_id"
          version: "0.1.0"
selected_candidate:
  candidate_id: "opaque_candidate_id"
  candidate_metadata_version: "0.1.0"
selection_reason:
  selection_rule_id: "executor_selection.default"
  selection_rule_version: "0.1.0"
  tie_breaker_applied: false
```

## Comportamentos normativos

### Zero candidatos no Registry lookup

Quando o Registry lookup retorna conjunto de candidatos vazio:

- selecao de executor nao deve iniciar;
- nenhum executor deve ser selecionado;
- nenhum executor deve ser invocado;
- nenhum attempt deve ser declarado;
- nenhum artifact de saida deve ser fabricado;
- evento `registry.lookup.no_candidate` deve registrar o conjunto vazio;
- a execucao deve ir para `blocked` quando um novo Registry snapshot puder
  resolver a ausencia;
- `ExecutionResult.decision_refs` deve referenciar a decisao de
  `registry_lookup`, nao uma selecao inexistente.

### Candidatos existem, mas todos sao inelegiveis

Quando o Registry retorna candidatos e eligibility descarta todos:

- selecao deve registrar todos os candidatos considerados;
- cada descarte deve ter motivo objetivo;
- descartes por constraints devem usar motivo objetivo
  `policy_constraint_failed` e referenciar constraint id, versao e digest do
  constraint set;
- nenhum executor deve ser invocado;
- nenhum attempt deve ser declarado;
- a execucao deve ir para `blocked` quando metadado, policy, contrato ou
  Registry snapshot futuro puder resolver a condicao;
- `ExecutionResult.decision_refs` deve referenciar a decisao de
  `executor_selection`.

### Empate irresoluvel

Quando a regra de ranking nao consegue produzir ordenacao total:

- nenhum candidato deve ser selecionado;
- evento `execution.executor.selection.blocked` deve registrar a causa;
- `pending` deve indicar que uma selection rule versionada ou metadado
  versionado novo e necessario;
- a execucao deve permanecer `blocked`;
- replay deve reproduzir o mesmo bloqueio.

## Referencias obrigatorias em eventos

Eventos de selecao devem referenciar:

- `trace_id` e `task_id`;
- command id e versao;
- Runtime Context id e versao;
- `capability_id` e `capability_version`;
- Registry snapshot id e versao;
- policy decision id e versao;
- constraints aplicadas, quando existirem;
- selection rule id e versao;
- candidatos considerados;
- candidatos descartados e razoes objetivas;
- ranking final dos elegiveis, quando houver;
- candidato selecionado, quando houver selecao;
- criterio de desempate aplicado, quando houver.

Eventos de `registry.lookup.no_candidate` devem referenciar Registry snapshot,
capability solicitada e conjunto considerado vazio, mas nao devem fabricar
evento de selecao.

## Referencias obrigatorias em ExecutionResult

Quando houve selecao bem-sucedida:

- `decision_refs` deve incluir `executor_selection`;
- `event_refs` deve incluir `execution.executor.selected`;
- inputs de Registry, policy e selection rule devem permanecer rastreaveis
  via eventos decisivos.

Quando nao houve candidato no Registry lookup:

- `decision_refs` deve incluir `registry_lookup`;
- `event_refs` deve incluir `registry.lookup.completed`,
  `registry.lookup.no_candidate`, `execution.blocked` e consolidacao do
  resultado;
- `pending` deve indicar a condicao estruturada de retomada sem fabricar id ou
  versao de snapshot futuro.

Quando a selecao bloquear por inelegibilidade total ou empate irresoluvel:

- `decision_refs` deve incluir `executor_selection`;
- `event_refs` deve incluir `execution.executor.selection.blocked` e
  `execution.blocked`;
- `pending` deve indicar o input versionado necessario para retomada.

## Replay

Replay deve reconstruir e verificar a mesma selecao usando apenas:

- eventos do trace;
- TaskEnvelope, CapabilityPlan e CapabilityContract versionados;
- policy decision versionada;
- Registry snapshot versionado;
- metadados versionados dos candidatos;
- Runtime Context versionado;
- selection rule versionada.

Replay nao deve consultar Registry atual, estado `latest`, memoria implicita,
prompt, persona, modelo, relogio real, UUID aleatorio ou ordem incidental de
arrays e mapas.

Se a selecao registrada nao puder ser reproduzida a partir desses inputs, a
execucao historica deve ser tratada como inconsistente para auditoria.

## Criterios proibidos

Selecao de executor nunca pode depender de:

- persona;
- prompt;
- papel narrativo;
- preferencia de modelo;
- nome amigavel do executor;
- ordem incidental de arrays ou mapas;
- wall-clock time;
- UUID aleatorio;
- memoria implicita;
- estado atual nao versionado;
- metricas de saude ou disponibilidade que nao estejam congeladas em snapshot
  versionado.

## Nao objetivos

Este contrato nao define:

- implementacao de ranking em TypeScript;
- segundo executor no Walking Skeleton;
- fallback;
- retry;
- polling;
- health check dinamico;
- load balancing;
- recovery;
- approvals;
- scheduler;
- persistencia;
- SDK, CLI, API, servidor, banco ou fila.

## Pontos em aberto

- Taxonomia final de `discard_reason_code`.
- Formato executavel futuro da selection rule.
- Politica para health snapshots futuros, caso sejam introduzidos.
- Se regras especificas por dominio exigirao contratos derivados.
