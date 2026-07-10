# CapabilityContract

Versao: `0.1.0-draft`

Este contrato define uma capacidade no Workflow V2.

Capacidade e a unidade de trabalho que o runtime entende, roteia, valida e avalia. Agentes podem executar capacidades, mas nao definem sua semantica.

## Definicao

Uma capacidade e um contrato versionado que descreve:

- objetivo;
- entradas;
- saidas;
- criterios de sucesso;
- criterios de falha;
- permissoes;
- side effects;
- artefatos esperados;
- eventos obrigatorios;
- limites de execucao.

## Identidade

```yaml
capability_id: "domain.action"
version: "0.1.0"
title: "Nome humano curto"
description: "Descricao objetiva do trabalho"
owner: "equipe-ou-area"
status: "draft|active|deprecated"
```

Convencao de nomes:

```text
domain.action
domain.resource.action
```

Exemplos:

```text
repository.inspect
architecture.review
documentation.write
artifact.generate
validation.run
```

## Entradas

Entradas definem o que a capacidade precisa para executar.

```yaml
input:
  schema_version: "0.1.0"
  required:
    - "intent"
    - "scope"
  optional:
    - "context"
    - "constraints"
    - "existing_artifacts"
  constraints:
    max_payload_size: "tbd"
    sensitive_fields:
      - "secrets"
      - "credentials"
```

Regras:

- entradas devem ser explicitas;
- entradas sensiveis precisam de policy;
- memoria pode enriquecer contexto, mas nao substituir input obrigatorio;
- secrets nao devem ser passados salvo contrato e policy especificos.

## Saidas

Saidas definem o que a capacidade promete produzir.

```yaml
output:
  schema_version: "0.1.0"
  required:
    - "status"
    - "summary"
    - "artifacts"
  optional:
    - "decisions"
    - "pending_questions"
    - "recommendations"
    - "diagnostics"
```

Status permitidos:

```text
succeeded
failed
blocked
partial
cancelled
requires_approval
```

## Criterios de sucesso

Toda capacidade deve declarar como o runtime sabe que ela funcionou.

```yaml
success_criteria:
  required:
    - "Todos os artefatos obrigatorios foram produzidos"
    - "A saida segue o schema declarado"
    - "Nenhuma policy foi violada"
  optional:
    - "Checks recomendados passaram"
    - "Decisoes arquiteturais foram registradas"
```

Criterios devem ser verificaveis. Evitar criterios subjetivos como "ficou bom" sem traduzi-los em sinais observaveis.

## Criterios de falha

```yaml
failure_criteria:
  - code: "input_invalid"
    description: "Entrada obrigatoria ausente ou invalida"
  - code: "policy_denied"
    description: "Policy bloqueou a execucao"
  - code: "artifact_missing"
    description: "Artefato obrigatorio nao foi produzido"
  - code: "success_criteria_failed"
    description: "Resultado nao cumpriu criterios declarados"
```

Falhas recuperaveis devem indicar se retry e permitido.

## Permissoes e side effects

```yaml
permissions:
  required:
    - "workspace.read"
  optional:
    - "workspace.write"
side_effects:
  allowed:
    - "read"
    - "write"
  forbidden:
    - "destructive"
    - "external_publish"
risk_level: "low|medium|high|critical"
```

Uma capacidade deve declarar side effects antes de ser executada.

## Artefatos

```yaml
artifacts:
  required:
    - kind: "document"
      name: "RuntimeFlow.md"
  optional:
    - kind: "decision_record"
    - kind: "summary"
```

Cada artefato produzido por uma capacidade deve usar `Artifact Envelope v0`:

```yaml
artifact_version: "0.1.0"
artifact_id: "artifact_ulid_or_uuid"
artifact_type: "document|decision|plan|patch|report|trace|manifest"
status: "draft|proposed|final|superseded|rejected"
title: "Nome humano curto"
source:
  task_id: "task_id"
  capability_id: "capability_id"
  executor_id: "executor_id"
  trace_id: "trace_id"
content:
  format: "markdown|json|patch|text"
  uri: "optional/path/or/external-reference"
  body: "optional-inline-content"
provenance:
  created_at: "iso-8601"
  created_by: "runtime|executor|human"
validation:
  status: "unchecked|valid|invalid"
  criteria:
    - "criterio verificavel"
```

Regras:

- `artifact_type` deve ser amplo e estavel, nao um tipo especifico demais.
- `status: final` indica que o artefato pode ser tratado como fonte de verdade.
- `status: proposed` indica que o artefato ainda precisa de validacao ou aceite.
- `content.body` serve para conteudo pequeno e portavel.
- `content.uri` serve para arquivos, patches grandes, traces e anexos.
- exatamente um entre `content.body` e `content.uri` deve ser usado.
- `source` identifica a execucao que originou o artefato.
- `provenance` identifica quem criou o envelope e quando.
- `status` descreve ciclo de vida; `validation.status` descreve resultado de checagem.
- `validation.criteria` deve referenciar criterios de sucesso da capacidade quando possivel.

## Eventos obrigatorios

```yaml
events:
  required:
    - "capability.execution.started"
    - "capability.execution.completed"
  on_failure:
    - "capability.execution.failed"
  optional:
    - "capability.progress.updated"
    - "capability.artifact.proposed"
```

Eventos devem ser seguros para observabilidade.

## Exemplo conceitual

```yaml
capability_id: "documentation.architecture.update"
version: "0.1.0"
title: "Atualizar documentacao arquitetural"
description: "Revisar e atualizar documentos arquiteturais sem implementar codigo"
input:
  required:
    - "intent"
    - "target_documents"
    - "constraints"
output:
  required:
    - "status"
    - "summary"
    - "artifacts"
success_criteria:
  required:
    - "Documentos alvo foram atualizados"
    - "Nenhum codigo executavel foi implementado"
    - "Decisoes arquiteturais foram explicitadas"
permissions:
  required:
    - "workspace.read"
    - "workspace.write"
side_effects:
  allowed:
    - "read"
    - "write"
  forbidden:
    - "external_publish"
    - "destructive"
risk_level: "low"
artifacts:
  required:
    - kind: "document"
      name: "ARCHITECTURE.md"
    - kind: "document"
      name: "RuntimeFlow.md"
```

## Decisoes explicitas

### Capacidade nao e implementacao

Este contrato descreve o que deve acontecer, nao como sera implementado.

### Capacidade nao e agente

Um agente pode executar a capacidade. Outro executor tambem pode. O contrato permanece o mesmo.

### Sucesso nao e opiniao

Toda capacidade deve transformar sucesso em criterios verificaveis, mesmo quando a tarefa tiver componente subjetivo.

### Artefato e obrigacao de saida

Quando uma capacidade produz conhecimento duravel, esse conhecimento deve sair como artefato, nao apenas como resposta em conversa.
