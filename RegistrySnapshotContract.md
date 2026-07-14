# Registry Snapshot Contract

Versao: `0.1.0-draft`

Este documento especifica, de forma normativa, o contrato de snapshot do
Registry no Workflow V2.

Ele nao implementa lookup real, persistencia, polling, atualizacao dinamica,
health checks, fallback, retries, recovery, approvals, scheduler, SDK, CLI,
API, servidor, banco ou fila.

## Autoridade documental

`RegistrySnapshotContract.md` e a fonte normativa para identidade,
versionamento, conteudo, escopo, canonicalizacao e replay de snapshots do
Registry.

As fronteiras sao:

- `Registry.md` define o componente Registry, suas responsabilidades e
  consultas permitidas;
- `RegistrySnapshotContract.md` define o objeto snapshot produzido ou lido pelo
  Registry;
- `contracts/RegistrySnapshotContract.md` define o shape minimo que uma
  implementacao futura deve aceitar ou produzir;
- `PolicyConstraintsContract.md` define constraints que participam de
  selection eligibility sem modificar o snapshot; constraint pushdown de lookup
  fica fora da primeira versao do runtime;
- `ExecutorSelectionContract.md` consome snapshots para eligibility, ranking e
  selection;
- `EventContract.md` e `EventCatalog.md` definem como eventos referenciam
  snapshots sem duplicar conteudo duravel.

O Registry cria ou fornece snapshots. Ele nao seleciona executor final.

## Definicao

Um Registry snapshot e um objeto imutavel, versionado e referenciavel que
congela um conjunto de Registry records e o escopo em que eles podem ser usados
para discovery, eligibility, ranking, replay e auditoria.

Um snapshot pode representar:

- `complete_registry`: o Registry completo conhecido para uma revisao da fonte;
- `lookup_scoped`: um recorte explicitamente delimitado para um lookup.

Snapshots `lookup_scoped` sao validos desde que o escopo e os criterios do
lookup estejam registrados. Nesse caso, "nenhum candidato" significa nenhum
candidato dentro daquele escopo conhecido, nao ausencia global no Registry.

## Identidade e versionamento

Campos obrigatorios de identidade:

```yaml
registry_snapshot_id: "registry_snapshot_deterministic_id"
registry_snapshot_version: "0.1.0"
registry_snapshot_schema_version: "0.1.0"
registry_source_ref:
  source_id: "registry_source_id"
  source_version: "registry_source_version_or_revision"
  source_digest: "digest_of_registry_source_revision"
snapshot_digest: "digest_of_canonical_snapshot_content"
```

Regras:

- `registry_snapshot_id` deve ser estavel para o mesmo conteudo canonico,
  schema e fonte versionada;
- `registry_snapshot_version` muda quando a representacao normativa do snapshot
  muda sem mudar sua identidade conceitual;
- `registry_snapshot_schema_version` versiona este contrato;
- `registry_source_ref` aponta para a revisao versionada da fonte do Registry;
- `snapshot_digest` e derivado de serializacao canonica;
- nenhum desses campos pode depender de UUID aleatorio, wall-clock time,
  estado `latest`, memoria implicita, prompt, persona, modelo ou consulta
  implicita ao Registry atual.

## Escopo e criterios de lookup

Todo snapshot deve declarar escopo.

```yaml
snapshot_scope:
  scope_type: "complete_registry|lookup_scoped"
  description: "resumo seguro"
lookup_criteria:
  capability_id: "walking_skeleton.execute"
  capability_version: "0.1.0"
  include_inactive: false
  candidate_types: ["service", "agent", "adapter"]
  required_permissions: ["workspace.read"]
  required_side_effects: ["read"]
  policy_constraint_refs:
    - policy_decision_id: "policy_decision_id"
      policy_decision_version: "0.1.0"
```

Para `complete_registry`, `lookup_criteria` pode ser vazio quando o snapshot
congela todo o Registry. Para `lookup_scoped`, `lookup_criteria` e obrigatorio
e decisivo.

Na primeira versao do runtime, `policy_constraint_refs` em `lookup_criteria`
sao referencias auditaveis ao contexto de Policy, nao autorizacao para filtrar
candidatos por constraints durante lookup.

## Shape minimo de Registry record

Cada record dentro do snapshot deve ter identidade e versao proprias.

