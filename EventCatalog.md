# EventCatalog

Versao: `0.1.0-draft`

Este documento especifica, em alto nivel, o catalogo conceitual de eventos do
runtime do Workflow V2.

O `EventCatalog` nao substitui o `EventContract`. O `EventContract` define o
envelope universal de eventos. O `EventCatalog` organiza as familias de eventos
que o runtime deve reconhecer, quando elas surgem, quem pode origina-las e
quais invariantes precisam respeitar.

Nao ha implementacao, pseudocodigo, SDK, CLI, servidor ou banco nesta
especificacao.

## Papel dos eventos

Eventos sao fatos imutaveis.

Eles existem para registrar o que aconteceu no runtime, em qual ordem causal,
com quais inputs versionados e com quais consequencias auditaveis.

Eventos devem permitir:

- replay completo de uma execucao;
- auditoria de decisoes;
- reconstrucao de estado;
- correlacao entre task, plan, capability, policy, registry, executor,
  artifact e result;
- explicacao segura de falhas, retries, timeouts e recovery;
- extensao futura sem depender de personas, prompts, modelos ou memoria
  implicita.

Eventos nao existem para carregar conteudo duravel. Esse papel pertence a
artefatos.

## Principios

- Eventos registram fatos, nao intencoes.
- Commands solicitam mudanca; eventos confirmam o que foi aceito.
- Effects representam trabalho externo solicitado; eventos registram o fato
  observado ou concluido.
- Artefatos preservam conteudo duravel; eventos referenciam artefatos.
- Eventos devem ser append-only.
- Toda decisao relevante deve ser deterministica e auditavel.
- Todo evento decisivo deve referenciar inputs versionados.
- Nenhum evento pode depender de persona, prompt, modelo ou memoria implicita.
- Eventos devem ser seguros para observability.
- Eventos nao devem conter secrets, payloads crus ou conteudo completo de
  artefatos.

## Commands, Effects, Events e Artifacts

### Commands

Commands sao solicitacoes.

Eles pedem que a State Machine avalie uma mudanca, como aceitar uma task,
iniciar resolucao de plano, registrar timeout ou solicitar retry.

Commands:

- nao sao fatos historicos;
- nao sao fonte de verdade;
- podem ser rejeitados;
- devem carregar referencias versionadas quando influenciam decisao;
- nao devem substituir eventos.

### Effects

Effects sao trabalhos externos declarados pela State Machine.

Eles podem solicitar policy check, registry lookup, executor invocation,
artifact validation, approval request, timeout scheduling ou recovery scan.

Effects:

- nao sao fatos ate retornarem evidencia;
- nao devem ser executados implicitamente;
- devem ser auditaveis por eventos;
- nao devem alterar estado sem evento correspondente.

### Events

Events sao fatos registrados segundo o `EventContract`.

Eles indicam que algo aconteceu, foi decidido, falhou, foi validado ou foi
reconciliado.

Events:

- sao append-only;
- preservam causalidade;
- sustentam replay;
- explicam transicoes;
- referenciam artefatos e inputs versionados;
- nao carregam conteudo duravel completo.

### Artifacts

Artifacts preservam conteudo duravel por meio do `ArtifactEnvelope`.

Eles podem representar documentos, decisoes, planos, patches, relatorios,
traces e manifestos.

Artifacts:

- sao fonte de verdade de conteudo;
- podem ser referenciados por eventos;
- nao substituem eventos;
- nao registram causalidade por si so.

## Familias de eventos

As familias abaixo organizam o vocabulario conceitual do runtime. Elas nao
definem schema novo. Todo evento continua obedecendo ao `EventContract`.

### Execution lifecycle events

Registram o ciclo principal de uma execucao.

Quando surgem:

- task aceita;
- plano entra em resolucao;
- execucao inicia uma fase relevante;
- execucao chega a estado terminal;
- execucao e cancelada.

Quem pode originar:

- `ExecutionEngine`;
- `ExecutionStateMachine`;
- runtime autorizado.

Exemplos conceituais:

- `execution.task.accepted`;
- `execution.started`;
- `execution.completed`;
- `execution.failed`;
- `execution.cancelled`.

Invariantes:

- devem referenciar `task_id` e `trace_id`;
- devem registrar transicao quando mudarem estado;
- nao devem carregar conteudo de task alem de resumo seguro;
- devem ser coerentes com `ExecutionResult`;
- eventos terminais devem referenciar `result_id` e `result_version` quando
  um `ExecutionResult` ja existir.

