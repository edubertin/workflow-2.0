# Execution Engine

Versao: `0.1.0-draft`

Este documento especifica, em alto nivel, o Execution Engine do Workflow V2.

O Execution Engine e a parte do runtime responsavel por conduzir uma `TaskEnvelope` ate um `ExecutionResult`, passando por resolucao de plano, policies, registry, selecao de executor, execucao de capacidades, eventos, artefatos e consolidacao.

Ele nao implementa agentes, nao conhece personas, nao conhece modelos e nao define storage. Ele coordena decisoes sobre capacidades.

## Diretriz central

Toda decisao do runtime deve ser deterministica e auditavel por eventos e artefatos.

Deterministica significa que a mesma entrada versionada, o mesmo snapshot de Registry, as mesmas Policies versionadas e os mesmos metadados versionados devem produzir a mesma decisao ou o mesmo bloqueio.

Auditavel significa que toda decisao relevante deve deixar evidencias suficientes para explicar:

- qual entrada foi considerada;
- qual versao da entrada foi considerada;
- qual criterio foi aplicado;
- quais alternativas existiam;
- qual alternativa foi escolhida;
- por que alternativas foram rejeitadas;
- qual evento registrou a decisao;
- qual artefato preserva a decisao quando ela for duravel.

Essa diretriz impede que preferencias implicitas de modelo, tom de persona ou heuristicas invisiveis contaminem o kernel.

Regra obrigatoria: nenhuma decisao do Execution Engine pode depender de `latest`, estado mutavel implicito, memoria nao versionada, preferencia de modelo ou informacao fora do conjunto de inputs versionados da execucao.

## Responsabilidade

O Execution Engine coordena o ciclo de vida operacional de uma task.

Ele deve:

- receber uma `TaskEnvelope` valida;
- resolver ou validar um `CapabilityPlan`;
- consultar Policies antes de decisoes com risco;
- consultar Registry para descobrir candidatos de execucao;
- selecionar executor por criterios objetivos;
- preparar contexto minimo de execucao;
- registrar eventos de decisao e transicao;
- exigir artefatos compativeis com `Artifact Envelope v0`;
- consolidar um `ExecutionResult`;
- encerrar com status explicito.

Ele nao deve:

- conhecer personas;
- escolher executor por nome narrativo;
- depender de modelo especifico;
- embutir prompt como regra de decisao;
- alterar contratos de capacidade durante execucao;
- usar memoria como fonte de verdade;
- silenciar falhas;
- produzir resultado sem eventos suficientes para auditoria.

## Entradas e saidas

Entrada principal:

- `TaskEnvelope`

Entradas consultadas durante o ciclo:

- `CapabilityContract` versionado;
- `CapabilityPlan` versionado, quando ja existir;
- Policies versionadas;
- snapshot versionado do Registry;
- Memory, apenas por referencia versionada, contrato e policy;
- artefatos existentes, sempre por `artifact_id` e `artifact_version`;
- estado operacional permitido, sempre por snapshot ou evento.

Toda entrada consultada para uma decisao deve ter identificador, versao ou snapshot id. Se isso nao existir, a decisao deve bloquear ate que o input seja estabilizado.

Saida principal:

- `ExecutionResult`

Saidas auxiliares:

- eventos;
- `Artifact Envelope v0`;
- registros de bloqueio;
- registros de decisao duravel.

## Estados

```text
accepted
plan_resolving
plan_ready
policy_checking
registry_lookup
executor_selecting
running
artifact_collecting
result_consolidating
completed
```

Estados alternativos:

```text
blocked
requires_approval
failed
partial
cancelled
```

## Transicoes de estado

### accepted -> plan_resolving

A task foi recebida como `TaskEnvelope` valida.

Responsabilidades:

- confirmar `task_id` e `trace_id`;
- registrar evento de aceite;
- verificar se a task contem escopo e side effects permitidos;
- bloquear se a task exigir algo fora do contrato.

Evento esperado:

- `execution.task.accepted`

### plan_resolving -> plan_ready

O engine resolve um `CapabilityPlan` a partir da task ou valida um plano ja existente.

