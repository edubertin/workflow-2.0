# RegistrySnapshotContract

Versao: `0.1.0-draft`

Este contrato define o shape minimo de um Registry snapshot aceito ou produzido
por uma implementacao futura do Workflow V2.

## Responsabilidade

Representar um conjunto imutavel, versionado e canonico de Registry records
usado como input decisivo para lookup, eligibility, ranking, selection e replay.

## Campos obrigatorios

```yaml
registry_snapshot_id: "registry_snapshot_deterministic_id"
registry_snapshot_version: "0.1.0"
registry_snapshot_schema_version: "0.1.0"
registry_source_ref:
  source_id: "registry_source_id"
  source_version: "source_version_or_revision"
  source_digest: "source_digest"
snapshot_scope:
  scope_type: "complete_registry|lookup_scoped"
  description: "safe_scope_summary"
lookup_criteria:
  capability_id: "domain.action"
  capability_version: "0.1.0"
  include_inactive: false
  candidate_types: []
  required_permissions: []
  required_side_effects: []
  policy_constraint_refs: []
canonicalization:
  record_order: "registry_record_id,registry_record_version,executor_id,executor_metadata_version"
  object_key_order: "lexicographic"
snapshot_digest: "digest_of_canonical_snapshot_content"
records:
  - registry_record_id: "registry_record_id"
    registry_record_version: "0.1.0"
    registry_record_schema_version: "0.1.0"
    record_type: "execution_candidate"
    executor_id: "opaque_executor_id"
    executor_metadata_version: "0.1.0"
    supported_capabilities:
      - capability_id: "domain.action"
        capability_version: "0.1.0"
    frozen_status: "active|inactive|deprecated"
    declared_permissions:
      - "workspace.read"
    declared_side_effects:
      - "read"
    eligibility_metadata:
      required_adapters: []
      risk_level: "low|medium|high|critical"
      compatibility_status: "compatible|incompatible|unknown"
    ranking_metadata:
      declared_priority:
        value: 10
        governed_by: "executor|registry_configuration|external_configuration"
        governed_version: "0.1.0"
        validated_by_registry: true
    descriptive_metadata:
      label: "optional_safe_label"
      description: "optional_safe_description"
    provenance:
      source_id: "registry_source_id"
      source_version: "source_version_or_revision"
      source_record_id: "source_record_id"
```

## Campos opcionais

```yaml
created_logical_at: "logical_time_or_null"
supersedes_snapshot:
  registry_snapshot_id: "previous_snapshot_id"
  registry_snapshot_version: "0.1.0"
```

Campos opcionais nao podem ser necessarios para replay, eligibility, ranking ou
selection, a menos que estejam explicitamente listados em `lookup_criteria`,
`eligibility_metadata` ou `ranking_metadata` como campo decisivo versionado.

## Invariantes

- `records` e conjunto canonico, nao lista incidental.
- Snapshot vazio e valido apenas com escopo e criterios completos.
- Record duplicado por identidade canonica invalida o snapshot.
- Campo decisivo ausente invalida o snapshot para a decisao dependente.
- `snapshot_digest` deve corresponder ao conteudo canonico.
- `descriptive_metadata` nunca participa implicitamente de decisao.
- Persona, prompt, narrativa, preferencia de modelo e nome amigavel nao podem
  ser usados como criterios implicitos.
- `declared_priority` so e decisivo quando selection rule versionada o
  referencia.
- O executor nao pode alterar metadados congelados durante invocation.

## Relacao com RegistrySnapshotContract.md

Este arquivo define o shape minimo. `RegistrySnapshotContract.md` define a
semantica normativa completa, incluindo canonicalizacao, replay, invalidade,
retomada e governanca de `declared_priority`.