### Plan events

Registram resolucao, validacao ou rejeicao de `CapabilityPlan`.

Quando surgem:

- resolucao de plano inicia;
- plano e resolvido;
- plano e validado;
- plano fica bloqueado ou invalido.

Quem pode originar:

- `ExecutionEngine`;
- State Machine;
- componente de orchestration autorizado.

Exemplos conceituais:

- `execution.plan.resolution.started`;
- `execution.plan.resolution.completed`;
- `execution.plan.invalid`;
- `execution.plan.blocked`.

Invariantes:

- eventos de inicio podem existir antes de `plan_id`;
- eventos de plano resolvido ou validado devem referenciar `plan_id` e
  `plan_version`;
- eventos bloqueados antes de existir plano devem registrar motivo seguro e
  referencias versionadas do input ou contrato ausente;
- devem preservar `task_id` e `trace_id`;
- nao podem incluir persona como criterio de planejamento;
- devem apontar para contratos de capability quando a decisao depender deles.

### Policy events

Registram avaliacoes e outcomes do `PolicyEngine`.

Quando surgem:

- task, plano, capability, artifact, executor metadata ou execution precisam
  de policy gate;
- policy retorna `allow`, `deny`, `allow_with_constraints` ou
  `requires_approval`;
- constraints sao aplicadas ou bloqueiam progresso.

Quem pode originar:

- `PolicyEngine`;
- `ExecutionEngine`, ao registrar outcome recebido;
- State Machine, ao aplicar outcome versionado.

Exemplos conceituais:

- `policy.check.started`;
- `policy.check.completed`;
- `policy.decision.allowed`;
- `policy.decision.denied`;
- `policy.decision.allowed_with_constraints`;
- `policy.decision.requires_approval`.

Invariantes:

- devem referenciar policy id e policy version;
- eventos decisivos devem referenciar `policy_decision_id` e sua versao, ou
  uma referencia equivalente para a decisao versionada;
- devem registrar subject avaliado;
- devem registrar outcome seguro;
- nao devem carregar regras internas completas de policy;
- nao podem ampliar permissao alem do contrato avaliado.

### Registry events

Registram consultas, snapshots e descartes relacionados ao Registry.

Quando surgem:

- snapshot do Registry e criado ou usado;
- lookup por capability e version ocorre;
- candidatos sao encontrados;
- candidatos sao descartados;
- nenhum candidato valido existe.

Quem pode originar:

- Registry;
- `ExecutionEngine`, ao registrar consulta decisiva;
- State Machine, ao aplicar resultado versionado.

Exemplos conceituais:

- `registry.snapshot.created`;
- `registry.lookup.started`;
- `registry.lookup.completed`;
- `registry.record.matched`;
- `registry.record.discarded`.

Invariantes:

- devem referenciar Registry snapshot;
- devem referenciar `capability_id` e `capability_version`;
- devem registrar candidatos considerados e descartados quando houver selecao;
- candidatos considerados e descartados devem incluir `candidate_id` e
  `candidate_metadata_version`;
- descartes devem registrar motivo seguro;
- nao podem retornar "melhor executor";
- nao podem depender de persona, prompt, modelo ou estado vivo sem snapshot.

### Executor selection events

Registram a escolha de executor opaco para uma capability.

Quando surgem:

- candidatos do Registry foram avaliados;
- policy constraints foram aplicadas;
- desempate deterministico foi usado;
- executor final foi escolhido ou nenhum candidato foi aceito.

Quem pode originar:

- `ExecutionEngine`;
- State Machine.

Exemplos conceituais:

- `execution.executor.selection.started`;
- `execution.executor.selected`;
- `execution.executor.candidate.discarded`;
- `execution.executor.selection.blocked`.

Invariantes:

- devem registrar executor id opaco;
- devem registrar metadados versionados do executor;
- devem referenciar Registry snapshot usado;
- devem referenciar `capability_id` e `capability_version`;
- devem referenciar outcome ou constraints de policy aplicados;
- devem registrar alternativas descartadas;
- devem registrar criterio deterministico de selecao e sua versao;
- nao podem usar nome narrativo, tom, persona ou modelo como criterio.

### Capability execution events

Registram execucao de capability por executor autorizado.

Quando surgem:

- capability inicia;
- progresso relevante e seguro precisa ser observado;
- capability conclui;
- capability falha;
- capability exige aprovacao ou input adicional.

Quem pode originar:

- executor autorizado;
- capability runner futuro;
- `ExecutionEngine`, ao aceitar evidencia do executor;
- State Machine, ao aplicar conclusao.

Exemplos conceituais:

- `capability.execution.started`;
- `capability.progress.updated`;
- `capability.execution.completed`;
- `capability.execution.failed`;
- `capability.execution.blocked`.

Invariantes:

- devem referenciar `capability_id` e `capability_version`;
- devem referenciar `executor_id` e executor metadata version quando executor
  estiver envolvido;
- devem referenciar `attempt_id` ou tentativa equivalente quando houver retry,
  timeout ou multiplas tentativas;
- devem preservar `task_id` e `trace_id`;
- devem respeitar policy envelope;
- nao podem elevar permissao;
- nao podem embutir prompt, chain-of-thought ou payload sensivel.

### Artifact events

Registram relacao entre runtime e artefatos.

Quando surgem:

- artefato e proposto;
- artefato e produzido;
- artefato e usado como input;
- artefato e validado;
- artefato e rejeitado;
- artefato substitui outro.

Quem pode originar:

- Artifact Generation;
- `ExecutionEngine`;
- executor autorizado, quando permitido;
- State Machine, ao aplicar validacao.

Exemplos conceituais:

- `artifact.proposed`;
- `artifact.created`;
- `artifact.used`;
- `artifact.validation.completed`;
- `artifact.rejected`;
- `artifact.superseded`.

Invariantes:

- devem referenciar `artifact_id` e `artifact_version`;
- devem usar `artifact_refs`;
- nao devem embutir `content.body`;
- devem respeitar `ArtifactEnvelope`;
- devem registrar validacao sem substituir o envelope.

### Result events

Registram consolidacao e fechamento do `ExecutionResult`.

Quando surgem:

- consolidacao de resultado inicia;
- status global e derivado;
- resultado e concluido;
- resultado parcial ou falho e definido.

Quem pode originar:

- `ExecutionEngine`;
- State Machine.

Exemplos conceituais:

- `execution.result.consolidation.started`;
- `execution.result.consolidation.completed`;
- `execution.result.partial`;
- `execution.result.failed`.

Invariantes:

- devem referenciar `result_id` quando existir;
- devem ser coerentes com eventos de capability, artifact e policy;
- nao devem duplicar artifact content;
- nao devem esconder falhas obrigatorias.

### Failure and blocking events

Registram bloqueios, falhas e erros seguros.

Quando surgem:

- input obrigatorio ausente;
- contrato ausente;
- policy negada;
- Registry sem candidato;
- executor indisponivel;
- artifact invalido;
- sucesso nao cumprido;
- erro inesperado ocorre.

Quem pode originar:

- State Machine;
- `ExecutionEngine`;
- `PolicyEngine`;
- Registry;
- Artifact Generation;
- executor autorizado.

Exemplos conceituais:

- `execution.blocked`;
- `execution.failed`;
- `capability.execution.failed`;
- `artifact.validation.failed`;
- `registry.lookup.failed`.

Invariantes:

- devem registrar codigo seguro;
- devem indicar se a falha e bloqueante, recuperavel ou terminal;
- nao devem conter stack trace longo;
- nao devem conter secrets ou payload bruto;
- devem preservar estado resultante.

### Approval events

Registram necessidade, concessao, recusa ou expiracao de aprovacao.

Quando surgem:

- policy exige aprovacao;
- aprovacao e solicitada;
- aprovacao e concedida;
- aprovacao e recusada;
- aprovacao expira.

Quem pode originar:

- `PolicyEngine`;
- `ExecutionEngine`;
- State Machine;
- sistema de aprovacao futuro, quando existir.

Exemplos conceituais:

- `execution.approval.required`;
- `execution.approval.requested`;
- `execution.approval.granted`;
- `execution.approval.denied`;
- `execution.approval.expired`.

Invariantes:

- devem referenciar `approval_id` ou identidade equivalente da aprovacao;
- devem referenciar policy decision versionada;
- devem registrar status da aprovacao;
- devem registrar motivo seguro;
- devem preservar quem ou o que aprovou por identificador seguro;
- nao devem conter credenciais ou dados sensiveis.

### Retry and timeout events

Registram tentativas, timeouts e resultados tardios.

