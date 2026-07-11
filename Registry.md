# Registry

Versao: `0.1.0-draft`

Este documento especifica, em alto nivel, o Registry do Workflow V2.

O Registry e a fonte de verdade para descoberta de capacidades registradas e metadados de execucao necessarios para selecao deterministica. Ele nao conhece agentes como personas. Ele conhece capacidades, versoes de contrato e candidatos opacos capazes de executar capacidades.

O Registry nao armazena memoria, artefatos, prompts ou estado de execucao.

## Diretriz central

Toda resposta do Registry deve ser deterministica, versionada e auditavel.

Uma mesma consulta contra o mesmo snapshot do Registry deve retornar o mesmo conjunto de registros, na mesma ordem deterministica, com os mesmos metadados.

O Registry nao decide quem executa. Ele fornece candidatos e metadados. A selecao pertence ao `ExecutionEngine`, sob restricoes do `PolicyEngine`.

## Registry versus CapabilityContract

`CapabilityContract` define a semantica de uma capacidade.

Ele responde:

- o que a capacidade faz;
- quais entradas aceita;
- quais saidas promete;
- quais criterios de sucesso e falha existem;
- quais permissoes e side effects fazem parte do contrato;
- quais artefatos a capacidade pode exigir ou produzir.

`Registry` cataloga disponibilidade e metadados de descoberta.

Ele responde:

- quais capacidades estao registradas;
- quais versoes dessas capacidades existem;
- quais candidatos opacos suportam uma capacidade;
- quais versoes de contrato cada candidato suporta;
- quais metadados de execucao sao conhecidos para selecao;
- qual snapshot foi usado em uma consulta.

O Registry nao redefine a semantica de uma capacidade. Se um registro contradisser o `CapabilityContract`, o registro e invalido.

## Responsabilidades

O Registry deve:

- registrar capacidades por `capability_id` e versao;
- registrar candidatos opacos de execucao por capacidade;
- mapear compatibilidade entre candidato e `CapabilityContract`;
- expor metadados necessarios para discovery e selecao;
- produzir snapshots versionados;
- responder consultas deterministicas;
- preservar ordem estavel de resultados;
- emitir ou permitir eventos compativeis com `EventContract`;
- rejeitar registros que dependam de persona, prompt, modelo implicito ou estado mutavel nao versionado.

O Registry nao deve:

- decidir policy;
- selecionar executor final;
- executar capacidades;
- armazenar memoria;
- armazenar artefatos;
- armazenar prompts;
- armazenar estado de execucao;
- armazenar historico de task;
- conhecer agente como persona;
- depender de modelo ou provedor como criterio central.

## Entidades registraveis

### Capability registration

Registro de uma capacidade disponivel.

Metadados obrigatorios:

```yaml
registry_record_version: "0.1.0"
record_id: "record_ulid_or_uuid"
record_type: "capability"
capability_id: "domain.action"
capability_version: "0.1.0"
capability_contract_ref:
  id: "domain.action"
  version: "0.1.0"
status: "active|deprecated|disabled"
registered_at: "iso-8601"
updated_at: "iso-8601"
```

### Execution candidate registration

Registro de um candidato opaco capaz de executar uma capacidade.

Metadados obrigatorios:

```yaml
registry_record_version: "0.1.0"
record_id: "record_ulid_or_uuid"
record_type: "execution_candidate"
candidate_id: "opaque_candidate_id"
candidate_metadata_version: "candidate_metadata_version"
supported_capabilities:
  - capability_id: "domain.action"
    capability_version: "0.1.0"
supported_contracts:
  - contract_id: "CapabilityContract"
    contract_version: "0.1.0-draft"
execution_metadata:
  candidate_type: "service|human|code|agent|adapter"
  required_permissions:
    - "permission.id"
  declared_side_effects:
    - "read|write|network|external_state|destructive"
  required_adapters:
    - "adapter.id"
  limits:
    max_concurrency: 1
    timeout_ms: 300000
  risk_level: "low|medium|high|critical"
status: "active|deprecated|disabled|unavailable"
registered_at: "iso-8601"
updated_at: "iso-8601"
```

