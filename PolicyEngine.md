# Policy Engine

Versao: `0.1.0-draft`

Este documento especifica, em alto nivel, o Policy Engine do Workflow V2.

O Policy Engine decide se uma acao, plano, capacidade, contexto, artefato ou execucao pode prosseguir. Ele nao executa capacidades, nao seleciona executor, nao conhece agentes, nao conhece personas, nao conhece modelos e nao interpreta prompts.

Ele responde apenas:

```text
allow
deny
allow_with_constraints
requires_approval
```

## Diretriz central

Toda decisao de policy deve ser deterministica, auditavel e baseada em inputs versionados.

O mesmo conjunto de inputs versionados, policies versionadas e contexto autorizado deve produzir a mesma decisao de policy.

Nenhuma decisao pode depender de:

- persona;
- nome narrativo de agente;
- modelo;
- provedor;
- prompt;
- memoria implicita;
- estado `latest`;
- criterio subjetivo nao registrado.

## Responsabilidade

O Policy Engine avalia permissoes, risco, constraints e necessidade de aprovacao.

Ele deve:

- avaliar `TaskEnvelope`;
- avaliar `CapabilityPlan`;
- avaliar `CapabilityContract`;
- avaliar side effects declarados;
- avaliar contexto autorizado;
- avaliar artefatos usados como input ou output;
- avaliar candidatos e execucoes apenas por metadados permitidos;
- produzir decisao explicita;
- emitir eventos compativeis com `EventContract`;
- fornecer constraints para o `ExecutionEngine` quando a decisao for `allow_with_constraints`.

O formato normativo de constraints, incluindo tipos, operadores,
composicao, canonicalizacao, digest e replay, e definido em
`PolicyConstraintsContract.md`.

Ele nao deve:

- resolver plano;
- consultar modelo;
- escolher executor;
- conhecer agente como persona;
- executar capacidade;
- criar artefato;
- consolidar `ExecutionResult`;
- substituir contratos existentes.

## Entradas

Entradas obrigatorias para uma decisao:

- `trace_id`;
- `task_id`;
- policy id;
- policy version;
- subject avaliado;
- input refs versionados;
- requested action;
- declared side effects;
- requested permissions;
- risk level declarado ou derivado de contrato.

Entradas possiveis:

- `TaskEnvelope`;
- `CapabilityPlan`;
- `CapabilityContract`;
- `Artifact Envelope v0`;
- `EventContract`;
- Registry snapshot, quando a decisao envolver metadados de executor;
- referencias de Memory, apenas quando versionadas e autorizadas;
- contexto operacional permitido.

Todos os inputs decisivos devem ter identificador e versao ou snapshot id.

## Saidas

O Policy Engine retorna exatamente uma decisao por avaliacao.

### allow

A acao pode prosseguir sem constraints adicionais alem das ja declaradas.

Uso esperado:

- leitura local permitida;
- capacidade de baixo risco;
- artefatos dentro do escopo;
- side effects compativeis com a task.

### deny

A acao nao pode prosseguir.

Uso esperado:

- side effect proibido;
- permissao ausente;
- acesso a dado sensivel sem policy valida;
- tentativa de acao destrutiva nao autorizada;
- input sem versao exigida para decisao deterministica.

### allow_with_constraints

A acao pode prosseguir somente com limites explicitos.

Constraints podem limitar:

- escopo de arquivos;
- tipos de artefato;
- side effects;
- rede;
- escrita;
- custo;
- tempo;
- executor metadata;
- dados acessiveis;
- eventos obrigatorios;
- necessidade de redacao de dados.

### requires_approval

A acao depende de aprovacao humana antes de prosseguir.

Uso esperado:

- publicacao externa;
- escrita de alto impacto;
- risco alto ou critico;
- acao destrutiva;
- acesso excepcional a dado sensivel;
- operacao cuja reversibilidade e limitada.

## Formato conceitual da decisao

```yaml
decision_version: "0.1.0"
decision_id: "policy_decision_ulid_or_uuid"
trace_id: "trace_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
policy_ref:
  policy_id: "policy_id"
  policy_version: "policy_version"
subject:
  kind: "task|plan|capability|artifact|executor_metadata|execution"
  id: "subject_id"
requested_action: "action_id"
input_refs:
  - kind: "task|plan|capability_contract|artifact|registry_snapshot|memory|event"
    id: "input_id"
    version: "input_version_or_snapshot"
decision: "allow|deny|allow_with_constraints|requires_approval"
reason: "motivo seguro e objetivo"
constraint_set_ref:
  constraint_set_id: "policy_constraint_set_id"
  constraint_set_version: "0.1.0"
  constraint_set_digest: "digest_of_canonical_constraint_set"
```

Este formato e especificacao arquitetural, nao schema implementado.

## Invariantes

- Toda decisao deve ter `decision_id`.
- Toda decisao deve ter `decision_version`.
- Toda decisao deve referenciar `trace_id` e `task_id`.
- Toda decisao deve referenciar policy id e policy version.
- Toda decisao deve ser uma entre `allow`, `deny`, `allow_with_constraints` ou `requires_approval`.
- Toda decisao deve registrar inputs versionados.
- `deny` nao pode incluir constraints de execucao; deve bloquear.
- `allow` nao pode esconder constraints implicitas.
- `allow_with_constraints` deve referenciar um constraint set explicito,
  tipado, versionado e digerido conforme `PolicyConstraintsContract.md`.