Quando surgem:

- timeout e agendado como effect;
- timeout ocorre;
- retry e solicitado;
- retry e aceito ou rejeitado;
- resultado chega depois do timeout.

Quem pode originar:

- State Machine;
- `ExecutionEngine`;
- scheduler futuro;
- executor autorizado ao reportar resultado tardio.

Exemplos conceituais:

- `execution.timeout.scheduled`;
- `execution.timeout.occurred`;
- `execution.retry.requested`;
- `execution.retry.accepted`;
- `execution.retry.rejected`;
- `execution.late_result.observed`.

Invariantes:

- devem referenciar `attempt_id` atual;
- devem referenciar tentativa anterior quando houver;
- devem referenciar a origem versionada do timeout ou retry, como policy,
  capability contract, deadline da task ou runtime context;
- devem registrar motivo seguro;
- devem respeitar policy e capability contract;
- nao podem apagar falha anterior;
- nao podem repetir effect externo sem garantia de idempotencia registrada.

### Recovery events

Registram replay, reconciliacao e retomada.

Quando surgem:

- recovery inicia;
- event stream e replayed;
- effects pendentes sao reconciliados;
- divergencia e encontrada;
- nenhuma acao e necessaria;
- execucao e retomada ou bloqueada.

Quem pode originar:

- State Machine;
- `ExecutionEngine`;
- recovery runner futuro.

Exemplos conceituais:

- `execution.recovery.started`;
- `execution.recovery.replayed`;
- `execution.recovery.reconciled`;
- `execution.recovery.no_action_required`;
- `execution.recovery.inconsistency_detected`;
- `execution.recovery.completed`.

Invariantes:

- toda reconciliacao deve gerar evento;
- decisao de nenhuma acao necessaria deve gerar evento explicito;
- recovery nao pode inventar eventos faltantes;
- recovery nao pode preencher gaps com memoria implicita;
- recovery deve respeitar terminalidade.

### Observability events

Registram observacoes seguras que ajudam diagnostico sem virar log bruto.

Quando surgem:

- runtime precisa expor progresso seguro;
- diagnostico operacional precisa ser correlacionado;
- redacao ou classificacao de dado sensivel e aplicada;
- metrica ou trace conceitual precisa ser ligado a execucao.

Quem pode originar:

- Observability;
- `ExecutionEngine`;
- State Machine;
- componentes autorizados nas bordas.

Exemplos conceituais:

- `observability.trace.started`;
- `observability.trace.completed`;
- `observability.diagnostic.recorded`;
- `observability.redaction.applied`.

Invariantes:

- sao nao decisivos por padrao;
- so participam de replay decisivo quando referenciados explicitamente como
  input versionado;
- devem ser seguros para leitura operacional;
- nao devem conter secrets;
- nao devem conter payload cru;
- nao substituem eventos de decisao;
- nao substituem artefatos.

## Origem dos eventos

Origem significa componente autorizado a emitir ou registrar um fato.

Componentes podem originar eventos somente dentro de sua responsabilidade:

- `ExecutionEngine`: lifecycle, selecao, consolidacao, falhas e fechamento;
- State Machine: transicoes, recovery, retries, timeouts e aplicacao de
  commands aceitos;
- `PolicyEngine`: outcomes de policy e constraints;
- Registry: snapshots, lookups e metadados de discovery;
- Artifact Generation: proposta, criacao, validacao e rejeicao de artefatos;
- executors: eventos de capability, somente dentro do contrato recebido;
- Observability: diagnosticos seguros e correlacao;
- scheduler futuro: timeouts e sinais temporais, quando definido.

Nenhuma origem pode emitir evento que amplie sua autoridade. Um executor nao
pode registrar uma decisao final de policy. Registry nao pode registrar selecao
final de executor. Observability nao pode substituir evento de transicao.

## Invariantes globais

Todo evento catalogado deve:

- obedecer ao `EventContract`;
- ter `event_id`;
- ter `event_version`;
- pertencer a um `trace_id`;
- pertencer a um `task_id`;
- ter `event_type`;
- ter uma familia primaria definida para o `event_type`;
- ter produtor identificado;
- ter assunto identificado;
- preservar causalidade;
- referenciar inputs versionados quando for decisivo;
- referenciar artifacts por id e version, sem copiar conteudo;
- referenciar Registry snapshot quando envolver Registry;
- referenciar policy id e version quando envolver policy;
- registrar alternativas descartadas quando envolver selecao;
- permitir classificacoes secundarias somente como tags conceituais que nao
  alteram a familia primaria nem suas invariantes;
