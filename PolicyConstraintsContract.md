# Policy Constraints Contract

Versao: `0.1.0-draft`

Este documento especifica, de forma normativa e em alto nivel, o contrato de
Policy Constraints do Workflow V2.

Ele nao implementa runtime, evaluator, SDK, CLI, API, servidor, banco,
persistencia, approvals ou novos cenarios do Walking Skeleton.

## Autoridade documental

`PolicyConstraintsContract.md` e a fonte normativa para representar,
versionar, canonicalizar, digerir e reproduzir constraints emitidas por
policies.

As fronteiras sao:

- `PolicyEngine.md` define outcomes de policy: `allow`, `deny`,
  `allow_with_constraints` e `requires_approval`;
- `PolicyConstraintsContract.md` define o shape semantico das constraints
  usadas quando um outcome condiciona progresso;
- `contracts/PolicyConstraintsContract.md` define o shape minimo que uma
  implementacao futura deve aceitar ou produzir;
- `RegistrySnapshotContract.md` define snapshots e records que podem fornecer
  metadados avaliados por constraints;
- `ExecutorSelectionContract.md` define como constraints participam de
  eligibility e descarte de candidatos;
- `EventContract.md` e `EventCatalog.md` definem como constraints devem ser
  referenciadas por eventos;
- `ResultReferenceModel.md` define como o `ExecutionResult` referencia
  decisions e events sem duplicar conteudo de constraints.

Este contrato nao substitui policies. Ele normaliza as restricoes que uma
policy decide impor.

## Definicao

Uma Policy Constraint e uma restricao objetiva, tipada, versionada e
auditavel que limita uma execucao sem ampliar permissao.

Constraints podem:

- restringir escopo;
- restringir side effects;
- restringir permissoes;
- restringir dados acessiveis;
- restringir metadados de candidatos;
- exigir eventos ou validacoes;
- limitar custo, tempo ou tamanho quando esses valores estiverem versionados;
- exigir redacao ou classificacao segura.

Constraints nao podem:

- escolher executor diretamente;
- conhecer persona;
- interpretar prompt;
- depender de modelo;
- depender de memoria implicita;
- depender de estado `latest`;
- depender de ordem incidental de arrays, mapas, arquivos ou banco;
- carregar secrets, payloads sensiveis ou conteudo bruto que deveria estar em
  artefato ou input versionado.

## Outcome e constraint set

`allow_with_constraints` deve referenciar um `constraint_set` explicito.

`allow` nao deve esconder constraints implicitas. Se ha restricao nova imposta
pela policy, o outcome deve ser `allow_with_constraints`.

`deny` nao deve carregar constraints executaveis. Ele bloqueia progresso.

`requires_approval` pode referenciar constraints ja avaliadas como contexto
seguro, mas as regras de aprovacao pertencem a um contrato futuro de approval.

## Constraint set

Modelo conceitual minimo:

```yaml
constraint_set_version: "0.1.0"
constraint_set_id: "policy_constraint_set_id"
constraint_set_schema_version: "0.1.0"
policy_decision_ref:
  decision_id: "policy_decision_id"
  decision_version: "0.1.0"
policy_ref:
  policy_id: "policy_id"
  policy_version: "0.1.0"
subject_ref:
  kind: "task|plan|capability|artifact|executor_metadata|execution"
  id: "subject_id"
  version: "subject_version"
input_refs:
  - kind: "task|plan|capability_contract|registry_snapshot|artifact|event|memory"
    id: "input_id"
    version: "input_version_or_snapshot"
constraints:
  - constraint_id: "constraint_id"
    constraint_version: "0.1.0"
    constraint_type: "permission|side_effect|data_access|artifact|event|registry_candidate|execution_limit|network|redaction"
    enforcement_phase: "policy_decision|registry_lookup|selection_eligibility|invocation_context|artifact_validation|result_consolidation"
    target:
      kind: "task|capability|artifact|registry_record|executor_metadata|event|runtime_context|execution"
      path: "structured.field.path"
    operator: "eq"
    value_type: "enum_token"
    value: "expected_value"
    source_ref:
      kind: "policy|task|capability_contract|registry_snapshot|artifact|event"
      id: "source_id"
      version: "source_version"
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
constraint_set_digest: "digest_of_canonical_constraint_set"
```

Este formato e normativo como semantica, nao como schema executavel.

