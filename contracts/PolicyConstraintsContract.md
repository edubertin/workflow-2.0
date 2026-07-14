# PolicyConstraintsContract

Versao: `0.1.0-draft`

Este contrato define o shape minimo de Policy Constraints aceito ou produzido
por uma implementacao futura do Workflow V2.

## Responsabilidade

Representar um constraint set tipado, versionado, canonico e referenciavel
usado como input decisivo por policy, eligibility, selection, eventos e replay.

## Campos obrigatorios

```yaml
constraint_set_id: "policy_constraint_set_id"
constraint_set_version: "0.1.0"
constraint_set_schema_version: "0.1.0"
constraint_set_digest: "digest_of_canonical_constraint_set"
provenance:
  source_id: "policy_source_id"
  source_version: "0.1.0"
  source_digest: "source_digest"
operator_catalog:
  catalog_id: "policy_constraint_operator_catalog"
  catalog_version: "0.1.0"
policy_decision_ref:
  decision_id: "policy_decision_id"
  decision_version: "0.1.0"
policy_ref:
  policy_id: "policy_id"
  policy_version: "0.1.0"
subject_ref:
  kind: "task|plan|capability|artifact|executor_metadata|execution"
  id: "subject_id"
  version: "0.1.0"
input_refs:
  - kind: "task|plan|capability_contract|registry_snapshot|artifact|event|memory"
    id: "input_id"
    version: "0.1.0"
constraints:
  - constraint_id: "constraint_id"
    constraint_version: "0.1.0"
    constraint_type: "permission|side_effect|data_access|artifact|event|registry_candidate|execution_limit|network|redaction"
    enforcement_phase: "selection_eligibility"
    target:
      kind: "registry_record|executor_metadata"
      path: "structured.field.path"
    operator:
      operator_id: "eq|neq|in|not_in|exists|absent|lt|lte|gt|gte|between|includes_all|includes_any|excludes_all"
      operator_version: "0.1.0"
    value_type: "boolean|integer|decimal|enum_token|string_token|version|duration|size|ref|set|range"
    value: "canonical_value"
    source_ref:
      kind: "policy|task|capability_contract|registry_snapshot|artifact|event"
      id: "source_id"
      version: "0.1.0"
    failure_code: "policy_constraint_failed"
composition:
  operator: "all"
  children:
    - constraint_ref:
        constraint_id: "constraint_id"
        constraint_version: "0.1.0"
canonicalization:
  object_key_order: "lexicographic"
  set_order: "canonical_identity"
```

## Invariantes

- `constraint_set_digest` corresponde ao conteudo canonico e nao participa do
  proprio calculo.
- `constraints` e um conjunto canonico, nao lista incidental.
- Cada constraint deve ser tipada e versionada.
- Cada operador deve declarar id e versao.
- Constraints so restringem; nunca ampliam permissao.
- Constraints nao podem escolher executor diretamente.
- Constraints nao podem depender de persona, prompt, modelo, memoria
  implicita, `latest`, wall-clock time, UUID aleatorio ou ordem incidental.
- Registry lookup nao deve ocultar candidatos por constraints nesta versao.
- Selection deve avaliar constraints usando inputs versionados antes de
  ranking.

## Relacao com PolicyConstraintsContract.md

Este arquivo define o shape minimo. `PolicyConstraintsContract.md` define a
semantica normativa completa, incluindo tipos, operadores, composicao,
canonicalizacao, digest, integracao com Policy, Registry, Selection e replay.