```yaml
records:
  - registry_record_id: "registry_record_id"
    registry_record_version: "0.1.0"
    registry_record_schema_version: "0.1.0"
    record_type: "execution_candidate"
    executor_id: "opaque_executor_id"
    executor_metadata_version: "0.1.0"
    supported_capabilities:
      - capability_id: "walking_skeleton.execute"
        capability_version: "0.1.0"
    frozen_status: "active|inactive|deprecated"
    declared_permissions:
      - "workspace.read"
    declared_side_effects:
      - "read"
    eligibility_metadata:
      required_adapters: []
      risk_level: "low"
      compatibility_status: "compatible"
    ranking_metadata:
      declared_priority:
        value: 10
        governed_by: "registry_configuration"
        governed_version: "0.1.0"
        validated_by_registry: true
    descriptive_metadata:
      label: "safe optional label"
      description: "safe optional description"
    provenance:
      source_id: "registry_source_id"
      source_version: "registry_source_version_or_revision"
      source_record_id: "source_record_id"
```

Este formato e normativo como semantica e minimo conceitual. O shape minimo
executavel fica em `contracts/RegistrySnapshotContract.md`.

## Campos decisivos e descritivos

Campos decisivos:

- `registry_snapshot_id`;
- `registry_snapshot_version`;
- `registry_snapshot_schema_version`;
- `registry_source_ref`;
- `snapshot_scope`;
- `lookup_criteria` quando o snapshot for `lookup_scoped`;
- `snapshot_digest`;
- `registry_record_id`;
- `registry_record_version`;
- `registry_record_schema_version`;
- `record_type`;
- `executor_id`;
- `executor_metadata_version`;
- `supported_capabilities`;
- `frozen_status`;
- `declared_permissions`;
- `declared_side_effects`;
- `eligibility_metadata`;
- `ranking_metadata` referenciado por selection rule;
- `provenance` ou source ref versionado.

Campos descritivos:

- `descriptive_metadata.label`;
- `descriptive_metadata.description`;
- qualquer texto livre de apresentacao.

Campos descritivos nunca podem participar implicitamente de eligibility,
ranking, selection ou replay.

## Campos proibidos como decisao implicita

Nome amigavel, persona, prompt, narrativa, preferencia de modelo, papel
narrativo, tom de resposta ou descricao textual livre nao podem participar de
eligibility ou ranking.

Se um valor textual precisar influenciar decisao, ele deve ser transformado em
campo decisivo estruturado, versionado e permitido por este contrato ou por uma
extensao versionada.

## Semantica de colecao

`records` e um conjunto, nao uma lista ordenada por significado.

Regras:

- a ordem de arrays, mapas, banco, arquivo ou transporte nao e decisiva;
- duplicidade de record identity no mesmo snapshot torna o snapshot invalido;
- a canonicalizacao deve ordenar records antes de serializacao, fingerprint e
  comparacao;
- qualquer implementacao que receba records em ordem diferente deve produzir o
  mesmo snapshot canonico.

## Canonicalizacao

A ordenacao canonica inicial de records e ascendente pela tupla:

```text
registry_record_id,
registry_record_version,
executor_id,
executor_metadata_version
```

Arrays internos tambem devem ser canonicos:

- `supported_capabilities`: por `capability_id`, depois
  `capability_version`;
- `declared_permissions`: ordem lexicografica;
- `declared_side_effects`: ordem lexicografica;
- `policy_constraint_refs`: por `policy_decision_id`, depois versao.

Serializacao canonica deve ordenar chaves de objetos, normalizar arrays como
acima e omitir ordem incidental recebida do Registry.

## Derivacao de identidade e digest

`snapshot_digest` deve ser derivado da serializacao canonica de:

- `registry_snapshot_schema_version`;
- `registry_source_ref`;
- `snapshot_scope`;
- `lookup_criteria`;
- records canonicos com seus campos decisivos.

`registry_snapshot_id` pode ser fornecido por fonte externa somente se essa
fonte for versionada e auditavel. Quando o runtime derivar o id, deve usar uma
funcao deterministica sobre `snapshot_digest` e namespace estavel.

`created_at`, quando existir como metadado operacional, nao pode ser necessario
para reproduzir identidade, digest, eligibility ou ranking.

## Snapshot vazio

Snapshot vazio e valido somente quando:

- `snapshot_scope` esta declarado;
- `lookup_criteria` esta completo para `lookup_scoped`;
- `records: []` e resultado completo daquele escopo;
- o snapshot possui `snapshot_digest`;
- o evento de lookup registra que o conjunto canonico retornado e vazio.

Snapshot vazio nao e o mesmo que lookup incompleto, truncado ou falho.

Um lookup incompleto, truncado ou falho deve produzir evento de falha seguro,
nao `registry.lookup.no_candidate`.

## Invalidade e conflito

Um snapshot e invalido quando:

- ha records duplicados com a mesma identidade canonica;
- o mesmo `registry_record_id` aparece com conteudo conflitante para a mesma
  versao;
- `executor_id` ou `executor_metadata_version` esta ausente em record
  decisivo;
