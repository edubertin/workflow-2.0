# Kernel Artifact Generation

Artifact Generation transforma execucoes em entregas verificaveis.

## Decisao: Artifact Envelope v0

O formato inicial de artefato sera um envelope simples, versionado e independente de storage.

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

## Justificativa

- `artifact_version` permite evoluir o formato sem quebrar artefatos antigos.
- `artifact_id` da identidade propria ao artefato, sem depender do caminho do arquivo.
- `artifact_type` evita criar schemas diferentes cedo demais.
- `status` separa rascunho, proposta e fonte de verdade final.
- `source` preserva a linhagem de execucao: qual task, capability, executor e trace originaram o artefato.
- `content` aceita corpo inline ou referencia externa, mantendo o formato util para documentos pequenos e artefatos grandes.
- `provenance` registra autoria operacional e momento de criacao, sem repetir a linhagem de execucao.
- `validation` conecta o artefato aos criterios de sucesso da capacidade.

## Semantica minima dos campos

- `artifact_version`: versao do envelope, nao do conteudo.
- `artifact_id`: identificador estavel do artefato dentro do runtime.
- `artifact_type`: finalidade semantica do artefato, independente do formato do conteudo.
- `status`: estado de ciclo de vida do artefato.
- `source`: ligacao obrigatoria com a execucao que produziu o artefato.
- `content`: conteudo do artefato ou ponteiro para ele. Exatamente um entre `content.body` e `content.uri` deve ser usado.
- `provenance`: quem criou o envelope e quando.
- `validation`: resultado da validacao do artefato contra criterios verificaveis.

`status` e `validation.status` nao significam a mesma coisa. `status` diz se o artefato e rascunho, proposto, final, substituido ou rejeitado. `validation.status` diz se ele foi checado e se passou nos criterios definidos.

## Escolhas simplificadas

Nao entram no formato inicial:

- armazenamento content-addressed;
- grafo de dependencias entre artefatos;
- assinatura criptografica;
- permissao por campo;
- schema especifico por tipo de artefato;
- diff semantico;
- retencao ou arquivamento automatico.

Essas decisoes podem ser adicionadas depois. Agora, o mais importante e garantir identidade, origem, status, conteudo e validacao.

Regras:

- artefatos devem estar associados a task, capability, executor e trace;
- artefatos devem ter status claro;
- artefatos duraveis sao fonte de verdade;
- memoria e conversa nao substituem artefatos versionaveis.