- ser seguro para observability;
- evitar secrets, prompts, personas, modelos e payloads crus.

## Relacao com replay

Replay usa eventos como fonte de verdade operacional.

O catalogo deve permitir reconstruir:

- estado atual da execucao;
- ordem causal;
- decisions tomadas;
- policies aplicadas;
- Registry snapshot usado;
- executor selecionado;
- artifacts produzidos ou validados;
- falhas, retries, timeouts e recovery;
- caminho ate o `ExecutionResult`.

Replay nao deve:

- executar effects novamente;
- consultar estado `latest`;
- usar memoria implicita;
- reinterpretar policy sem versao;
- buscar Registry sem snapshot;
- reconstruir conteudo de artifact a partir de evento.

## Relacao com auditabilidade

Auditabilidade exige que eventos expliquem decisoes, nao apenas marquem que
algo aconteceu.

Eventos de decisao devem preservar:

- input considerado;
- versao ou snapshot do input;
- criterio aplicado;
- outcome;
- alternativas descartadas, quando houver;
- motivo seguro;
- artifact de decisao quando a justificativa for duravel.

Quando um evento nao for suficiente para preservar justificativa duravel, ele
deve apontar para artifact do tipo `decision`.

## Extensibilidade

Novas familias ou tipos de evento podem ser adicionados sem quebrar historico.

Regras:

- nao alterar significado de eventos existentes;
- nao remover tipos historicos;
- manter compatibilidade com `EventContract`;
- declarar familia, origem autorizada e invariantes;
- preservar replay de execucoes antigas;
- versionar mudancas incompativeis;
- registrar migracao explicita quando necessario;
- evitar tipos baseados em persona, modelo ou prompt.

Mudancas compativeis:

- adicionar novo tipo de evento dentro de familia existente;
- adicionar nova familia com fronteira clara;
- adicionar metadado opcional permitido pelo `EventContract`;
- refinar descricao sem alterar semantica.

Mudancas incompativeis:

- mudar significado de evento existente;
- tornar evento decisivo nao versionado;
- remover referencia obrigatoria para replay;
- permitir conteudo bruto sensivel;
- transformar evento em storage de artifact, command ou effect.

## Relacao com documentos centrais

### EventContract

Define envelope, identidade, versionamento, causalidade e campos minimos.

O catalogo apenas organiza tipos e familias conceituais.

### ExecutionStateMachine

Define estados, commands, effects e transicoes.

O catalogo define quais eventos podem registrar fatos produzidos por essas
transicoes.

### ExecutionEngine

Coordena o ciclo operacional.

O catalogo orienta quais fatos o engine deve registrar para manter auditoria.

### ArtifactEnvelope

Preserva conteudo duravel.

Eventos do catalogo referenciam artifacts, mas nao carregam conteudo.

### ExecutionResult

Consolida status final.

Eventos explicam como o resultado foi derivado.

### Registry

Fornece snapshots e candidatos.

Eventos de registry registram discovery e descarte, nao selecao final.

### PolicyEngine

Decide permissao, negacao, constraints e aprovacao.

Eventos de policy registram outcomes e referencias versionadas, nao regras
internas completas.

## Pontos em aberto

- Definir lista final de `event_type`.
- Definir convencao final de namespaces.
- Definir quais eventos sao obrigatorios por estado.
- Definir quais eventos exigem artifact `decision`.
- Definir severidade ou classificacao operacional de eventos.
- Definir estrategia de migracao entre versoes do catalogo.
- Definir relacao futura entre EventCatalog e State Machine versionada.
- Definir quais eventos de observability sao derivados e quais sao primarios.
- Definir catalogo final de retry, timeout e recovery.
- Definir regras de retencao sem escolher storage agora.

## Nao objetivos

- Redesenhar `EventContract`.
- Implementar emissao de eventos.
- Implementar event store.
- Implementar replay engine.
- Implementar maquina de estados.
- Implementar scheduler.
- Implementar Registry.
- Implementar Policy Engine.
- Implementar runtime.
- Criar SDK, CLI, servidor ou banco.
- Criar agentes.
- Criar prompts.
- Escolher modelo ou provedor.
- Definir storage, retencao ou persistencia real.