## Identidade e versionamento

Campos obrigatorios:

- `constraint_set_id`;
- `constraint_set_version`;
- `constraint_set_schema_version`;
- `constraint_set_digest`;
- `policy_decision_ref`;
- `policy_ref`;
- `subject_ref`;
- `input_refs`;
- `constraints`;
- `composition`.

Cada constraint deve ter:

- `constraint_id`;
- `constraint_version`;
- `constraint_type`;
- `enforcement_phase`;
- `target.kind`;
- `target.path`;
- `operator`;
- `value_type`;
- `value`;
- `source_ref`;
- `failure_code`.

Ids e versoes devem ser estaveis por replay. Nenhum id pode depender de UUID
aleatorio, wall-clock time, estado `latest`, prompt, persona, modelo ou
memoria implicita.

## Tipos de constraint

Tipos iniciais permitidos:

| Tipo | Responsabilidade |
| --- | --- |
| `permission` | Limitar permissoes requeridas ou concedidas. |
| `side_effect` | Limitar side effects permitidos. |
| `data_access` | Limitar classe, escopo ou referencia de dados acessiveis. |
| `artifact` | Limitar tipo, status, validacao ou redacao de artefatos. |
| `event` | Exigir eventos obrigatorios ou ausencia de eventos proibidos. |
| `registry_candidate` | Limitar metadados de candidatos no Registry snapshot. |
| `execution_limit` | Limitar custo, duracao, tamanho ou quantidade declarada. |
| `network` | Limitar acesso externo declarado. |
| `redaction` | Exigir redacao antes de evento, artefato ou resultado. |

Novos tipos exigem extensao versionada deste contrato ou contrato derivado.

## Tipos de valor

Tipos iniciais permitidos:

| `value_type` | Forma esperada |
| --- | --- |
| `boolean` | `true` ou `false`. |
| `integer` | Numero inteiro canonico. |
| `decimal` | Numero decimal canonico com representacao normalizada. |
| `enum_token` | Token seguro de catalogo versionado. |
| `string_token` | String curta, segura e nao livre para conteudo sensivel. |
| `version` | Versao semantica ou versao normativa do projeto. |
| `duration` | Duracao canonica, como segundos inteiros. |
| `size` | Tamanho canonico, como bytes inteiros. |
| `ref` | Referencia versionada `{ kind, id, version }`. |
| `set` | Conjunto canonico de valores do mesmo tipo. |
| `range` | Intervalo canonico com limites tipados. |

Texto livre nao e valor decisivo permitido. Quando uma decisao exigir conteudo
rico, a constraint deve apontar para artefato, evento ou input versionado.

## Operadores

Operadores iniciais permitidos:

| Operador | Tipos compativeis |
| --- | --- |
| `eq` | `boolean`, `integer`, `decimal`, `enum_token`, `string_token`, `version`, `duration`, `size`, `ref` |
| `neq` | mesmos tipos de `eq` |
| `in` | valor escalar contra `set` |
| `not_in` | valor escalar contra `set` |
| `exists` | qualquer target resolvivel |
| `absent` | qualquer target resolvivel |
| `lt` | `integer`, `decimal`, `duration`, `size`, `version` quando a ordenacao for declarada |
| `lte` | mesmos tipos de `lt` |
| `gt` | mesmos tipos de `lt` |
| `gte` | mesmos tipos de `lt` |
| `between` | `range` compativel com o target |
| `includes_all` | `set` |
| `includes_any` | `set` |
| `excludes_all` | `set` |

Se operador e `value_type` forem incompativeis, a constraint e invalida.

Operadores nao podem executar codigo, regex arbitrario, chamadas externas,
queries dinamicas ou interpretacao de linguagem natural.

## Composicao

Constraints podem ser compostas por grupos:

```yaml
composition:
  operator: "all|any|not"
  children:
    - constraint_ref:
        constraint_id: "constraint_id"
        constraint_version: "0.1.0"
    - group:
        operator: "all"
        children: []
```

Regras:

- `all` exige todas as constraints satisfeitas;
- `any` exige pelo menos uma constraint satisfeita;
- `not` deve ter exatamente um filho;
- composicao nao deve depender de short-circuit para produzir auditoria;
- todos os filhos avaliaveis devem registrar outcome conceitual durante a
  decisao;
