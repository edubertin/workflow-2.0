# ExecutionStateMachine

Versao: `0.1.0-draft`

Este documento especifica, em alto nivel, a maquina de estados do
`ExecutionEngine` do Workflow V2.

A maquina de estados nao redesenha o `EventContract`. Ela usa eventos como
fatos auditaveis para reconstruir uma execucao de forma deterministica.

Esta especificacao e arquitetural. Ela nao implementa codigo, pseudocodigo,
SDK, CLI, servidor, banco ou scheduler.

## Objetivo

A maquina de estados define quais estados uma execucao pode assumir, quais
transicoes sao permitidas, quais comandos podem solicitar transicoes, quais
eventos registram fatos, quais efeitos colaterais podem ser produzidos e qual
contexto e necessario para validar cada decisao.

Ela existe para garantir:

- determinismo;
- replay completo;
- auditabilidade;
- separacao entre decisao e efeito externo;
- evolucao controlada de novos estados;
- consistencia entre `TaskEnvelope`, `CapabilityPlan`, `CapabilityContract`,
  `PolicyEngine`, `Registry`, `ArtifactEnvelope`, `EventContract` e
  `ExecutionResult`.

## Modelo conceitual

```text
Command
  |
  v
State Machine + Runtime Context
  |
  +-- validates allowed transition
  +-- derives Events
  +-- declares Effects
  |
  v
Event Stream
  |
  v
Replay -> Current State
```

Comandos solicitam mudanca. Eventos registram fatos. Efeitos representam
trabalho externo solicitado pela decisao. Runtime Context fornece os inputs
versionados necessarios para validar a transicao.

## Responsabilidades isoladas

### State Machine

A State Machine e a autoridade sobre transicoes de estado.

Responsabilidades:

- conhecer estados validos;
- validar transicoes permitidas;
- rejeitar transicoes fora de ordem;
- exigir inputs versionados para decisoes;
- derivar eventos a partir de comandos validos;
- declarar efeitos necessarios;
- reconstruir estado por replay de eventos;
- preservar terminalidade de estados finais;
- falhar fechado quando contexto decisivo estiver ausente.

A State Machine nao deve:

- executar efeitos externos;
- consultar Registry diretamente;
- avaliar policy diretamente;
- executar capabilities;
- validar artefatos por conta propria;
- criar `ExecutionResult` fora das evidencias;
- conhecer personas, prompts, modelos ou provedores.

### Commands

Commands sao solicitacoes para a State Machine avaliar uma transicao.

Responsabilidades:

- declarar a intencao da mudanca;
- apontar para a execucao alvo;
- carregar referencias versionadas necessarias;
- informar o gatilho da solicitacao;
- ser idempotentes no nivel conceitual;
- nao representar fatos historicos.

Commands nao sao fonte de verdade. Um command rejeitado nao muda estado. Um
command aceito deve resultar em evento, efeito declarado ou ambos.

Exemplos conceituais de commands:

- aceitar task;
- iniciar resolucao de plano;
- concluir resolucao de plano;
- aplicar decisao de policy;
- iniciar consulta ao Registry;
- aplicar resultado de Registry;
- selecionar executor;
- iniciar execucao de capability;
- registrar conclusao de capability;
- registrar falha;
- coletar artefatos;
- consolidar resultado;
- cancelar execucao;
- registrar timeout;
- solicitar retry;
- recuperar execucao por replay.

### Events

Events sao fatos imutaveis definidos pelo `EventContract`.

Responsabilidades:

- registrar transicoes aceitas;
- registrar decisoes relevantes;
- preservar causalidade;
- referenciar inputs versionados;
- apontar para artefatos, policies e snapshots;
- permitir replay completo;
- explicar o caminho ate o `ExecutionResult`.

Eventos nao devem:

- conter conteudo completo de artefatos;
- carregar estado operacional inteiro;
- conter decisao completa de policy;
- conter memoria implicita;
- conter prompts, personas ou modelos;
- substituir commands;
- substituir effects.

### Effects

Effects sao efeitos colaterais solicitados pela State Machine, mas executados
fora dela.

Responsabilidades:

- representar trabalho externo necessario para progredir;
- preservar separacao entre decisao deterministica e mundo externo;
- ser derivados de estado, command e contexto versionado;
- resultar em novos commands ou eventos quando completados;
- ser auditaveis por eventos.

Tipos de effects:

- policy check;
- registry lookup;
- executor invocation;
- artifact validation;
- approval request;
- timeout scheduling;
- cancellation request;
- result exposure;
- recovery scan.

Effects nao devem ser aplicados implicitamente. A maquina declara que um efeito
deve ocorrer; outro componente executa esse efeito e retorna uma evidencia
versionada.

### Runtime Context

Runtime Context e o conjunto de referencias versionadas disponiveis para uma
decisao.

Pode conter:

- `TaskEnvelope`;
- `CapabilityPlan`;
- `CapabilityContract`;
- policy id e policy version;
- policy decision;
- Registry snapshot;
- executor metadata versionado;
- `ArtifactEnvelope`;
- eventos anteriores;
- referencias de Memory autorizadas por policy;
- clock ou timeout registrado como evento.

Runtime Context nao deve conter:

- estado `latest` sem versao;
- memoria implicita;
- prompt;
- chain-of-thought;
- segredo;
- payload cru sensivel;
- persona;
- modelo como criterio central.

## Estados

### accepted

A execucao foi aceita como `TaskEnvelope` valido.

Entrada esperada:

- task versionada;
- `task_id`;
- `trace_id`.

Proximo passo normal:

- `plan_resolving`.

### plan_resolving

O plano de capacidades esta sendo resolvido ou validado.

Entrada esperada:

- `TaskEnvelope`;
- contratos de capability conhecidos ou referencias para validacao.

Proximos passos normais:

- `plan_ready`;
- `blocked`;
- `failed`.

### plan_ready

O `CapabilityPlan` esta estruturalmente valido.

Entrada esperada:

- `plan_id`;
- `plan_version`;
- capabilities por id e versao;
- artefatos esperados;
- criterios de sucesso.

Proximo passo normal:

- `policy_checking`.

### policy_checking

Policies estao avaliando a task, o plano, a capability, os artefatos ou
metadados de executor.

Entrada esperada:

- policies versionadas;
- subject avaliado;
- side effects declarados;
- inputs versionados.

Proximos passos normais:

- `registry_lookup`;
- `requires_approval`;
- `blocked`;
- `failed`.

### registry_lookup

O Registry esta sendo consultado por candidatos compativeis com a capability.

Entrada esperada:

- `capability_id`;
- `capability_version`;
- Registry snapshot ou resultado versionado de consulta.

Proximos passos normais:

- `executor_selecting`;
- `blocked`;
- `failed`.

### executor_selecting

O runtime esta selecionando executor por criterios objetivos e auditaveis.

Entrada esperada:

- candidatos do Registry;
- metadados versionados;
- constraints de policy;
- regra deterministica de desempate.

Proximos passos normais:

- `running`;
- `blocked`;
- `failed`.

### running

A capability esta em execucao por um executor opaco.

Entrada esperada:

- executor selecionado;
- contexto minimo autorizado;
- policy envelope;
- artifact requirements;
- timeout aplicavel.

Proximos passos normais:

- `artifact_collecting`;
- `requires_approval`;
- `failed`;
- `cancelled`.

### artifact_collecting

Artefatos produzidos, propostos ou exigidos estao sendo coletados e validados.

Entrada esperada:

- referencias a `ArtifactEnvelope`;
- criterios de validacao;
- eventos de producao ou proposta.

Proximos passos normais:

- `result_consolidating`;
- `partial`;
- `blocked`;
- `failed`.

### result_consolidating

O resultado final esta sendo derivado de eventos, artifacts e outcomes por
capability.

Entrada esperada:

- eventos relevantes;
- resultados por capability;
- artefatos validados;
- outcomes de policy;
- falhas ou pendencias.

Proximos passos normais:

- `completed`;
- `partial`;
- `failed`.

### completed

Execucao concluida com sucesso.

Estado terminal.

### partial

Execucao concluida parcialmente.

Estado terminal para o ciclo atual, mas pode originar nova task futura para
pendencias explicitas.

### blocked

Execucao nao pode prosseguir sem mudanca de contexto, contrato, policy,
Registry ou input.

Estado nao terminal quando houver novo input versionado que desbloqueie a
execucao.

### requires_approval

Execucao depende de aprovacao humana ou autorizacao externa.

Estado nao terminal enquanto aguarda decisao. Pode transicionar para
`policy_checking`, `running`, `blocked`, `failed` ou `cancelled`, conforme o
resultado da aprovacao.

### failed

Execucao tentou prosseguir e nao cumpriu criterio obrigatorio ou encontrou
falha irrecuperavel.