Responsabilidades:

- mapear objetivo para capacidades;
- verificar contratos de capacidade;
- ordenar dependencias;
- declarar artefatos esperados;
- bloquear capacidades sem contrato conhecido.

Eventos esperados:

- `execution.plan.resolution.started`
- `execution.plan.resolution.completed`

Falhas possiveis:

- `capability_contract_missing`;
- `plan_invalid`;
- `dependency_invalid`;
- `scope_ambiguous`.

### plan_ready -> policy_checking

O plano esta estruturalmente valido e precisa passar por Policies.

Responsabilidades:

- classificar risco por task e por capacidade;
- verificar side effects;
- verificar permissoes;
- identificar necessidade de aprovacao humana;
- gerar decisao de policy.

Eventos esperados:

- `policy.check.started`
- `policy.check.completed`

Saidas possiveis:

- allow;
- deny;
- requires_approval;
- allow_with_constraints.

### policy_checking -> registry_lookup

Policies permitem prosseguir, possivelmente com restricoes.

Responsabilidades:

- consultar Registry por `capability_id`;
- obter candidatos compativeis por capacidade;
- descartar candidatos incompativeis com contrato, policy ou constraints;
- registrar candidatos considerados.

Eventos esperados:

- `registry.lookup.started`
- `registry.lookup.completed`

Falhas possiveis:

- `no_executor_candidate`;
- `registry_unavailable`;
- `capability_version_unsupported`.

### registry_lookup -> executor_selecting

O Registry devolveu candidatos suficientes para avaliacao.

Responsabilidades:

- aplicar criterios objetivos de selecao;
- ordenar candidatos por criterios declarados;
- registrar a razao da escolha;
- registrar todas as alternativas descartadas;
- registrar a razao de descarte de cada candidato;
- registrar as versoes de inputs usadas na decisao.

Criterios permitidos:

- compatibilidade de contrato;
- permissoes exigidas;
- constraints de policy;
- disponibilidade;
- menor risco;
- menor escopo de side effect;
- requisito de adaptador;
- historico operacional auditavel;
- custo declarado;
- prioridade declarada.

Criterios proibidos:

- persona;
- tom de voz;
- preferencia implicita de modelo;
- nome narrativo de agente;
- prompt nao registrado;
- memoria nao referenciada por policy.

Evento esperado:

- `execution.executor.selected`

### executor_selecting -> running

O executor foi selecionado como candidato operacional, sem expor persona ao kernel, e a execucao da capacidade inicia.

O estado intermediario `ready` nao e necessario nesta versao. Ele duplicava a ideia de "executor selecionado com contexto preparado" sem acrescentar uma decisao arquitetural propria. A preparacao de contexto fica dentro desta transicao e deve ser auditada por evento.

Responsabilidades:

- construir contexto minimo;
- aplicar constraints finais;
- preparar requisitos de artefato;
- definir eventos obrigatorios da capacidade;
- entregar apenas input autorizado;
- entregar policy envelope;
- entregar artifact requirements;
- ativar observabilidade;
- preservar `trace_id`;
- impedir elevacao de permissao.

Eventos esperados:

- `execution.context.prepared`
- `capability.execution.started`

### running -> artifact_collecting

A capacidade concluiu, falhou parcialmente ou produziu artefatos intermediarios.

Responsabilidades:

- coletar referencias de artefatos;
- validar envelope de artefato;
- comparar artefatos com `expected_artifacts`;
- registrar falhas de artefato;
- impedir que conteudo de artefato seja duplicado no resultado.

Eventos esperados:

- `capability.execution.completed`
- `capability.artifact.proposed`
- `artifact.validation.completed`

Falhas possiveis:

- `artifact_missing`;
- `artifact_invalid`;
- `artifact_validation_failed`;
- `artifact_policy_violation`.

### artifact_collecting -> result_consolidating

Artefatos obrigatorios foram validados ou falhas foram registradas.

Responsabilidades:

- consolidar status por capacidade;
- derivar status global;
- anexar referencias de artefatos;
- anexar eventos relevantes;
- registrar decisoes e pendencias;
- construir `ExecutionResult`.

