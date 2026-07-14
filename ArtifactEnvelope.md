# ArtifactEnvelope

Versao: `0.1.0-draft`

Este documento especifica, em alto nivel, o `Artifact Envelope v0` do
Workflow V2.

O nome oficial adotado pela arquitetura atual e `Artifact Envelope v0`. Este
documento consolida a semantica desse envelope sem implementar storage,
schema executavel, SDK, CLI, servidor ou banco.

## Definicao

Um artefato e uma unidade duravel de conhecimento, evidencia ou entrega
produzida, consumida ou validada pelo runtime.

Artefatos podem representar:

- documentos;
- decisoes;
- planos;
- patches;
- relatorios;
- traces;
- manifestos.

O `Artifact Envelope v0` e o contrato minimo que identifica, contextualiza e
valida um artefato. Ele separa o conteudo do artefato de sua origem, status,
proveniencia e validacao.

## Por que artefatos sao fonte de verdade

Conversas, memoria implicita e respostas transitorias ajudam a conduzir o
trabalho, mas nao sao suficientes para auditoria, retomada e revisao.

Artefatos sao fonte de verdade porque:

- possuem identidade propria;
- podem ser versionados;
- preservam relacao com task, capability, executor e trace;
- carregam status de ciclo de vida;
- registram quem criou o envelope e quando;
- podem ser validados contra criterios verificaveis;
- podem ser referenciados por eventos e resultados sem duplicar conteudo;
- permitem reconstruir uma execucao sem depender de memoria implicita.

Um artefato final representa conhecimento ou entrega que pode sobreviver ao
contexto conversacional que o originou.

## Responsabilidade

O `Artifact Envelope v0` deve:

- identificar o artefato;
- declarar sua finalidade semantica;
- indicar seu status;
- ligar o artefato a uma execucao;
- apontar para o conteudo ou carregar conteudo pequeno inline;
- registrar proveniencia operacional;
- registrar validacao;
- permitir referencia por eventos e `ExecutionResult`.

Ele nao deve:

- executar validacao;
- armazenar historico de execucao inteiro;
- substituir eventos;
- substituir resultado;
- substituir memoria;
- definir storage;
- definir permissao detalhada por campo;
- depender de modelo, prompt, persona ou agente especifico.

## Metadados obrigatorios

Todo envelope deve conter os campos abaixo.

### artifact_version

Versao do formato do envelope.

Semantica:

- versiona a estrutura do envelope, nao o conteudo;
- permite ler artefatos historicos mesmo depois de evolucoes futuras;
- deve estar presente em toda referencia auditavel ao artefato.

### artifact_id

Identificador estavel do artefato dentro do runtime.

Semantica:

- identifica o artefato independentemente de caminho de arquivo ou URI;
- deve ser unico no escopo definido pelo runtime;
- deve ser usado por eventos, resultados e referencias cruzadas.

### artifact_type

Finalidade semantica do artefato.

Tipos iniciais:

- `document`;
- `decision`;
- `plan`;
- `patch`;
- `report`;
- `trace`;
- `manifest`.

Semantica:

- descreve para que o artefato existe;
- nao descreve formato de serializacao;
- deve permanecer amplo o suficiente para evitar schemas prematuros por tipo.

### status

Estado de ciclo de vida do artefato.

Status iniciais:

- `draft`;
- `proposed`;
- `final`;
- `superseded`;
- `rejected`.

Semantica:

- `draft` indica conteudo em elaboracao;
- `proposed` indica artefato pronto para avaliacao ou aceite;
- `final` indica fonte de verdade ativa;
- `superseded` indica fonte de verdade substituida por outro artefato;
- `rejected` indica artefato explicitamente recusado.

`status` nao e resultado de validacao tecnica. Essa responsabilidade pertence
a `validation.status`.

### title

Nome humano curto do artefato.

Semantica:

- ajuda revisao e navegacao;
- nao e identificador estavel;
- nao deve ser usado como chave de decisao do runtime.

### source

Ligacao com a execucao que originou o artefato.

Campos obrigatorios de `source`:

- `task_id`;
- `capability_id`;
- `executor_id`;
- `trace_id`.

Semantica:

- `task_id` conecta o artefato ao `TaskEnvelope`;
- `capability_id` conecta o artefato a capacidade que o produziu ou validou;
- `executor_id` identifica o executor opaco que participou da producao;
- `trace_id` conecta o artefato a eventos e resultado da execucao.

`source` registra linhagem de execucao. Ele nao registra autoria editorial nem
propriedade do conteudo.

### content

Conteudo do artefato ou referencia segura ao conteudo.

Campos obrigatorios de `content`:

- `format`;
- exatamente um entre `body` e `uri`.

Semantica:

- `format` descreve a serializacao, como `markdown`, `json`, `patch` ou
  `text`;
- `body` pode carregar conteudo pequeno e portavel;
- `uri` aponta para arquivo, anexo ou referencia externa;
- `body` e `uri` nao devem coexistir no mesmo envelope.

O envelope nao define onde o conteudo e armazenado. Ele apenas torna o conteudo
enderecavel de forma minima.

### provenance