Estado terminal para o ciclo atual, salvo recovery explicito que abra uma nova
execucao ou replay para diagnostico.

### cancelled

Execucao foi interrompida por solicitacao, policy ou contexto operacional.

Estado terminal.

## Diagrama textual de estados

```text
accepted
  -> plan_resolving

plan_resolving
  -> plan_ready
  -> blocked
  -> failed

plan_ready
  -> policy_checking

policy_checking
  -> registry_lookup
  -> requires_approval
  -> blocked
  -> failed

requires_approval
  -> policy_checking
  -> running
  -> blocked
  -> failed
  -> cancelled

registry_lookup
  -> executor_selecting
  -> blocked
  -> failed

executor_selecting
  -> running
  -> blocked
  -> failed

running
  -> artifact_collecting
  -> requires_approval
  -> failed
  -> cancelled

artifact_collecting
  -> result_consolidating
  -> partial
  -> blocked
  -> failed

result_consolidating
  -> completed
  -> partial
  -> failed

completed
  -> terminal

partial
  -> terminal for current execution

failed
  -> terminal for current execution

cancelled
  -> terminal
```

## Transicoes permitidas

Cada transicao deve ser causada por command, validada pela State Machine e
registrada por evento.

### accepted -> plan_resolving

Gatilho:

- task aceita para resolucao.

Validacoes:

- `TaskEnvelope` presente;
- `task_id` e `trace_id` presentes;
- side effects permitidos declarados;
- evento de aceite emitivel.

Efeitos:

- solicitar resolucao ou validacao de `CapabilityPlan`.

Eventos:

- `execution.task.accepted`;
- `execution.plan.resolution.started`.

### plan_resolving -> plan_ready

Gatilho:

- plano resolvido ou validado.

Validacoes:

- plano referencia a task correta;
- plano possui `plan_id` e versao;
- capabilities possuem id e versao;
- dependencias sao validas;
- artefatos esperados sao compativeis com `ArtifactEnvelope`;
- nenhum passo depende de persona.

Efeitos:

- solicitar policy check do plano.

Eventos:

- `execution.plan.resolution.completed`.

### plan_resolving -> blocked

Gatilho:

- plano nao pode ser resolvido por ausencia de contrato, escopo ambiguo ou
  input insuficiente.

Validacoes:

- causa objetiva registrada;
- input ausente ou ambiguo identificado;
- falha nao e erro tecnico irrecuperavel.

Efeitos:

- solicitar input, contrato ou decisao arquitetural.

Eventos:

- `execution.blocked`.

### plan_ready -> policy_checking

Gatilho:

- plano pronto precisa de avaliacao de policy.

Validacoes:

- plano versionado;
- policies aplicaveis identificadas;
- side effects agregados conhecidos.

Efeitos:

- solicitar avaliacao do `PolicyEngine`.

Eventos:

- `policy.check.started`.

### policy_checking -> registry_lookup

Gatilho:

- policy retornou `allow` ou `allow_with_constraints`.

Validacoes:

- policy id e version presentes;
- outcome registrado;
- constraints explicitas quando existirem;
- nenhuma permissao foi ampliada.

Efeitos:

- consultar Registry por capability id e versao.

Eventos:

- `policy.check.completed`.

### policy_checking -> requires_approval

Gatilho:

- policy retornou `requires_approval`.

Validacoes:

- aprovacao requerida descrita;
- motivo seguro registrado;
- acao bloqueada ate aprovacao.

Efeitos:

- solicitar aprovacao.

Eventos:

- `policy.decision.requires_approval`;
- `execution.approval.required`.

### policy_checking -> blocked

Gatilho:

- policy retornou `deny` por contexto corrigivel ou input ausente.

Validacoes:

- motivo seguro;
- input ou constraint que desbloqueia identificado.

Efeitos:

- nenhum efeito externo de execucao.

Eventos:

- `policy.decision.denied`;
- `execution.blocked`.

### registry_lookup -> executor_selecting

Gatilho:

- Registry retornou candidatos compativeis.

Validacoes:

- snapshot do Registry presente;
- candidatos possuem metadados versionados;
- capability id e versao correspondem ao plano;
- candidatos proibidos por policy ja foram descartados ou marcados.

Efeitos:

- iniciar selecao deterministica.

Eventos:

- `registry.lookup.completed`.

### registry_lookup -> blocked

Gatilho:

- nenhum candidato valido foi encontrado, mas o bloqueio pode ser resolvido por
  novo registro, novo contrato ou ajuste de policy.

Validacoes:

- snapshot registrado;
- candidatos descartados e motivos preservados;
- causa objetiva documentada.

Efeitos:

- nenhum executor invocado.

Eventos:

- `execution.blocked`.

### executor_selecting -> running

Gatilho:

- executor selecionado por criterio deterministico.

Validacoes:

- todos os candidatos considerados registrados;
- alternativas descartadas registradas;
- criterio de desempate versionado;
- executor suporta capability e versao;
- constraints de policy respeitadas;
- contexto minimo preparado.

Efeitos:

- invocar executor;
- agendar timeout aplicavel;
- ativar observabilidade.

Eventos:

- `execution.executor.selected`;
- `execution.context.prepared`;
- `capability.execution.started`.

### running -> artifact_collecting

Gatilho:

- capability concluiu ou produziu artefatos suficientes para validacao.

Validacoes:

- evento de conclusao ou falha parcial presente;
- outputs seguros;
- artifact refs presentes quando exigidos;
- policy nao foi violada.

Efeitos:

- validar artifact envelopes;
- coletar referencias para consolidacao.

Eventos:

- `capability.execution.completed`;
- `capability.artifact.proposed`.

### running -> failed

Gatilho:

- falha irrecuperavel na capability obrigatoria.

Validacoes:

- codigo de falha seguro;
- retry nao permitido ou esgotado;
- capacidade obrigatoria identificada.

Efeitos:

- cancelar efeitos pendentes quando aplicavel;
- preparar consolidacao de falha.

Eventos:

- `capability.execution.failed`;
- `execution.failed`.

### artifact_collecting -> result_consolidating

Gatilho:

- artefatos obrigatorios foram coletados e validados, ou falhas foram
  registradas de forma suficiente para consolidacao.

Validacoes:

- `ArtifactEnvelope` valido para cada artefato;
- `source.task_id`, `source.capability_id`, `source.executor_id` e
  `source.trace_id` coerentes;
- `validation.status` conhecido;
- conteudo nao duplicado no resultado.

Efeitos:

- consolidar `ExecutionResult`.

Eventos:

- `artifact.validation.completed`;
- `execution.result.consolidation.started`.

### artifact_collecting -> partial

Gatilho:

- artefato opcional falhou ou parte nao bloqueante ficou pendente.

Validacoes:

- capacidades obrigatorias cumpridas;
- pendencia explicitada;
- status parcial justificado por eventos.

Efeitos:

- consolidar resultado parcial.

Eventos:

- `execution.partial`.

### result_consolidating -> completed

Gatilho:

- `ExecutionResult` foi derivado de evidencias suficientes e todas as
  capacidades obrigatorias cumpriram criterios.

Validacoes:

- status global coerente com capability results;
- artefatos obrigatorios referenciados;
- eventos relevantes referenciados;
- policy outcomes considerados;
- nenhum erro obrigatorio pendente.

Efeitos:

- expor resultado seguro ao chamador;
- encerrar execucao.

Eventos:

- `execution.result.consolidation.completed`;
- `execution.completed`.

### result_consolidating -> failed

Gatilho:

- resultado nao pode ser consolidado como sucesso ou parcial valido.

Validacoes:

- falha obrigatoria registrada;
- ausencia de evidencia obrigatoria registrada;
- motivo seguro.

Efeitos:

- expor falha segura ao chamador.

Eventos:

- `execution.failed`.

### any non-terminal -> cancelled

Gatilho:

- cancelamento solicitado por usuario, policy ou contexto operacional.

Validacoes:

- origem do cancelamento registrada;
- estado atual permite interrupcao;
- efeitos pendentes sao identificados.

Efeitos:

- solicitar cancelamento de efeitos pendentes;
- encerrar execucao como cancelada.

Eventos:

- `execution.cancelled`.

## Determinismo

A State Machine deve ser deterministica.

Regras:

- mesmo estado atual, mesmo command e mesmo Runtime Context versionado devem
  produzir o mesmo conjunto de eventos e efeitos;
- transicoes nao podem depender de horario atual sem evento de clock ou timeout;
- transicoes nao podem depender de Registry sem snapshot;
- transicoes nao podem depender de policy sem policy id e version;
- transicoes nao podem depender de memoria sem referencia versionada e
  autorizada;