Evento esperado:

- `execution.result.consolidation.started`

### result_consolidating -> completed

O `ExecutionResult` esta pronto e coerente com task, plano, eventos e artefatos.

Responsabilidades:

- validar invariantes do resultado;
- registrar evento final;
- fechar estado operacional;
- expor resumo seguro ao chamador.

Evento esperado:

- `execution.completed`

## Selecao de executor sem conhecer agentes

O Execution Engine seleciona um executor a partir de metadados devolvidos pelo Registry.

O Registry pode saber que um executor e um agente, servico, humano, codigo local ou adaptador externo. O kernel nao usa essa identidade como semantica de roteamento.

Para o engine, um candidato e apenas:

```text
executor candidate for capability_id
```

Metadados aceitaveis para decisao:

- executor id opaco;
- tipo operacional;
- capacidades suportadas;
- versao de contrato suportada;
- permissoes exigidas;
- side effects declarados;
- disponibilidade;
- limites;
- adaptadores requeridos;
- sinais auditaveis de confiabilidade.

Todos esses metadados devem vir de um snapshot versionado do Registry. O engine nao pode consultar estado vivo do executor durante a decisao sem registrar essa consulta como input versionado ou evento de snapshot.

Metadados nao aceitaveis como criterio:

- persona;
- papel narrativo;
- nome humano do agente;
- estilo de resposta;
- afinidade com um modelo;
- prompt interno nao registrado.

### Registro de alternativas descartadas

Toda selecao de executor deve registrar:

- todos os candidatos retornados pelo Registry;
- candidatos removidos por incompatibilidade de contrato;
- candidatos removidos por Policies;
- candidatos removidos por indisponibilidade;
- candidatos removidos por constraints de custo, risco, adaptador ou side effect;
- candidato escolhido;
- criterio deterministico de desempate, quando houver empate.

Nao existe selecao valida com apenas "executor escolhido". A decisao precisa preservar o conjunto de alternativas descartadas para permitir auditoria e reproducao historica.

## Tratamento de falhas

Falhas devem produzir estado explicito, evento e entrada segura no `ExecutionResult`.

Classes de falha:

- `task_invalid`;
- `plan_invalid`;
- `capability_contract_missing`;
- `policy_denied`;
- `approval_required`;
- `registry_unavailable`;
- `no_executor_candidate`;
- `executor_unavailable`;
- `capability_execution_failed`;
- `artifact_missing`;
- `artifact_invalid`;
- `success_criteria_failed`;
- `unexpected_error`.

Regras:

- falha bloqueante antes de execucao deve gerar `blocked` ou `requires_approval`;
- falha durante uma capacidade obrigatoria deve impedir `succeeded`;
- falha em capacidade opcional pode gerar `partial`;
- erro inesperado deve ser registrado sem stack trace longo ou dados sensiveis;
- retry so pode ocorrer quando policy e contrato permitirem;
- retries devem ser eventos auditaveis, nao comportamento invisivel.

## Eventos

Eventos sao a trilha de auditoria minima do engine.

Cada evento deve preservar:

- `event_id`;
- versao do schema de evento;
- `trace_id`;
- `task_id`;
- fase;
- tipo de decisao ou transicao;
- timestamp;
- resultado;
- motivo seguro;
- referencias aos inputs versionados considerados;
- alternativas consideradas, quando o evento registra uma decisao;
- referencias a artefatos quando existirem.

Eventos obrigatorios por ciclo:

- `execution.task.accepted`;
- `execution.plan.resolution.started`;
- `execution.plan.resolution.completed`;
- `policy.check.completed`;
- `registry.lookup.completed`;
- `execution.executor.selected`;
- `capability.execution.started`;
- `capability.execution.completed` ou `capability.execution.failed`;
- `artifact.validation.completed`;
- `execution.result.consolidation.completed`;
- `execution.completed` ou `execution.failed`.

Eventos devem explicar decisoes, nao apenas registrar que algo aconteceu.

## Versionamento e reprodutibilidade historica

