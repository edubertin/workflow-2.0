# Walking Skeleton Review

Versao: `0.1.0-draft`

Este documento revisa tecnicamente `kernel/runtime/walking-skeleton.ts`.

Ele nao substitui os contratos normativos do Workflow V2 e nao descreve um
runtime completo. O objetivo e facilitar revisao do fluxo minimo implementado.

## Visao geral

O Walking Skeleton implementa oito cenarios deterministicos que atravessam os
objetos centrais do runtime:

```text
TaskEnvelope
-> CapabilityPlan
-> Command
-> RuntimeContext
-> StateMachine
-> Effect
-> Event
-> ArtifactEnvelope
-> ExecutionResult
```

Os cenarios atuais sao:

- `policy_allow -> succeeded`;
- `policy_deny_correctable -> blocked`;
- `policy_deny_terminal -> failed`;
- `registry_no_candidate -> blocked`;
- `registry_multiple_eligible -> succeeded`;
- `registry_mixed_eligibility -> succeeded`;
- `registry_equal_rank_tiebreaker -> succeeded`;
- `policy_allow_with_constraints -> succeeded`.

O modulo exporta entradas para criar task, executar cenarios e verificar a
demonstracao deterministica:

- `createWalkingSkeletonTask`: cria uma task fixa e versionada.
- `runWalkingSkeleton`: executa um dos cenarios suportados.
- `runWalkingSkeletonDemo`: executa os cenarios suportados duas vezes e
  compara a representacao canonica das execucoes.
- `verifyWalkingSkeletonScenarios`: alias de verificacao da demonstracao.
- `verifyRegistryMultipleEligibleOrderIndependence`: compara duas enumeracoes
  internas do mesmo Registry snapshot para provar independencia da ordem.
- `verifyRegistryMixedEligibilityOrderIndependence`: compara duas enumeracoes
  internas do snapshot misto para provar que eligibility ocorre antes de
  ranking.
- `verifyRegistryTieBreakerOrderIndependence`: compara duas enumeracoes
  internas do snapshot com ranking empatado para provar desempate canonico.
- `verifyPolicyConstraintsOrderIndependence`: compara duas enumeracoes internas
  do snapshot com constraints para provar que Policy constraints sao avaliadas
  pelo kernel antes do ranking.

A validacao principal e deterministica: duas execucoes do mesmo cenario com os
mesmos inputs devem produzir o mesmo fingerprint.

## Diagrama textual

```text
createWalkingSkeletonTask
  -> TaskEnvelope

runWalkingSkeleton
  -> createCapabilityPlan
     -> CapabilityPlan

  -> step(execution.task.accept)
     -> createCommand
     -> createRuntimeContext
     -> applyStateMachine
     -> event execution.task.accepted

  -> step(execution.plan.resolve)
     -> events execution.plan.resolution.started/completed
     -> effect policy.evaluate

  -> runPolicyEffect
     -> PolicyDecision allow|allow_with_constraints|deny

  -> step(execution.policy.apply)
     -> event policy.check.completed
     -> when allow: effect registry.lookup
     -> when correctable deny: policy.decision.denied + execution.blocked
     -> when terminal deny: policy.decision.denied + execution.failed

  -> when deny:
     -> effect result.consolidate
     -> step(execution.result.consolidate)
     -> events result.consolidation.started/completed
     -> final ExecutionResult blocked|failed

  -> when allow ou allow_with_constraints:
     -> runRegistryEffect
     -> RegistryLookup com um candidato, dois candidatos elegiveis,
        dois candidatos com ranking empatado, dois candidatos sujeitos a
        constraints ou nenhum candidato elegivel

     -> step(execution.registry.apply)
        -> event registry.lookup.completed

     -> when no candidate:
        -> event registry.lookup.no_candidate
        -> event execution.blocked
        -> effect result.consolidate
        -> step(execution.result.consolidate)
        -> events result.consolidation.started/completed
        -> final ExecutionResult blocked

     -> selectExecutor
        -> ExecutorSelection

     -> step(execution.executor.select)
        -> events execution.executor.selected/context.prepared
        -> effect executor.invoke

     -> runExecutorEffect
        -> ArtifactEnvelope unchecked

     -> step(execution.capability.apply)
        -> events capability.execution.started/completed/artifact.proposed
        -> effect artifact.validate

     -> runArtifactEffect
        -> ArtifactEnvelope valid

     -> step(execution.artifact.apply)
        -> event artifact.validation.completed
        -> effect result.consolidate

     -> runResultEffect
        -> ExecutionResult draft-like object for evidence

     -> step(execution.result.consolidate)
        -> events result.consolidation.started/completed and execution.completed

  -> consolidateResult
     -> final ExecutionResult

  -> finalizeRun
     -> canonical fingerprint
```