`candidate_type: agent` e um tipo operacional, nao uma persona. O Registry nao pode armazenar tom, papel narrativo, prompt ou identidade humana do agente como criterio de selecao.

### Compatibility registration

Registro opcional que torna explicita a compatibilidade entre capacidade e candidato.

Metadados obrigatorios:

```yaml
registry_record_version: "0.1.0"
record_id: "record_ulid_or_uuid"
record_type: "compatibility"
capability_id: "domain.action"
capability_version: "0.1.0"
candidate_id: "opaque_candidate_id"
candidate_metadata_version: "candidate_metadata_version"
status: "compatible|incompatible|deprecated"
reason: "motivo seguro e objetivo"
updated_at: "iso-8601"
```

## Metadados proibidos

O Registry nunca deve armazenar ou retornar:

- memoria;
- artefatos;
- prompts;
- system prompts;
- chain-of-thought;
- estado de execucao;
- payloads de task;
- resultados de execucao;
- secrets;
- credenciais;
- dados sensiveis brutos;
- nome narrativo de persona;
- tom de voz;
- preferencia subjetiva;
- afinidade implicita com modelo.

Quando um dado for necessario para selecao, ele deve ser expresso como metadado objetivo, seguro e versionado.

## Versionamento

Todo registro do Registry deve ter:

- `registry_record_version`;
- id estavel;
- versao do objeto registrado;
- timestamps de registro e atualizacao;
- status explicito.

Regras:

- alteracao de metadado decisivo exige nova versao do registro ou novo snapshot;
- registros antigos devem continuar referenciaveis por snapshots historicos;
- consultas usadas por execucoes devem registrar snapshot id;
- `candidate_metadata_version` deve mudar quando qualquer metadado usado para selecao mudar;
- versao de capacidade deve corresponder ao `CapabilityContract` referenciado.

## Snapshots

Snapshot e uma visao imutavel do Registry em um momento logico.

Metadados obrigatorios:

```yaml
registry_snapshot_id: "registry_snapshot_ulid_or_uuid"
registry_snapshot_version: "0.1.0"
created_at: "iso-8601"
records:
  - record_id: "record_ulid_or_uuid"
    record_version: "record_version"
```

Regras:

- consultas do `ExecutionEngine` devem usar snapshot;
- eventos devem referenciar `registry_snapshot_id`;
- snapshot nao muda depois de criado;
- snapshot deve permitir reproduzir resultados de consulta;
- se snapshot nao existir, a decisao nao e historicamente reproduzivel.

## Consultas permitidas

O Registry deve permitir apenas consultas de descoberta e compatibilidade.

Consultas permitidas:

- listar capacidades por status;
- buscar capacidade por `capability_id` e versao;
- listar versoes de uma capacidade;
- listar candidatos por `capability_id` e `capability_version`;
- obter metadados versionados de candidato;
- verificar compatibilidade declarada;
- criar snapshot;
- ler snapshot por id;

Consultas proibidas:

- buscar por persona;
- buscar por prompt;
- buscar por memoria;
- buscar por artefato;
- buscar por estado de execucao;
- buscar por resultado historico;
- retornar "melhor executor";
- ordenar por criterio nao declarado;
- consultar estado vivo sem snapshot.

O Registry pode ordenar resultados apenas por regra deterministica registrada, como id, versao, status e prioridade declarada. Se houver ranking operacional, o criterio deve ser versionado e auditavel.

## Invariantes