- empates de selecao devem ter regra deterministica registrada;
- commands duplicados devem ser tratados de forma idempotente por identidade e
  eventos ja emitidos.

## Replay completo

O estado atual deve ser derivavel por replay dos eventos de um `trace_id`.

Replay deve reconstruir:

- estado atual;
- task associada;
- plano associado;
- policy outcomes relevantes;
- Registry snapshot usado;
- executor escolhido;
- alternativas descartadas;
- artefatos referenciados;
- falhas e retries;
- status consolidado.

Replay nao deve executar effects novamente. Effects ja executados sao fatos
somente quando retornam eventos.

## Auditabilidade

Toda transicao relevante deve deixar evidencias suficientes.

Uma auditoria deve conseguir responder:

- qual command solicitou a mudanca;
- qual estado anterior existia;
- qual estado seguinte foi aceito;
- quais inputs versionados foram usados;
- quais validations passaram ou falharam;
- quais effects foram declarados;
- quais events foram emitidos;
- qual artefato preserva decisao duravel quando aplicavel.

Decisoes duraveis devem apontar para artefato `decision` quando a justificativa
precisar sobreviver ao evento minimo.

## Extensibilidade

Novos estados podem ser adicionados sem quebrar historico se seguirem regras de
compatibilidade.

Regras:

- estados existentes nao devem mudar de semantica;
- transicoes historicas devem continuar reproduziveis;
- novos estados devem ser adicionados como refinamento entre estados existentes
  ou como novo ramo explicitamente versionado;
- todo novo estado deve declarar terminalidade;
- todo novo estado deve declarar commands aceitos;
- todo novo estado deve declarar eventos produzidos;
- todo novo estado deve declarar effects possiveis;
- versao da State Machine deve ser registrada em eventos decisivos;
- execucoes antigas devem continuar usando a versao de maquina com que foram
  iniciadas ou registrar migracao explicita por evento.

Mudancas incompativeis:

- remover estado historico;
- alterar terminalidade de estado antigo;
- permitir transicao antes proibida sem nova versao;
- mudar significado de evento usado para replay;
- depender de estado `latest`.

## Invariantes

- Toda execucao deve ter exatamente um `trace_id`.
- Toda execucao deve iniciar a partir de uma task aceita.
- Toda transicao aceita deve gerar evento.
- Todo evento de transicao deve seguir `EventContract`.
- Nenhuma transicao pode depender de persona.
- Nenhuma transicao pode depender de prompt.
- Nenhuma transicao pode depender de modelo ou provedor.
- Nenhuma transicao pode consultar Registry sem snapshot.
- Nenhuma transicao pode aplicar policy sem policy versionada.
- Nenhuma selecao de executor pode omitir alternativas descartadas.
- Nenhuma execucao pode chegar a `running` sem executor selecionado.
- Nenhuma execucao pode chegar a `completed` sem `ExecutionResult`.
- Nenhum `ExecutionResult` pode duplicar conteudo de artefato.
- Estados terminais nao aceitam commands de progresso.
- `failed`, `completed` e `cancelled` sao terminais para o ciclo atual.
- `partial` e terminal para o ciclo atual, salvo nova task futura.
- `blocked` e `requires_approval` nao sao terminais por definicao.
- Replay de eventos deve reconstruir o mesmo estado sem effects externos.

## Modelo de falhas

Falhas devem ser explicitas, seguras e auditaveis.

Classes de falha:

- task invalida;
- plano invalido;
- contrato de capability ausente;
- input ausente;
- policy negada;
- aprovacao requerida;
- Registry sem candidatos;
- Registry indisponivel;
- executor indisponivel;
- timeout;
- falha de capability;
- artefato ausente;
- artefato invalido;
- criterio de sucesso nao cumprido;
- cancelamento;
- erro inesperado.

Regras:

- falha antes de effect externo deve preferir `blocked` quando corrigivel;
- falha por policy deve respeitar outcome do `PolicyEngine`;
- falha de capability obrigatoria impede `completed`;
- falha de capability opcional pode resultar em `partial`;
- erro inesperado deve registrar mensagem segura;
- stack trace longo, payload cru e secrets nao pertencem ao evento.

## Retries

Retry e uma nova tentativa controlada, nao repeticao invisivel.

Regras:

- retry deve ser solicitado por command;
- retry deve ser permitido por contrato e policy;
- retry deve referenciar tentativa anterior;
- retry deve registrar motivo seguro;
- retry deve preservar contador ou identificador de tentativa por evento;
- retry nao pode apagar falha anterior;
- retry nao pode repetir effect externo se ele nao for idempotente ou se nao
  houver garantia registrada;
- retry apos timeout deve diferenciar resultado tardio de nova tentativa.

Estados que podem aceitar retry:

- `blocked`, quando a causa foi corrigida;
- `requires_approval`, quando aprovacao foi concedida;
- `running`, apenas como tentativa nova apos falha ou timeout registrado;
- `artifact_collecting`, quando validacao recuperavel falhou;
- `failed`, somente por nova execucao ou recovery explicito, nao como
  mutacao silenciosa do ciclo encerrado.

## Timeouts

Timeout e um fato operacional que deve ser registrado por evento.

Regras:

- timeout deve ser derivado de deadline, policy, capability contract ou
  runtime context versionado;
- agendamento de timeout e effect;
- ocorrencia de timeout deve gerar evento;
- timeout nao implica automaticamente retry;
- timeout de capability obrigatoria pode levar a `failed` ou `blocked`;
- timeout aguardando aprovacao pode manter `requires_approval`, cancelar ou
  bloquear conforme policy;
- resultado tardio apos timeout deve ser tratado como evento separado e nao
  deve sobrescrever estado terminal sem regra explicita.

## Recovery

Recovery reconstroi ou retoma execucao a partir de eventos e artefatos.

Regras:

- recovery deve iniciar por replay do event stream;
- effects nao confirmados devem ser reconciliados antes de serem reemitidos;
- toda reconciliacao realizada durante recovery deve gerar um ou mais eventos
  conforme o `EventContract`;
- quando a reconciliacao concluir que nenhuma acao e necessaria, essa decisao
  tambem deve ser registrada por evento explicito;
- estado reconstruido deve ser igual ao estado derivado originalmente pelos
  mesmos eventos;
- se houver divergencia, a maquina deve bloquear e registrar evento de
  inconsistencia;
- recovery nao pode inventar eventos faltantes;
- recovery nao pode usar memoria implicita para preencher gaps;
- recovery pode solicitar novo input versionado quando evidencia obrigatoria
  estiver ausente;
- recovery deve respeitar terminalidade de execucoes encerradas.

## Relacao com Event Sourcing

A fonte de verdade operacional da State Machine e o stream de eventos.

Commands nao sao persistidos como fatos centrais. Effects nao sao fatos ate
produzirem eventos. Runtime Context participa de decisoes por referencias
versionadas.

O estado materializado e uma projecao reconstruivel, nao autoridade primaria.

## Relacao com componentes

### EventContract

Define o envelope e a semantica minima dos eventos.

A State Machine usa eventos definidos por esse contrato. Ela nao altera o
contrato de eventos.

### ExecutionEngine

Coordena o ciclo operacional.

A State Machine define quais transicoes o engine pode aceitar.

### PolicyEngine

Avalia permissoes e constraints.

A State Machine trata policy check como effect e policy outcome como input
versionado para transicao.

### Registry

Fornece snapshots e candidatos.

A State Machine trata lookup como effect e snapshot como input versionado.

### ArtifactEnvelope

Preserva conteudo duravel.

A State Machine referencia artefatos e valida presenca de envelopes, mas nao
embute conteudo.

### ExecutionResult

Fecha a execucao.

A State Machine permite `completed`, `partial` ou `failed` somente quando o
resultado e derivavel de eventos e artefatos.

## Pontos em aberto

- Definir nome final dos commands conceituais.
- Definir catalogo final de eventos de transicao.
- Definir versao propria da State Machine.
- Definir politica de migracao entre versoes de maquina.
- Definir representacao final de attempts para retries.
- Definir formato de timeout e deadline sem implementar scheduler.
- Definir como reconciliar effects pendentes durante recovery.
- Definir quando `blocked` deve virar `failed`.
- Definir como uma execucao `partial` origina nova task.
- Definir se approvals expirados viram `blocked`, `failed` ou `cancelled`.

## Nao objetivos

- Implementar a maquina de estados.
- Implementar event store.
- Implementar scheduler.
- Implementar retry engine.
- Implementar recovery runner.
- Implementar Registry.
- Implementar Policy Engine.
- Implementar executor.
- Implementar agentes.
- Implementar SDK, CLI, servidor ou banco.
- Redesenhar `EventContract`.
- Criar prompts, personas, modelos ou provedores.