## Funcoes principais

### createWalkingSkeletonTask

Cria a `TaskEnvelope` fixa usada pela demonstracao.

Responsabilidade:

- fixar `task_id`, `trace_id`, timestamps e escopo por cenario;
- declarar uma expectativa de artefato do tipo `report`;
- evitar qualquer dependencia de input externo.

### runWalkingSkeleton

Coordena o fluxo ponta a ponta.

Responsabilidade:

- construir o plano;
- disparar commands na ordem minima;
- executar stubs de effect;
- coletar eventos, effects, artifacts e result;
- devolver uma execucao completa com fingerprint canonico.

### runWalkingSkeletonDemo

Executa cada cenario de `runWalkingSkeleton` duas vezes.

Responsabilidade:

- comparar fingerprints;
- validar status final, sequencia de eventos, replay e ausencia de eventos
  proibidos nos fluxos nao felizes;
- expor se a execucao e deterministica para os mesmos inputs.

### verifyRegistryMultipleEligibleOrderIndependence

Executa `registry_multiple_eligible` duas vezes com o mesmo `TaskEnvelope`,
`CapabilityPlan`, Registry snapshot, policy decision e selection rule.

Responsabilidade:

- permutar apenas a enumeracao interna da fixture de Registry;
- confirmar que candidatos considerados aparecem em ordem canonica;
- confirmar que ranking, executor selecionado, alternativa nao selecionada,
  artifact, result, replay e fingerprint permanecem identicos.

### verifyRegistryMixedEligibilityOrderIndependence

Executa `registry_mixed_eligibility` duas vezes com o mesmo `TaskEnvelope`,
`CapabilityPlan`, Registry snapshot, policy decision e selection rule.

Responsabilidade:

- permutar apenas a enumeracao interna da fixture de Registry;
- confirmar que o candidato inativo e descartado por eligibility antes de
  ranking;
- confirmar que o ranking contem somente o candidato elegivel;
- confirmar que artifact, result, replay, eventos e fingerprint permanecem
  identicos.

### verifyRegistryTieBreakerOrderIndependence

Executa `registry_equal_rank_tiebreaker` duas vezes com o mesmo `TaskEnvelope`,
`CapabilityPlan`, Registry snapshot, policy decision e selection rule.

Responsabilidade:

- permutar apenas a enumeracao interna da fixture de Registry;
- confirmar que os dois candidatos permanecem elegiveis;
- confirmar que `declared_priority` empata para os dois candidatos;
- confirmar que a tupla canonica decide a ordenacao final;
- confirmar que artifact, result, replay, eventos e fingerprint permanecem
  identicos.

### verifyPolicyConstraintsOrderIndependence

Executa `policy_allow_with_constraints` duas vezes com o mesmo `TaskEnvelope`,
`CapabilityPlan`, policy decision, constraint set, Registry snapshot e
selection rule.

Responsabilidade:

- permutar apenas a enumeracao interna da fixture de Registry;
- confirmar que Registry lookup descobre os dois candidatos sem pushdown de
  constraints;
- confirmar que os dois candidatos passam na eligibility intrinseca;
- confirmar que o candidato de melhor prioridade falha a Policy constraint
  antes do ranking;
- confirmar que artifact, result, replay, eventos e fingerprint permanecem
  identicos.

### step

Agrupa a avaliacao de um command.

Responsabilidade:

- criar `Command`;
- criar `RuntimeContext`;
- chamar `applyStateMachine`;
- anexar eventos e effects ao estado de trabalho.

### createCommand

Materializa um command conforme o catalogo minimo.

Responsabilidade:

- derivar estado esperado a partir dos eventos;
- preencher identidade, causalidade, input refs e idempotencia;
- registrar `effect_request` para commands que podem declarar trabalho
  externo, usando `EffectContract.md`;
- manter `intent.action` alinhado ao `command_type`.

### createRuntimeContext

Cria o contexto usado para avaliar o command.

Responsabilidade:

- registrar estado atual derivado por eventos;
- referenciar ultimo evento e sequencia;
- declarar tempo logico, namespace de ids e regra de ordenacao.

### applyStateMachine

Implementa a maquina de estados minima para os cenarios suportados.

Responsabilidade:

- validar que `current_state` corresponde a `expected_state`;
- transformar command aceito em eventos;
- declarar effect quando a proxima etapa exige trabalho externo.

### transition

Cria eventos e effect associados a uma transicao.

Responsabilidade:

- encadear eventos com sequencia causal;
- declarar effect quando informado;
- manter a State Machine sem execucao direta de trabalho externo.

### runPolicyEffect

Stub deterministico de policy.

Responsabilidade:

- devolver `allow`, `deny` corrigivel ou `deny` terminal conforme fixture de
  cenario;
- preservar identidade e versao de policy decision;
- emitir constraint set tipado e versionado quando o outcome for
  `allow_with_constraints`.

### runRegistryEffect

Stub deterministico de Registry.

Responsabilidade:

- devolver um snapshot fixo;
- devolver exatamente um candidato compativel no caminho feliz;
- devolver conjunto elegivel vazio no cenario `registry_no_candidate`;
- devolver dois candidatos elegiveis no cenario `registry_multiple_eligible`;
- devolver dois candidatos considerados no cenario `registry_mixed_eligibility`,
  sendo um inelegivel por `frozen_status` inativo e um elegivel;
- devolver dois candidatos elegiveis com o mesmo `declared_priority` no cenario
  `registry_equal_rank_tiebreaker`;
- devolver dois candidatos intrinsecamente elegiveis no cenario
  `policy_allow_with_constraints`, sendo um descartado depois por Policy
  constraint.

### selectExecutor

Seleciona o candidato elegivel de maior ranking deterministico.

Responsabilidade:

- normalizar candidatos por identidade canonica antes de ranquear;
- registrar candidatos considerados;
- registrar eligibility;
- descartar candidatos inelegiveis antes de ranking;
- avaliar Policy constraints sobre candidatos intrinsecamente elegiveis;
- descartar candidatos que falham constraints antes de ranking;
- registrar ranking final dos elegiveis;
- registrar alternativa elegivel nao selecionada como `ranked_lower`;
- preservar selection rule id e versao;
- nao usar persona, prompt ou modelo.

### runExecutorEffect

Stub deterministico de executor.

Responsabilidade:

- produzir um `ArtifactEnvelope`;
- nao chamar agente, modelo, adapter ou ferramenta externa.

### runArtifactEffect

Stub de validacao de artefato.

Responsabilidade:

- trocar `validation.status` de `unchecked` para `valid`;
- preservar criterios de validacao.

### consolidateResult

Cria o `ExecutionResult`.

Responsabilidade:

- consolidar status global como `succeeded`, `blocked` ou `failed`;
- referenciar artefatos quando existirem;
- referenciar eventos existentes;
- classificar erro de policy terminal quando aplicavel;
- classificar ausencia de candidato como `no_executor_candidate`, nao como
  erro inesperado;
- evitar duplicar conteudo do artefato dentro do resultado.

### finalizeRun

Fecha a execucao.

Responsabilidade:

- reunir todos os objetos centrais;
- gerar fingerprint por serializacao canonica.

## Responsabilidades por parte

### TaskEnvelope

Representa input inicial versionado e fixo.

Limite atual:

- nao aceita task externa variavel alem do parametro opcional de
  `runWalkingSkeleton`.