- composicoes vazias sao invalidas;
- referencias circulares sao invalidas.

## Enforcement phases

`enforcement_phase` define onde a constraint deve ser avaliada ou reaplicada.

- `policy_decision`: avaliada pelo Policy Engine para produzir outcome.
- `registry_lookup`: transforma escopo de lookup sem modificar snapshot.
- `selection_eligibility`: elimina candidatos incompativeis por metadados
  versionados.
- `invocation_context`: limita o contexto entregue ao executor selecionado.
- `artifact_validation`: valida output antes de aceitar artefato.
- `result_consolidation`: exige referencias no `ExecutionResult`.

Uma constraint pode aparecer em mais de uma fase somente se cada fase estiver
declarada por constraint distinta ou por extensao versionada explicita.

## Canonicalizacao

Canonicalizacao deve permitir digest e replay.

Regras:

- chaves de objetos sao ordenadas lexicograficamente;
- `constraints` sao ordenadas por
  `constraint_id`, `constraint_version`, `constraint_type`, `target.kind` e
  `target.path`;
- conjuntos sao ordenados por identidade canonica dos valores;
- `input_refs` sao ordenados por `kind`, `id`, `version`;
- `composition.children` sao ordenados por referencia canonica quando a
  semantica do operador nao exigir ordem;
- valores numericos usam representacao canonica;
- campos descritivos opcionais nao entram na decisao;
- `constraint_set_digest` nao entra no proprio calculo;
- timestamps operacionais, assinaturas e metadados de transporte nao entram no
  digest decisivo.

## Digest

`constraint_set_digest` deve ser derivado deterministicamente da serializacao
canonica de:

- `constraint_set_schema_version`;
- `policy_decision_ref`;
- `policy_ref`;
- `subject_ref`;
- `input_refs`;
- `constraints`;
- `composition`;
- `canonicalization`.

O algoritmo criptografico final fica em aberto. Ate la, o requisito normativo
e determinismo, exclusao do proprio campo de digest e estabilidade por replay.

## Integracao com Policy

O Policy Engine produz constraints somente quando a decisao for
`allow_with_constraints`.

Regras:

- a policy decision deve referenciar `constraint_set_id`,
  `constraint_set_version` e `constraint_set_digest`;
- constraints devem referenciar a policy id e versao que as gerou;
- constraints nao podem ampliar permissao declarada pela task ou contratos;
- se uma constraint exigida nao puder ser tipada, versionada ou digerida, a
  policy deve falhar fechado com `deny` ou `requires_approval`;
- constraints nao podem conter prompts internos, secrets ou dados sensiveis
  brutos.

`allow` significa que nao ha constraints adicionais impostas pela policy.

## Integracao com Registry

Registry nao interpreta persona nem escolhe executor.

Na primeira versao do runtime e do Walking Skeleton, Registry lookup descobre
candidatos por capability, versao e escopo explicito do snapshot. Policy
constraints nao devem eliminar candidatos silenciosamente durante o lookup.
Elas sao avaliadas depois, na eligibility de selecao, para preservar
alternativas consideradas, motivos de descarte e replay deterministico.

`enforcement_phase: registry_lookup` fica reservado para escopos explicitamente
declarados em versoes futuras. Constraint pushdown e uma otimizacao fora desta
versao e so pode ser aceita quando preservar evidencia equivalente, o mesmo
conjunto semantico de candidatos e a mesma atribuicao de decisoes.

Eventos de lookup devem referenciar:

- policy decision id e versao;
- `constraint_set_id`, `constraint_set_version` e
  `constraint_set_digest`, quando houver;
- Registry snapshot id, versao, schema version e digest;
- criterios de lookup explicitos e independentes de descarte silencioso por
  constraints;
- conjunto canonico de records retornados.

Policy constraints e selection rules consomem snapshots como inputs
versionados. Elas nao modificam snapshots.

## Integracao com Selection

Constraints em `selection_eligibility` participam da eligibility conforme
`ExecutorSelectionContract.md`.

Regras:

- cada candidato deve ser avaliado contra constraints aplicaveis usando apenas
  Registry snapshot, policy decision e inputs versionados;
- candidato que falhar constraint deve ser descartado como inelegivel;
- o descarte deve registrar `failure_code: policy_constraint_failed`, constraint
  id, constraint version, constraint set digest e evidencia versionada;