- `requires_approval` deve explicar qual aprovacao falta.
- Policy nao pode ampliar permissao alem do que a task e os contratos permitem.
- Policy nao pode depender de persona, modelo ou prompt.
- Policy nao pode autorizar uso de secrets em eventos ou artefatos.
- Policy deve falhar fechado quando input decisivo nao for versionado.

## Pontos de avaliacao

### Task policy check

Avalia uma `TaskEnvelope` antes da resolucao ou execucao.

Perguntas:

- a task tem escopo claro?
- side effects foram declarados?
- ha acao destrutiva?
- ha dados sensiveis?
- ha publicacao externa?
- ha necessidade de aprovacao?

### Plan policy check

Avalia um `CapabilityPlan`.

Perguntas:

- capacidades planejadas estao dentro do escopo da task?
- cada capacidade tem contrato versionado?
- side effects agregados sao permitidos?
- dependencias introduzem risco adicional?
- artefatos esperados sao permitidos?

### Capability policy check

Avalia uma capacidade especifica antes da execucao.

Perguntas:

- permissao requerida esta disponivel?
- risk level e aceitavel?
- inputs sao permitidos?
- outputs esperados sao permitidos?
- eventos obrigatorios sao suficientes para auditoria?

### Artifact policy check

Avalia artefatos como input ou output.

Perguntas:

- o artefato tem `artifact_id` e `artifact_version`?
- o tipo de artefato e permitido?
- o conteudo precisa de redacao?
- o artefato pode ser tratado como fonte de verdade?
- o artefato pode aparecer em `ExecutionResult`?

### Executor metadata policy check

Avalia metadados de candidato sem conhecer agente ou persona.

Perguntas:

- metadados vieram de snapshot versionado?
- side effects do executor sao compativeis?
- permissoes exigidas sao permitidas?
- limits e adapters sao aceitaveis?
- ha restricao objetiva que descarte o candidato?

## Auditabilidade por eventos

Toda decisao do Policy Engine deve emitir ou exigir evento compativel com `EventContract`.

Evento minimo deve registrar:

- `event_type`;
- `trace_id`;
- `task_id`;
- policy id;
- policy version;
- subject avaliado;
- decision outcome;
- reason seguro;
- input refs versionados;
- constraints, quando existirem;
- approval requirement, quando existir.

Tipos iniciais de evento:

```text
policy.check.started
policy.check.completed
policy.decision.allowed
policy.decision.denied
policy.decision.allowed_with_constraints
policy.decision.requires_approval
```

Esses tipos nao criam componente novo. Eles formalizam eventos de policy ja previstos pelo runtime.

## Relacao com Execution Engine

O `ExecutionEngine` consulta o Policy Engine em pontos de decisao.

O Policy Engine responde com uma decisao e, quando aplicavel, constraints.

O Execution Engine deve:

- respeitar `deny`;
- pausar em `requires_approval`;
- propagar constraints de `allow_with_constraints`;
- registrar eventos de policy;
- incluir policy outcome no `ExecutionResult`;
- nao reinterpretar policy para ampliar permissao.

O Policy Engine nao chama executores e nao seleciona candidatos. Ele apenas permite, nega ou condiciona a decisao que o Execution Engine quer tomar.

## Relacao com EventContract

Decisoes de policy devem ser eventos de decisao.

Eventos de policy devem:

- usar `decision.kind: policy_outcome`;
- referenciar policies versionadas;
- referenciar inputs decisivos;
- nao conter prompts internos;
- nao conter dados sensiveis;
- registrar constraints de forma segura;
- apontar para artefatos quando uma decisao duravel exigir justificativa documental.

## Falha segura

O Policy Engine deve falhar fechado.

Se um input decisivo estiver ausente, ambiguo, sem versao ou fora do escopo, a decisao deve ser:

```text
deny
```

ou:

```text
requires_approval
```

`allow` nao e valido quando a policy nao consegue explicar de forma deterministica por que a acao e permitida.

## O que o Policy Engine nunca conhece

O Policy Engine nunca deve decidir com base em:

- persona;
- nome humano de agente;
- tom de resposta;
- modelo;
- provedor de modelo;
- prompt interno;
- system prompt;
- chain-of-thought;
- preferencia subjetiva;
- estado mutavel nao versionado;
- conteudo sensivel bruto.

## Pontos em aberto

- Definir formato final de policy id e policy version.
- Definir catalogo inicial de permissoes.
- Definir taxonomia de side effects.
- Definir como representar approvals humanos sem implementar sistema externo.
- Definir como policies compostas resolvem conflito.
- Definir se `requires_approval` pode incluir constraints previas.
- Definir quais decisoes de policy exigem artefato `decision`.

## Nao objetivos

- Implementar policy evaluation.
- Implementar storage de policies.
- Implementar approvals.
- Implementar SDK, CLI, servidor ou banco.
- Criar agentes.
- Criar modelo de permissao definitivo.
- Escrever pseudocodigo.