### CapabilityPlan

Mapeia a task para uma unica capability `walking_skeleton.execute`.

Limite atual:

- nao resolve grafo;
- nao suporta multiplas capabilities;
- nao trata plano bloqueado.

### Command

Representa a solicitacao de transicao.

Limite atual:

- cobre apenas os oito `command_type` do Walking Skeleton;
- nao cobre retry, timeout, recovery, approval ou memoria decisiva.

### RuntimeContext

Registra estado reconstruido, command e inputs versionados.

Limite atual:

- usa eventos em memoria;
- nao persiste snapshot;
- nao modela referencias condicionais completas de policy, registry,
  executor ou artifact.

### StateMachine

Aplica transicoes dos oito cenarios suportados.

Limite atual:

- valida apenas alinhamento entre estado esperado e estado reconstruido;
- implementa `blocked` para policy deny corrigivel e Registry sem candidato;
- implementa `failed` para policy deny terminal;
- implementa selecao deterministica entre dois executores elegiveis;
- implementa descarte por eligibility antes de ranking;
- implementa descarte por Policy constraint antes de ranking;
- nao executa recovery;
- nao possui tabela declarativa completa de transicoes.

### Effect

Representa trabalho externo declarado.

Limite atual:

- effects sao executados por stubs locais;
- `AttemptContract` existe como contrato, mas nao ha attempt tracking
  implementado;
- nao ha retry, timeout ou resultado tardio.

### Event

Registra fatos do fluxo.

Limite atual:

- event store e array em memoria;
- producer, decision e subject sao derivados por funcoes simples;
- nao ha persistencia append-only real.

### ArtifactEnvelope

Materializa a entrega duravel minima.

Limite atual:

- artifact usa `content.body` inline;
- nao ha storage externo;
- nao ha lifecycle de supersedencia ou rejeicao.

### ExecutionResult

Consolida a execucao.

Limite atual:

- cobre `succeeded`, `blocked` por policy deny corrigivel e `failed` por
  policy deny terminal;
- cobre `blocked` por Registry sem candidato elegivel;
- nao consolida approvals, partial, cancellation, registry failure terminal,
  capability failure ou artifact failure.

## Stubs existentes

### Policy

`runPolicyEffect` retorna `allow`, `deny` corrigivel ou `deny` terminal por
fixture explicita.

Por que e stub:

- o objetivo e validar transicoes deterministicas sem implementar engine real
  de policy, approvals ou linguagem completa de constraints.

### Registry

`runRegistryEffect` retorna um snapshot fixo e um unico candidato no caminho
feliz original. No cenario `registry_no_candidate`, retorna snapshot fixo
explicito com `considered_candidates: []`, `discarded_candidates: []` e
`eligible_candidate_count: 0`. No cenario `registry_multiple_eligible`,
retorna o mesmo snapshot versionado com dois candidatos elegiveis, podendo
enumerar internamente `[alpha, beta]` ou `[beta, alpha]`. No cenario
`registry_mixed_eligibility`, retorna snapshot versionado com dois candidatos
considerados, podendo enumerar internamente `[inactive, active]` ou
`[active, inactive]`. No cenario `registry_equal_rank_tiebreaker`, retorna
snapshot versionado com dois candidatos ativos, elegiveis e com o mesmo
`declared_priority`, podendo enumerar internamente `[tie_a, tie_b]` ou
`[tie_b, tie_a]`. No cenario `policy_allow_with_constraints`, retorna snapshot
versionado com dois candidatos intrinsecamente elegiveis, podendo enumerar
internamente `[constraint_a, constraint_b]` ou `[constraint_b, constraint_a]`.

Por que e stub:

- o objetivo e validar discovery deterministico sem implementar catalogo real.
- no cenario sem candidato, o objetivo e validar bloqueio por impossibilidade
  objetiva de roteamento sem fabricar candidatos descartados ou fallback.
- no cenario misto, o objetivo e validar que candidato inelegivel nao entra no
  ranking mesmo quando possui melhor `declared_priority`.