- ranking so ocorre depois de remover candidatos inelegiveis;
- o executor nao participa da decisao sobre satisfazer constraints.

## Nenhum candidato satisfaz constraints

Quando Registry lookup retorna candidatos, mas nenhum candidato satisfaz
constraints de `selection_eligibility`:

- nenhum executor deve ser selecionado;
- nenhum executor deve ser invocado;
- nenhum attempt deve ser declarado;
- nenhum artifact de saida deve ser fabricado;
- a selecao deve bloquear como decisao de `executor_selection`;
- eventos devem referenciar a policy decision, constraint set, Registry
  snapshot, candidatos considerados e motivos objetivos de descarte;
- `ExecutionResult.status` deve ser `blocked` quando um novo input versionado
  puder resolver a condicao;
- `pending` deve indicar a condicao estruturada de retomada, sem fabricar id ou
  versao de snapshot futuro.

Quando uma versao futura permitir lookup escopado por constraints e esse lookup
retornar conjunto vazio:

- a selecao nao deve iniciar;
- o bloqueio deve referenciar a decisao de `registry_lookup`;
- o evento de lookup deve registrar explicitamente que o conjunto canonico
  retornado e vazio dentro do escopo e constraints referenciados.

## Eventos e resultados

Eventos decisivos que envolvem constraints devem referenciar:

- `constraint_set_id`;
- `constraint_set_version`;
- `constraint_set_digest`;
- constraints aplicadas por id e versao;
- policy decision id e versao;
- inputs versionados usados para avaliar constraints.

Eventos nao devem duplicar o corpo completo do constraint set quando ele for
conteudo duravel referenciavel.

`ExecutionResult` deve referenciar eventos e decisions relevantes, nao copiar
o conteudo das constraints.

## Replay

Replay deve reconstruir o mesmo outcome de constraints usando apenas:

- event stream;
- policy decision versionada;
- constraint set id, versao e digest;
- `TaskEnvelope`, `CapabilityPlan` e contratos versionados;
- Registry snapshot id, versao, schema version e digest;
- selection rule versionada, quando houver selection;
- artifacts ou memory refs versionados explicitamente referenciados.

Replay nao pode consultar estado atual, `latest`, prompt, persona, modelo,
memoria implicita, relogio real, UUID aleatorio ou ordem incidental.

Se o constraint set referenciado nao puder ser encontrado, se o digest nao
corresponder ao conteudo canonico, ou se algum input decisivo estiver ausente,
a execucao historica deve ser tratada como inconsistente para auditoria.

## Invalidade

Uma constraint e invalida quando:

- falta id, versao ou tipo;
- falta `source_ref`;
- operador e tipo sao incompativeis;
- target nao e resolvivel por input versionado;
- target aponta para conteudo sensivel bruto;
- depende de estado vivo nao snapshotado;
- depende de prompt, persona, modelo ou preferencia subjetiva;
- possui composicao vazia ou circular;
- digest nao corresponde ao conteudo canonico.

Constraints invalidas nao podem ser ignoradas silenciosamente.

## Invariantes

- Constraints so restringem; nunca ampliam permissao.
- Constraints sao tipadas e versionadas.
- Constraints sao inputs decisivos, nao comentarios.
- Constraints devem ser auditaveis por eventos.
- Constraints devem ser reproduziveis por replay.
- Constraints nao conhecem agentes como personas.
- Constraints nao escolhem executor diretamente.
- Constraints nao substituem Registry snapshot, CapabilityContract,
  PolicyEngine, ExecutorSelectionContract ou ExecutionResult.
- Ausencia, ambiguidade ou invalidade de constraint decisiva deve falhar
  fechado.

## Nao objetivos

- Implementar evaluator de constraints.
- Implementar runtime, Walking Skeleton ou novos cenarios.
- Definir storage ou transporte.
- Definir linguagem geral de policy.
- Definir approvals.
- Definir catalogo final de permissoes.
- Definir taxonomia final de dados sensiveis.
- Definir algoritmo criptografico final de digest.
- Criar SDK, CLI, API, servidor, banco ou fila.

## Pontos em aberto

- Catalogo completo de permissoes.
- Catalogo completo de side effects.
- Taxonomia final de classificacao de dados.
- Contrato futuro de approvals.
- Politica final para version ranges.
- Algoritmo criptografico final para digest.