- Registry nao redefine `CapabilityContract`.
- Registry nao seleciona executor final.
- Registry nao avalia policy.
- Registry nao armazena estado runtime.
- Registry nao armazena memoria, artefatos ou prompts.
- Todo registro decisivo deve ser versionado.
- Toda consulta decisiva deve apontar para snapshot.
- Todo candidato deve declarar capacidades suportadas por id e versao.
- Todo candidato deve declarar side effects e permissoes requeridas.
- Todo resultado de consulta deve ser ordenado de forma deterministica.
- Todo metadado usado por `ExecutionEngine` deve ser auditavel por evento.
- Registros desabilitados nao podem aparecer como candidatos ativos.
- Registros deprecated podem aparecer somente quando a consulta permitir explicitamente.

## Relacao com CapabilityContract

O `CapabilityContract` e a fonte de verdade semantica.

O Registry referencia o contrato por id e versao.

O Registry pode dizer:

- esta versao de capacidade existe no catalogo;
- este candidato suporta esta versao;
- este candidato declara estes side effects;
- este candidato exige estas permissoes.

O Registry nao pode dizer:

- que a capacidade significa algo diferente do contrato;
- que criterios de sucesso mudaram;
- que entradas ou saidas foram alteradas;
- que side effects do contrato nao se aplicam;
- que um candidato pode ignorar policy.

## Relacao com ExecutionEngine

O `ExecutionEngine` consulta o Registry para descobrir candidatos por capacidade.

O Registry devolve:

- snapshot id;
- capability registration;
- candidate registrations;
- compatibility records;
- metadados objetivos para selecao.

O `ExecutionEngine` deve:

- registrar o snapshot usado;
- registrar candidatos considerados;
- registrar candidatos descartados;
- selecionar com criterios deterministas;
- nunca pedir ao Registry "quem deve executar";
- nunca usar persona como criterio de selecao.

## Relacao com PolicyEngine

O `PolicyEngine` pode avaliar metadados vindos do Registry.

Ele pode usar:

- required permissions;
- declared side effects;
- risk level;
- candidate type operacional;
- required adapters;
- limits;
- status;
- compatibility status.

O `PolicyEngine` nao deve pedir ao Registry informacao de memoria, artefato, prompt ou estado de execucao.

Se policy negar um candidato, essa decisao deve ser registrada como evento de policy, nao como alteracao retroativa no Registry.

## Auditabilidade por eventos

Toda consulta decisiva ao Registry deve ser auditavel por evento compativel com `EventContract`.

Eventos esperados:

```text
registry.snapshot.created
registry.lookup.completed
registry.record.matched
registry.record.discarded
```

Evento de lookup deve registrar:

- `registry_snapshot_id`;
- `trace_id`;
- `task_id`;
- `capability_id`;
- `capability_version`;
- registros retornados;
- registros descartados;
- motivo seguro de descarte;
- regra deterministica de ordenacao.

Esses eventos nao criam componentes novos. Eles formalizam a trilha de auditoria das consultas ao Registry.

## Falha segura

O Registry deve falhar fechado quando:

- capability id nao existir;
- versao solicitada nao existir;
- snapshot nao existir;
- candidato nao tiver metadados versionados;
- candidato nao declarar permissoes;
- candidato nao declarar side effects;
- registro contradisser `CapabilityContract`;
- consulta depender de estado vivo nao versionado.

Falha fechada significa devolver nenhum candidato valido e registrar evento seguro de lookup ou descarte.

## Pontos em aberto

- Definir formato final de `registry_record_version`.
- Definir formato final de `registry_snapshot_id`.
- Definir taxonomia inicial de `candidate_type`.
- Definir regras de prioridade declarada sem virar selecao.
- Definir ciclo de vida de registros deprecated e disabled.
- Definir como compatibilidade sera validada sem implementar runtime.
- Definir catalogo inicial de metadados obrigatorios por tipo operacional.

## Nao objetivos

- Implementar Registry.
- Implementar storage.
- Implementar busca.
- Implementar ranking.
- Implementar agentes.
- Implementar banco.
- Armazenar memoria.
- Armazenar artefatos.
- Armazenar prompts.
- Armazenar estado de execucao.
- Escrever pseudocodigo.