- capability suportada nao tem id e versao;
- `frozen_status` esta ausente;
- permissions ou side effects declarados estao ausentes;
- campo usado por eligibility ou ranking esta ausente ou sem versao de
  governanca;
- `snapshot_digest` nao corresponde ao conteudo canonico;
- `registry_source_ref` aponta para fonte sem versao ou revisao.

Snapshots invalidos devem falhar fechado. Eles nao podem produzir selecao nem
invocacao de executor.

## Eventos de lookup

`registry.lookup.completed` deve referenciar:

- `registry_snapshot_id`;
- `registry_snapshot_version`;
- `registry_snapshot_schema_version`;
- `snapshot_digest`;
- `snapshot_scope`;
- `lookup_criteria`;
- `capability_id` e `capability_version` solicitadas;
- command id e versao que iniciou o lookup;
- conjunto canonico de records retornados por id e versao;
- records descartados pelo lookup e motivo seguro, quando houver;
- decision id e versao do lookup.

Eventos nao devem duplicar o snapshot inteiro. Eles apontam para o snapshot e
preservam apenas a trilha minima de auditoria.

## Policy e selection

Policy constraints e selection rules consomem o snapshot como input versionado.
Elas nao modificam o snapshot.

O formato normativo de constraints, incluindo digest e replay, e definido em
`PolicyConstraintsContract.md`.

Se policy, eligibility ou ranking precisar de metadado ausente no snapshot, a
decisao deve bloquear ou falhar fechado conforme o estado normativo aplicavel.

## Retomada com novo snapshot

Uma execucao bloqueada por snapshot anterior permanece historicamente ligada ao
snapshot usado.

Para retomada futura:

- novo input versionado deve fornecer outro `registry_snapshot_id`,
  `registry_snapshot_version` e `snapshot_digest`;
- o novo snapshot nao altera retroativamente eventos, decisions ou
  `ExecutionResult` da execucao bloqueada;
- a retomada deve referenciar explicitamente o snapshot anterior e o novo
  snapshot quando essa relacao for decisiva.

## Replay

Replay de lookup e selecao deve usar:

- eventos do trace;
- command que iniciou lookup;
- `TaskEnvelope`, `CapabilityPlan` e `CapabilityContract` versionados;
- policy decision versionada;
- Registry snapshot versionado;
- selection rule versionada;
- Runtime Context versionado quando decisivo.

Replay nao consulta Registry atual, estado `latest`, memoria implicita, prompt,
persona, modelo, relogio real ou UUID aleatorio.

## Armazenamento e referencia

Registry snapshot deve ser tratado como input versionado referenciavel de tipo
`registry_snapshot`.

Ele nao e `ArtifactEnvelope` por padrao, porque nao e artefato de entrega nem
conteudo produzido por capability. Uma implementacao pode exportar ou arquivar
um snapshot como artifact para distribuicao ou revisao, mas eventos e
decisions decisivos ainda devem referenciar `registry_snapshot_id`,
`registry_snapshot_version` e `snapshot_digest`.

Eventos nao devem duplicar conteudo duravel do snapshot.

## declared_priority

`declared_priority` e um metadado de ranking opcional e decisivo somente quando
uma selection rule versionada o referencia.

Regras:

- o valor deve ser governado por `governed_by` e `governed_version`;
- o valor pode ser declarado pelo executor, por configuracao de Registry ou por
  configuracao externa, desde que a governanca esteja versionada;
- o Registry deve validar e congelar o valor no snapshot antes da selecao;
- o valor pode participar de decisao do kernel porque esta no snapshot como
  metadado estruturado, versionado e auditavel;
- o executor nao pode alterar `declared_priority` durante invocation;
- "menor valor vence" somente quando a selection rule versionada declarar
  direcao `ascending`;
- a ausencia de `declared_priority` deve seguir `missing_value_behavior` da
  selection rule.

O campo nao foi renomeado porque a ambiguidade real nao esta no nome; esta na
governanca e no congelamento do valor. Este contrato fecha essa semantica.

## Invariantes

- Snapshot e imutavel.
- Snapshot e input versionado, nao estado `latest`.
- Snapshot pode ser completo ou escopado, mas escopo deve ser explicito.
- Records sao conjunto canonico, nao lista incidental.
- Todo record decisivo tem id, versao e provenance.
- Campo decisivo ausente invalida o snapshot para a decisao que depende dele.
- Snapshot vazio valido e diferente de lookup falho.
- Policy e selection nao modificam snapshots.
- Replay nao consulta Registry atual.

## Pontos em aberto

- Algoritmo criptografico final para `snapshot_digest`.
- Taxonomia final de `record_type`.
- Taxonomia final de `frozen_status`.
- Formato executavel futuro de `eligibility_metadata`.
- Governanca organizacional final para prioridades declaradas.