Registro de criacao operacional do envelope.

Campos obrigatorios de `provenance`:

- `created_at`;
- `created_by`.

Semantica:

- `created_at` indica quando o envelope foi criado;
- `created_by` indica se o envelope foi criado por `runtime`, `executor` ou
  `human`;
- provenance nao substitui `source`;
- provenance nao deve conter identidade sensivel desnecessaria.

### validation

Resultado da verificacao do artefato contra criterios observaveis.

Campos obrigatorios de `validation`:

- `status`;
- `criteria`.

Status iniciais:

- `unchecked`;
- `valid`;
- `invalid`.

Semantica:

- `unchecked` indica que a validacao ainda nao ocorreu;
- `valid` indica que criterios declarados foram satisfeitos;
- `invalid` indica que pelo menos um criterio verificavel falhou;
- `criteria` lista os criterios usados ou esperados;
- criterios devem referenciar `CapabilityContract` ou requisitos do plano
  quando possivel.

`validation.status` nao altera o ciclo de vida por si so. Um artefato pode ser
`proposed` e `valid`, ou `final` e posteriormente receber novo evento
indicando invalidacao sem reescrever seu historico.

## Versionamento

`artifact_version` versiona o envelope.

Regras:

- toda mudanca na estrutura obrigatoria do envelope exige nova versao;
- artefatos antigos devem continuar legiveis;
- eventos devem referenciar `artifact_id` e `artifact_version`;
- `ExecutionResult` deve referenciar artefatos por identidade e status, nao
  duplicar conteudo;
- mudancas no conteudo exigem novo `artifact_id` nesta versao inicial;
- substituicao de conteudo deve ser registrada por evento e pelo status
  `superseded` no artefato anterior, sem reescrever o historico.

Mudancas compativeis:

- adicionar campo opcional;
- adicionar novo `artifact_type` amplo;
- adicionar novo status de validacao opcional;
- refinar descricao sem mudar significado.

Mudancas incompativeis:

- remover campo obrigatorio;
- alterar significado de campo existente;
- permitir `body` e `uri` simultaneamente;
- tornar `source` opcional;
- misturar `status` com `validation.status`.

## Provenance

Provenance responde quem ou o que criou o envelope e quando.

Ela deve ser minima, segura e auditavel.

Regras:

- provenance nao deve conter secrets, tokens, prompts ou payloads privados;
- provenance nao substitui eventos;
- provenance nao substitui source;
- quando autoria humana for relevante, deve usar identificador seguro;
- detalhes sensiveis devem ser redigidos ou referenciados por mecanismo
  autorizado por policy.

## Validacao

Validacao conecta artefatos a criterios verificaveis.

Fontes possiveis de criterios:

- `CapabilityContract`;
- `CapabilityPlan`;
- `TaskEnvelope.expected_artifacts`;
- constraints do `PolicyEngine`;
- regras futuras de artifact generation.

Regras:

- validacao deve ser explicita;
- validacao deve ser auditavel por evento;
- invalidacao posterior deve ser registrada por novo evento, nao por mutacao
  silenciosa;
- criterios subjetivos devem ser traduzidos em sinais observaveis;
- validacao nao deve exigir acesso a prompts internos ou memoria implicita.

## Relacao com TaskEnvelope

`TaskEnvelope` pode declarar artefatos esperados.

O `Artifact Envelope v0` registra artefatos produzidos, consumidos ou
validados durante a execucao dessa task.

Regras:

- `source.task_id` deve referenciar a task;
- artefatos esperados na task nao sao artefatos produzidos;
- o envelope nao altera escopo, restricoes ou side effects permitidos pela
  task.

## Relacao com CapabilityContract

`CapabilityContract` pode declarar artefatos obrigatorios ou opcionais.

O `Artifact Envelope v0` materializa a entrega ou evidencia associada a uma
capability.

Regras:

- `source.capability_id` deve corresponder a capability relevante;
- `validation.criteria` deve referenciar criterios da capability quando
  possivel;
- o envelope nao redefine entradas, saidas ou sucesso da capability;
- artefato nao substitui contrato de capability.

## Relacao com CapabilityPlan

`CapabilityPlan` declara quais capacidades serao executadas e quais artefatos
sao esperados por passo.

O `Artifact Envelope v0` comprova uma entrega ou evidencia produzida por esses
passos.

Regras:

- o envelope deve ser coerente com artefatos esperados no plano;
- o plano pode exigir artefato, mas nao deve embutir seu conteudo final;
- o envelope nao define ordem de execucao nem dependencias entre capabilities.

## Relacao com EventContract

Eventos preservam causalidade. Artefatos preservam conteudo duravel.

Regras:

- eventos devem referenciar artefatos por `artifact_id` e `artifact_version`;
- eventos nao devem embutir conteudo completo de artefatos;
- eventos de validacao devem registrar resultado de `validation`;
- eventos de decisao devem apontar para artefato `decision` quando a decisao
  for fonte de verdade.

## Relacao com ExecutionEngine

O `ExecutionEngine` exige, coleta e valida artefatos durante o ciclo de
execucao.

Regras:

- o engine nao deve tratar resposta textual como fonte de verdade quando a
  capability exige artefato;
- o engine deve validar campos obrigatorios do envelope;
- o engine deve consolidar referencias de artefatos no `ExecutionResult`;
- o engine nao deve duplicar `content.body` dentro do resultado;
- o engine deve registrar eventos para criacao, proposta, validacao ou rejeicao
  de artefatos.

## Relacao com ExecutionResult

`ExecutionResult` fecha a execucao.

O resultado referencia artefatos; ele nao substitui os envelopes.

Regras:

- `ExecutionResult.artifacts` deve conter referencias a artefatos;
- status global deve considerar artefatos obrigatorios e validacao;
- conteudo do artefato permanece no envelope ou no local apontado por
  `content.uri`;
- decisoes duraveis devem existir como artefatos quando forem fonte de
  verdade.

## Relacao com PolicyEngine

O `PolicyEngine` pode avaliar artefatos como input ou output.

Regras:

- policy pode restringir tipos de artefato;
- policy pode exigir redacao de conteudo;
- policy pode bloquear artefatos com dados sensiveis;
- policy pode exigir aprovacao antes de `status: final`;
- policy nao deve autorizar secrets dentro de envelope, eventos ou conteudo
  nao permitido.

## Relacao com Registry

O Registry nao armazena artefatos e nao consulta por artefatos.

Relacao permitida:

- candidatos podem declarar capacidades que produzem artefatos;
- metadados de candidatos podem ser avaliados contra artefatos esperados;
- selecao de executor nao deve depender de conteudo de artefato fora de input
  versionado e autorizado.

O Registry nao e fonte de verdade de artefatos. Ele e fonte de verdade de
descoberta e metadados de capacidade.

## Relacao com Memory

Memory pode fornecer contexto autorizado.

Artefatos sao fonte de verdade para entregas e decisoes duraveis.

Regras:

- memoria nao substitui artefato final;
- memoria pode referenciar artefatos;
- artefatos usados como memoria devem continuar enderecaveis por identidade e
  versao;
- memoria implicita nao pode validar artefato.

## Relacao com Observability

Observability registra eventos, logs seguros e diagnosticos.

Artefatos podem ser referenciados por observabilidade, mas nao devem ser
copiados integralmente para logs.

Regras:

- logs nao devem conter conteudo sensivel do artefato;
- traces devem apontar para `artifact_id`;
- diagnosticos devem preservar privacidade e policy;
- observabilidade nao substitui envelope.

## Invariantes

- Todo artefato deve ter `artifact_id` e `artifact_version`.
- Todo artefato deve ter exatamente um `artifact_type`.
- Todo artefato deve ter status explicito.
- Todo artefato deve referenciar `task_id`, `capability_id`, `executor_id` e
  `trace_id`.
- Todo artefato deve ter provenance minima.
- Todo artefato deve ter validation minima.
- Exatamente um entre `content.body` e `content.uri` deve existir.
- `artifact_type` nao e igual a `content.format`.
- `status` nao e igual a `validation.status`.
- Artefatos finais sao fonte de verdade, salvo quando substituidos ou
  rejeitados por evento e novo artefato.
- Artefatos nao podem depender de persona, modelo, prompt ou memoria implicita
  para serem compreendidos.
- Artefatos nao devem conter secrets, credenciais ou dados sensiveis sem
  policy explicita e redacao adequada.

## O que nao pertence ao ArtifactEnvelope

Nao pertence ao `Artifact Envelope v0`:

- implementacao de storage;
- banco de dados;
- sistema de arquivos definitivo;
- assinatura criptografica;
- content addressing;
- grafo completo de dependencias;
- diff semantico;
- permissao por campo;
- schema especifico por tipo de artefato;
- estrategia de retencao;
- mecanismo de arquivamento;
- executor selection;
- ranking de candidatos;
- policy decision completa;
- event log completo;
- estado operacional da execucao;
- memoria semantica;
- prompt interno;
- system prompt;
- chain-of-thought;
- modelo ou provedor de IA;
- persona de agente;
- secrets, tokens, senhas ou credenciais;
- codigo, SDK, CLI, servidor ou banco;
- pseudocodigo.

Se uma dessas informacoes for necessaria, ela deve viver no componente ou
contrato apropriado e ser apenas referenciada pelo artefato quando permitido.

## Pontos em aberto

- Definir lifecycle completo para `superseded` e `rejected`.
- Definir como representar relacao entre artefato substituto e substituido.
- Definir catalogo final de `artifact_type`.
- Definir formatos permitidos em `content.format`.
- Definir regras de redacao e classificacao de conteudo sensivel.
- Definir se validacao futura tera evidencias separadas por criterio.
- Definir como artefatos grandes serao enderecados sem escolher storage agora.
- Definir quando uma decisao exige artefato `decision` obrigatorio.

## Nao objetivos

- Implementar geracao de artefatos.
- Implementar validadores.
- Implementar storage.
- Implementar banco.
- Implementar servidor.
- Implementar CLI.
- Implementar SDK.
- Definir schemas executaveis.
- Criar agentes.
- Criar prompts.
- Escolher provedor de modelo.
