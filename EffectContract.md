# EffectContract

Versao: `0.1.0-draft`

Este documento define a especificacao normativa minima de `Effect` no Workflow
V2.

Um effect e trabalho externo declarado pela State Machine como consequencia de
um command aceito e de uma transicao validada. Ele separa decisao
deterministica de execucao no mundo externo.

Effect nao e evento, nao e command, nao e tentativa, nao e executor e nao e
resultado. Effect tambem nao define transporte, API, storage, fila, SDK, CLI,
servidor, banco ou framework.

## Objetivo

`EffectContract` existe para permitir que o Walking Skeleton percorra:

```text
Command -> State Machine -> Effect -> Evidence -> Event
```

sem que o codigo precise inventar semantica sobre trabalho externo.

Ele define:

- identidade do effect;
- versionamento;
- tipo de trabalho externo solicitado;
- causalidade com command, evento e transicao;
- inputs versionados usados para declarar o effect;
- side effects declarados;
- idempotencia;
- relacao com eventos, artefatos e attempts futuros.

## Definicao

Um effect e uma solicitacao declarada pela State Machine para que outro
componente execute trabalho fora da propria State Machine.

Exemplos conceituais:

- avaliar policy;
- consultar Registry;
- invocar executor;
- validar artefato;
- consolidar resultado.

Um effect so pode existir depois que a State Machine aceitar um command.

Um effect nao muda estado por si so. A mudanca de estado continua dependendo de
evento aceito segundo o `EventContract`.

## Responsabilidade

O effect deve:

- declarar o trabalho externo necessario;
- preservar `trace_id` e `task_id`;
- referenciar o command que o originou;
- referenciar a transicao que o declarou quando houver;
- listar inputs versionados usados para sua declaracao;
- declarar side effects esperados;
- carregar chave de idempotencia propria;
- permitir correlacao com eventos de conclusao, falha ou bloqueio;
- ser seguro para auditoria.

O effect nao deve:

- executar trabalho por si so;
- registrar fato historico;
- substituir evento;
- substituir command;
- substituir attempt;
- escolher executor por persona;
- carregar prompt, modelo, chain-of-thought ou payload sensivel;
- depender de estado `latest` sem snapshot ou evento.

## Campos obrigatorios

Todo effect deve conter:

```yaml
effect_version: "0.1.0"
effect_id: "effect_ulid_or_uuid"
effect_type: "policy.evaluate|registry.lookup|executor.invoke|artifact.validate|result.consolidate"
trace_id: "trace_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
declared_at: "iso-8601"
declared_by:
  kind: "state_machine"
  id: "state_machine_id"
command_ref:
  command_id: "command_ulid_or_uuid"
  command_version: "0.1.0"
causality:
  caused_by_event_id: "event_id_or_null"
  state_transition:
    from: "previous_state"
    to: "next_state"
input_refs:
  - kind: "task|plan|capability_contract|policy_decision|registry_snapshot|artifact|event|executor_metadata|runtime_context"
    id: "input_id"
    version: "input_version_or_snapshot"
side_effects:
  - "read|write|network|external_state|destructive"
idempotency:
  key: "stable_effect_idempotency_key"
  scope: "trace|task|command|effect_type"
expected_evidence:
  - "event|artifact_ref|policy_decision|registry_snapshot|executor_result"
```

Este formato e conceitual e normativo. Ele nao define schema executavel.

`expected_evidence` descreve quais evidencias o effect espera produzir ou
observar. Ele orienta auditoria e correlacao, mas nao e checklist obrigatorio
de implementacao nem define mecanismo de execucao.

## effect_type

`effect_type` classifica o trabalho externo solicitado.

Tipos iniciais suficientes para o Walking Skeleton:

- `policy.evaluate`;
- `registry.lookup`;
- `executor.invoke`;
- `artifact.validate`;
- `result.consolidate`.

Regras:

- todo `effect_type` deve ter significado unico dentro da versao do contrato;
- `effect_type` nao pode representar persona, modelo, prompt ou transporte;
- mudanca de significado exige novo `effect_type` ou nova versao do contrato;
- efeitos historicos devem continuar compreensiveis por `effect_type`,
  `effect_version` e inputs versionados.

## Causalidade

Todo effect deve preservar por que foi declarado.

Regras:

- effect deve referenciar o `command_id` que o originou;
- effect deve referenciar a transicao de estado quando for resultado direto de
  uma transicao;
- effect deve referenciar evento causal quando existir;
- effect nao pode depender apenas de timestamp para explicar causalidade;
- effect derivado de outro effect deve referenciar evento que observou a
  conclusao, falha ou bloqueio anterior.

## Idempotencia

Idempotencia de effect e separada da idempotencia de command.

Regras:

- todo effect deve ter `idempotency.key`;
- a mesma chave, no mesmo escopo e com os mesmos inputs versionados, deve
  representar a mesma solicitacao externa;
- idempotencia de effect nao autoriza repetir operacao externa quando o
  trabalho nao for seguro para repeticao;
- repeticao, retry e timeout pertencem ao `AttemptContract`;
- o Walking Skeleton pode executar exatamente uma tentativa por effect sem
  definir retry.

## Relacao com State Machine

A State Machine declara effects, mas nao os executa.

Regras:

- effect so pode ser declarado por command aceito;
- effect deve ser derivado de estado reconstruido por eventos;
- effect deve usar `RuntimeContext` versionado;
- effect declarado deve ser auditavel por evento de transicao, decisao ou
  aplicacao de command;
- a State Machine nao deve observar resultado externo sem novo evento ou
  command derivado.

## Relacao com Events

Eventos sao fatos. Effects sao solicitacoes externas declaradas.

Regras:

- effect declarado deve ser referenciado por evento quando for decisivo para a
  execucao;
- conclusao de effect deve gerar evento ou command derivado que produza evento;
- falha de effect deve gerar evento seguro;
- evento nao deve copiar payload completo do effect quando referencias forem
  suficientes;
- replay usa eventos para reconstruir estado, nao effects executados.

## Relacao com Commands

Commands solicitam mudanca. Effects solicitam trabalho externo apos mudanca
aceita.

Regras:

- command pode levar a effect declarado;
- effect deve referenciar command;
- effect nao pode ampliar a semantica do command;
- effect nao pode executar command;
- command futuro pode ser derivado de evidencia produzida por effect.

## Relacao com RuntimeContext

Effect deve ser declarado a partir de um `RuntimeContext` versionado.

Regras:

- todo input decisivo usado para declarar effect deve aparecer em `input_refs`;
- se o effect depende de Registry, deve referenciar snapshot;
- se o effect depende de policy, deve referenciar policy id, policy version ou
  policy decision;
- se o effect envolve executor, deve referenciar executor metadata versionado;
- se o effect envolve artefato, deve referenciar `artifact_id` e
  `artifact_version`.

## Relacao com ArtifactEnvelope

Effects podem solicitar validacao ou producao de artefatos, mas nao sao
artefatos.

Regras:

- effect nao deve embutir `content.body` de artefato;
- effect deve referenciar artefatos por id e versao;
- resultado duravel de effect deve aparecer como `ArtifactEnvelope` quando
  houver conteudo duravel;
- validacao de artefato deve ser registrada por evento.

## Relacao com Attempts

Attempt representa uma tentativa de executar um effect.

Nesta fase:

- `AttemptContract.md` define a identidade e a correlacao de tentativas;
- um effect pode ter zero attempts quando ainda nao foi iniciado;
- um effect pode ter um ou mais attempts ao longo do tempo;
- cada attempt deve pertencer a exatamente um effect;
- tentativas sucessivas do mesmo effect sao diferenciadas por
  `attempt_number`, ordinal normativo definido por `AttemptContract.md`;
- o Walking Skeleton pode tratar cada effect como tendo uma unica tentativa;
- retry, timeout e resultado tardio continuam fora do escopo;
- todo attempt deve referenciar `effect_id` e `effect_version`.

## Invariantes

- Todo effect deve ter `effect_id`.
- Todo effect deve ter `effect_version`.
- Todo effect deve pertencer a exatamente um `trace_id`.
- Todo effect deve referenciar exatamente um `task_id`.
- Todo effect deve referenciar exatamente um command.
- Todo effect deve ter `effect_type`.
- Todo effect deve ter `idempotency.key`.
- Todo effect decisivo deve referenciar inputs versionados.
- Nenhum effect pode mudar estado sem evento correspondente.
- Nenhum effect pode executar a si mesmo.
- Nenhum effect pode depender de persona, prompt, modelo ou memoria implicita.
- Nenhum effect pode depender de `latest` sem snapshot ou evento.

## O que um effect nao e

Um effect nao e:

- evento;
- command;
- tentativa;
- executor;
- policy decision;
- Registry snapshot;
- artifact;
- resultado;
- estado materializado;
- memoria;
- transporte;
- endpoint de API;
- mensagem de fila;
- registro de banco;
- implementacao.

## Pontos em aberto

- Definir quando effect declarado exige evento proprio alem do evento de
  transicao.
- Definir catalogo completo de `effect_type` apos o Walking Skeleton.

## Nao objetivos

- Implementar effect runner.
- Definir transporte.
- Definir API.
- Definir storage.
- Definir fila.
- Definir banco.
- Definir framework.
- Definir SDK ou CLI.
- Implementar attempts.
- Implementar retries.
- Implementar scheduler.
- Criar agentes.
- Criar prompts.