- no cenario de empate, o objetivo e validar que o desempate final canonico
  produz uma ordenacao total sem usar ordem incidental de array.
- no cenario com constraints, o objetivo e validar que o Registry nao esconde
  candidatos por constraint e que a avaliacao ocorre no kernel antes do
  ranking.
- `registry_source_ref` e explicito, versionado e congelado no snapshot;
- `snapshot_digest` e derivado de schema, source ref, scope, lookup criteria e
  records canonicos, sem incluir `snapshot_id` nem o proprio digest.

### Executor

`runExecutorEffect` produz um artefato fixo.

Por que e stub:

- o kernel nao deve implementar agentes, modelos ou adapters nesta fase.

### Artifact validation

`runArtifactEffect` marca o artefato como `valid`.

Por que e stub:

- ainda nao existem validadores reais nem criterios executaveis.

### Event store

Eventos vivem em `WorkState.events`.

Por que e stub:

- banco, storage, fila e infraestrutura foram explicitamente excluidos.

### IDs e tempo

`stableId` e `logicalTime` substituem relogio real e gerador aleatorio.

Por que e stub:

- determinismo exige que duas execucoes com os mesmos inputs gerem a mesma
  sequencia de objetos.

## Desvios em relacao aos contratos

### ExecutionStateMachine

O skeleton implementa o caminho feliz e dois fluxos de policy deny, usando
estados reduzidos.

Desvio:

- cobre `blocked` e `failed` apenas para policy deny;
- nao cobre `requires_approval`, `partial`, `cancelled`, `plan_resolving`
  como estado materializado separado, nem recovery.

Justificativa:

- o escopo pedido e validar uma task, uma capability e um executor.

### EventContract

Eventos possuem campos centrais, mas nao todos os condicionais previstos.

Desvio:

- `policy_ref`, `executor_ref`, `alternatives` e metadados condicionais nao
  sao preenchidos em todos os eventos em que poderiam aparecer.

Justificativa:

- o modulo prioriza a sequencia deterministica minima, nao cobertura completa
  do envelope de evento.

### RuntimeContextContract

Runtime Context referencia inputs basicos, mas nao todos os refs condicionais.

Desvio:

- `policy_refs`, `registry_refs`, `artifact_refs` e `executor_refs` nao foram
  modelados como campos separados.

Justificativa:

- `input_refs` preserva a rastreabilidade minima para o skeleton; refs
  condicionais completos devem entrar quando o runtime deixar de ser stub.

### EffectContract

Effects sao declarados e executados localmente por funcoes stub.

Desvio:

- nao existe separacao fisica entre declaration e runner externo.

Justificativa:

- nao ha infraestrutura, fila, API, SDK ou runner nesta fase. A separacao
  semantica ainda existe no codigo: State Machine declara, stubs executam.

### CapabilityContract

A capability `walking_skeleton.execute` existe apenas inline.

Desvio:

- nao ha registro externo ou documento proprio da capability de teste.

Justificativa:

- o objetivo e testar o percurso contratual, nao expandir catalogo real de
  capabilities.

### Registry

O snapshot do Registry e constante e embutido.

Desvio:

- nao ha entidade de Registry independente, nem snapshot armazenado.

Justificativa:

- o contrato permite snapshot como input versionado; aqui ele e simulado de
  forma deterministica para evitar infraestrutura.

### ExecutionResult

O resultado final e recalculado apos eventos de consolidacao.

Desvio:

- `runResultEffect` cria um draft antes da transicao final e `consolidateResult`
  cria o resultado final apos novos eventos;
- no caminho feliz, isso inclui `execution.completed`;
- nos fluxos de deny, isso inclui consolidacao de `blocked` ou `failed`;
- no fluxo `registry_no_candidate`, isso inclui consolidacao de `blocked`.

Justificativa:

- o skeleton precisa registrar eventos de consolidacao antes de devolver o
  result final com referencias completas.

## Avaliacao tecnica

O skeleton valida a arquitetura no nivel minimo pretendido:

- commands sao solicitacoes;
- commands que podem declarar trabalho externo materializam `effect_request`;
- Runtime Context captura estado derivado de eventos;
- State Machine declara effects;
- effects produzem evidencias por stubs;
- eventos formam a trilha de auditoria;
- artefato preserva conteudo duravel;
- result referencia eventos e artefatos;
- policy deny corrigivel vira `blocked` sem Registry, executor ou artifact de
  saida;
- policy deny terminal vira `failed` com erro classificado e sem Registry,
  executor ou artifact de saida;
- Registry sem candidato ocorre apos policy allow, registra snapshot
  versionado, registra conjunto de candidatos considerados vazio, emite
  `registry.lookup.no_candidate`, vira `blocked` e nao seleciona executor, nao
  invoca executor, nao inicia capability, nao declara attempt e nao cria
  artifact de saida;
- Registry com dois candidatos elegiveis registra snapshot versionado,
  normaliza candidatos em ordem canonica, aplica selection rule versionada,
  escolhe `executor.walking_skeleton.alpha`, registra
  `executor.walking_skeleton.beta` como alternativa elegivel nao selecionada por
  `ranked_lower`, invoca apenas o executor selecionado e termina em
  `succeeded`;
- Registry com eligibility mista registra snapshot versionado, normaliza dois
  candidatos considerados em ordem canonica, descarta
  `executor.walking_skeleton.mixed_a_inactive` por `frozen_status_not_active`
  com evidencia no Registry record versionado, ranqueia somente
  `executor.walking_skeleton.mixed_b_active`, invoca apenas o executor elegivel
  selecionado e termina em `succeeded`;
- Registry com ranking empatado registra snapshot versionado, normaliza dois
  candidatos elegiveis em ordem canonica, registra igualdade em
  `declared_priority`, aplica `canonical_candidate_identity`, escolhe
  `executor.walking_skeleton.tie_a`, registra
  `executor.walking_skeleton.tie_b` como alternativa elegivel nao selecionada
  por `tie_breaker_ranked_lower`, invoca apenas o executor selecionado e
  termina em `succeeded`;
- Policy allow with constraints registra constraint set tipado e versionado,
  descobre dois candidatos pelo Registry sem constraint pushdown, confirma que
  ambos passam na eligibility intrinseca, descarta
  `executor.walking_skeleton.constraint_a_high_risk` por
  `policy_constraint_failed`, ranqueia somente
  `executor.walking_skeleton.constraint_b_low_risk`, invoca apenas o executor
  selecionado e termina em `succeeded`;
- duas execucoes iguais do mesmo cenario produzem fingerprint igual.
- duas enumeracoes internas opostas do mesmo Registry snapshot produzem o mesmo
  ranking, mesmo executor selecionado, mesmo artifact, mesmo result, mesmo
  replay e mesmo fingerprint canonico.
- duas enumeracoes internas opostas do snapshot misto preservam o mesmo
  candidato inelegivel, a mesma evidencia de descarte, ranking com apenas o
  candidato elegivel, mesmo artifact, mesmo result, mesmo replay e mesmo
  fingerprint canonico.
- duas enumeracoes internas opostas do snapshot empatado preservam os mesmos
  candidatos elegiveis, a mesma igualdade em ranking key, as mesmas tuplas de
  desempate, mesmo artifact, mesmo result, mesmo replay e mesmo fingerprint
  canonico.
- duas enumeracoes internas opostas do snapshot com constraints preservam os
  mesmos candidatos considerados, os mesmos resultados de eligibility
  intrinseca, o mesmo descarte por constraint, o mesmo ranking final, mesmo
  artifact, mesmo result, mesmo replay e mesmo fingerprint canonico.

Ele ainda nao valida:

- falhas terminais de Registry, executor, capability, artifact ou consolidacao;
- retries;
- recovery;
- approvals;
- memoria decisiva;
- multiplas capabilities;
- empate irresoluvel apos o desempate canonico;
- selection bloqueado por todos os candidatos serem inelegiveis;
- todos os candidatos falhando Policy constraints;
- constraint set invalido ou operador desconhecido;
- persistencia append-only.
