# Contrato Universal de Agentes

Versao: `0.1.0-draft`

Este contrato define como agentes devem se apresentar e operar dentro do Workflow 2.0.

Ele e intencionalmente independente de linguagem, modelo, provedor, framework e persona.

## Definicao

Um agente e um executor versionado de capacidades.

Um agente nao e definido por tom de voz, nome, avatar ou papel narrativo. Ele e definido por:

- capacidades declaradas;
- entradas aceitas;
- saidas produzidas;
- politicas respeitadas;
- efeitos colaterais possiveis;
- eventos emitidos;
- versao de contrato suportada.

## Manifesto do agente

Todo agente deve expor um manifesto.

Campos obrigatorios:

```yaml
contract_version: "0.1.0-draft"
agent_id: "string-estavel"
agent_version: "semver"
display_name: "string-humana"
description: "descricao curta"
capabilities:
  - id: "namespace.capability"
    version: "semver"
    description: "o que esta capacidade executa"
    input_schema: "referencia-ou-schema"
    output_schema: "referencia-ou-schema"
    required_permissions:
      - "permission.id"
    side_effects:
      - "none|read|write|network|external_state|destructive"
    risk_level: "low|medium|high|critical"
```

Campos recomendados:

```yaml
maintainer: "owner-ou-equipe"
runtime_requirements:
  min_kernel_version: "semver"
  adapters:
    - "adapter.id"
limits:
  max_concurrency: 1
  timeout_ms: 300000
observability:
  emits_events: true
  supports_trace_id: true
```

## Capacidade

Uma capacidade e uma unidade roteavel de trabalho.

Ela deve responder:

- o que faz;
- quais entradas aceita;
- quais saidas promete;
- quais permissoes exige;
- quais efeitos pode causar;
- quais riscos envolve;
- quais invariantes devem ser preservadas.

Capacidades devem ser nomeadas por dominio e acao:

```text
domain.action
domain.resource.action
```

Exemplos:

```text
repository.analyze
documentation.write
validation.run
github.pull_request.create
```

## Tarefa

O kernel entrega trabalho ao agente como uma tarefa estruturada.

```yaml
task_id: "uuid"
trace_id: "uuid"
capability_id: "documentation.write"
intent: "descricao do objetivo"
input:
  type: "object"
context:
  workspace: "referencia"
  constraints:
    - "nao implementar agentes"
policies:
  required_confirmations:
    - "external_publish"
  allowed_side_effects:
    - "read"
    - "write"
deadline:
  timeout_ms: 300000
```

## Resultado

Todo agente deve devolver resultado estruturado.

```yaml
task_id: "uuid"
trace_id: "uuid"
status: "succeeded|failed|blocked|partial"
summary: "resumo humano curto"
outputs:
  type: "object"
artifacts:
  - uri: "referencia"
    kind: "document|patch|report|event_log"
events:
  - event_id: "uuid"
    type: "agent.task.completed"
errors:
  - code: "string"
    message: "mensagem segura"
    retryable: false
```

## Eventos

Agentes devem emitir eventos seguros e auditaveis.

Eventos obrigatorios:

- `agent.task.accepted`
- `agent.capability.started`
- `agent.capability.completed`
- `agent.capability.failed`

Eventos opcionais:

- `agent.permission.required`
- `agent.artifact.created`
- `agent.progress.updated`
- `agent.dependency.blocked`

Eventos nao devem expor secrets, payloads privados, credenciais, dados pessoais desnecessarios ou stack traces longos.

## Politicas

Agentes devem respeitar politicas recebidas do kernel.

Um agente nao pode elevar permissao por conta propria. Quando uma politica bloquear execucao, o agente deve retornar `blocked` com codigo seguro e explicacao curta.

## Acoplamento com modelos

Agentes podem usar modelos por meio de adaptadores, mas o contrato nao pode depender de:

- nome de modelo;
- provedor especifico;
- formato proprietario de prompt;
- persona;
- estado implicito de conversa.

## Compatibilidade

Mudancas compativeis:

- adicionar campos opcionais;
- adicionar eventos opcionais;
- adicionar novas capacidades;
- ampliar metadados sem quebrar schemas existentes.

Mudancas incompativeis:

- remover campo obrigatorio;
- alterar semantica de status;
- trocar significado de permissao existente;
- alterar schema de saida sem nova versao.

## Nao implementado nesta fase

- SDK de agente.
- Processo de registro dinamico.
- Executor local.
- Adaptadores de modelo.
- Persistencia.
- Ferramentas reais.