Uma execucao deve poder ser explicada depois sem depender do estado atual do sistema.

Para isso, o Execution Engine deve registrar, direta ou indiretamente:

- `task_version` e `task_id`;
- `plan_version` e `plan_id`;
- versao de cada `CapabilityContract`;
- versao ou snapshot id das Policies;
- snapshot id do Registry;
- versao dos metadados de candidatos;
- versao do Execution Engine;
- versao do schema de eventos;
- `artifact_version` de cada artefato;
- referencias versionadas de Memory, quando Memory participar da decisao.

Reprodutibilidade historica nao significa repetir efeitos externos. Significa conseguir reconstituir por que o runtime decidiu o que decidiu com base nos mesmos inputs versionados.

Regras:

- decisoes nao podem depender de "estado atual" quando o evento historico for lido;
- referencias a Registry devem apontar para snapshot, nao para catalogo mutavel;
- Policies usadas devem ser identificaveis por versao;
- criterios de ranking devem ser declarados e versionados;
- empates devem ter regra deterministica registrada;
- artefatos usados como input devem ser referenciados por `artifact_id` e `artifact_version`;
- Memory so pode influenciar decisao por referencia versionada e autorizada por policy.

Se qualquer input necessario para reproduzir uma decisao nao for versionavel, o engine deve registrar a decisao como nao reprodutivel e tratar isso como pendencia arquitetural antes de uma implementacao futura.

## Geracao de artefatos

O Execution Engine nao trata resposta textual como fonte de verdade quando a capacidade exige conhecimento duravel.

Responsabilidades:

- exigir `Artifact Envelope v0` para artefatos produzidos;
- validar `source.task_id`, `source.capability_id`, `source.executor_id` e `source.trace_id`;
- validar `content.body` ou `content.uri`;
- validar `validation.status`;
- associar artefatos a criterios de sucesso;
- garantir que `ExecutionResult.artifacts` contenha referencias, nao conteudo duplicado.

Artefatos esperados podem vir de:

- `TaskEnvelope.expected_artifacts`;
- `CapabilityPlan.capabilities.expected_artifacts`;
- `CapabilityContract.artifacts`.

Quando houver conflito, a ordem de autoridade e:

1. `CapabilityContract`;
2. `CapabilityPlan`;
3. `TaskEnvelope`.

## Consolidacao do ExecutionResult

O `ExecutionResult` deve ser derivado de evidencias.

Evidencias:

- `TaskEnvelope`;
- `CapabilityPlan`;
- eventos;
- outcomes de policy;
- candidatos considerados e descartados;
- executor selecionado;
- resultados por capacidade;
- artefatos validados;
- falhas e bloqueios.

O status global deve obedecer:

- `succeeded`: todas as capacidades obrigatorias cumpriram criterios de sucesso;
- `partial`: pelo menos uma capacidade opcional falhou ou uma parte nao bloqueante ficou pendente;
- `blocked`: execucao nao pode prosseguir sem mudanca de contexto, contrato ou policy;
- `requires_approval`: execucao depende de aprovacao humana;
- `failed`: execucao tentou prosseguir e nao cumpriu criterio obrigatorio;
- `cancelled`: execucao foi interrompida por solicitacao ou policy.

## Pontos em aberto

- Definir formato final dos eventos.
- Definir como Policies expressam constraints deterministicas.
- Definir algoritmo declarativo de ranking de candidatos.
- Definir formato do snapshot versionado do Registry.
- Definir como versionar Policies e criterios de ranking.
- Definir quando retry e permitido por contrato.
- Definir como approvals humanos entram no estado do engine.
- Definir como Memory fornece contexto sem contaminar determinismo.
- Definir estrategia de persistencia para eventos e artefatos.
- Definir como comparar historico operacional de executores sem criar vies por persona.
- Definir lifecycle de `partial` para execucoes compostas.

## Nao objetivos

- Implementar runtime.
- Implementar scheduler.
- Implementar registry.
- Implementar policies.
- Implementar agentes.
- Criar SDK, CLI, servidor ou banco.
- Definir provider de modelo.
- Escrever pseudocodigo.
