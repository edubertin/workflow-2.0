# EventContract

Versao: `0.1.0-draft`

Este documento especifica, em alto nivel, o `EventContract` do Workflow V2.

O `EventContract` define o que e um evento, quais metadados minimos ele deve
preservar e como eventos sustentam auditoria, causalidade e reprodutibilidade
historica do runtime.

Nao ha implementacao, pseudocodigo, SDK, CLI, servidor ou banco nesta
especificacao.

## Definicao

Um evento e um registro imutavel de algo relevante que aconteceu, foi decidido
ou foi observado durante uma execucao.

Eventos representam fatos do runtime, como:

- task aceita;
- plano resolvido;
- policy avaliada;
- consulta ao Registry concluida;
- executor selecionado;
- capability iniciada;
- artifact proposto ou validado;
- resultado consolidado;
- falha registrada;
- execucao concluida.

Um evento nao e o estado completo do sistema. Ele e uma evidencia ordenada que
ajuda a reconstruir o caminho de uma execucao.

## Por que eventos existem

Eventos existem para formar a trilha minima de auditoria do Workflow V2.

Eles permitem responder:

- o que aconteceu;
- quando aconteceu;
- em qual task aconteceu;
- em qual trace aconteceu;
- qual capability estava envolvida;
- qual decisao foi tomada;
- quais inputs versionados foram considerados;
- quais alternativas foram consideradas ou descartadas;
- qual policy permitiu, negou, condicionou ou exigiu aprovacao;
- quais artefatos foram produzidos, usados ou validados;
- por que o `ExecutionResult` chegou ao status final.

Sem eventos, o runtime dependeria de memoria implicita, logs soltos ou
explicacoes narrativas. Isso quebraria a filosofia de determinismo auditavel.

## Responsabilidade

O `EventContract` deve:

- preservar ordem e causalidade;
- identificar o evento de forma unica;
- conectar evento a task e trace;
- registrar produtor e assunto do evento;
- referenciar inputs versionados;
- registrar decisoes de forma segura;
- apontar para artefatos sem copiar conteudo;
- permitir auditoria posterior;
- evitar dados sensiveis, prompts e payloads crus.

O `EventContract` nao deve:

- substituir `TaskEnvelope`;
- substituir `CapabilityContract`;
- substituir `CapabilityPlan`;
- substituir `ExecutionEngine`;
- substituir `ExecutionResult`;
- substituir `Artifact Envelope v0`;
- substituir `Registry`;
- substituir `PolicyEngine`;
- carregar estado operacional completo;
- carregar conteudo completo de artefatos.

## Metadados obrigatorios

Todo evento deve conter metadados minimos suficientes para ser compreendido
historicamente.

### event_version

Versao do contrato do evento.

Semantica:

- versiona o formato do evento, nao o runtime inteiro;
- permite evoluir o envelope de eventos sem quebrar historico;
- deve estar presente em toda emissao e referencia auditavel.

### event_id

Identificador unico e imutavel do evento.

Semantica:

- identifica exatamente um evento;
- nao deve ser reutilizado;
- deve ser usado por eventos posteriores que corrijam, complementem ou
  revertam o fato registrado.

### event_type

Tipo semantico do evento.

Semantica:

- descreve que tipo de fato foi registrado;
- deve ser amplo o suficiente para auditoria e especifico o suficiente para
  filtragem;
- deve seguir convencao estavel de namespace;
- nao deve conter nome de persona, modelo, prompt ou executor narrativo.

### occurred_at

Momento em que o fato aconteceu.

Semantica:

- representa o tempo do acontecimento;
- deve usar formato temporal estavel;
- nao deve ser usado sozinho para ordenar eventos dentro de uma execucao.

### recorded_at

Momento em que o evento foi registrado.

Semantica:

- representa o tempo de persistencia ou emissao;
- nao pode ser anterior a `occurred_at`;
- diferenca relevante entre `occurred_at` e `recorded_at` deve ser explicavel
  por evento ou diagnostico seguro.

### trace_id

Identificador da execucao rastreavel.

Semantica:

- conecta eventos, task, plano, artefatos e resultado;
- permite reconstruir uma execucao completa;
- deve ser o mesmo usado por `TaskEnvelope`, `CapabilityPlan`,
  `ArtifactEnvelope` e `ExecutionResult`.

### task_id

Identificador da task normalizada.

Semantica:

- conecta o evento ao `TaskEnvelope`;
- garante que todo evento pertenca a uma unidade de trabalho;
- nao substitui o envelope da task.

### sequence

Ordem causal dentro de um `trace_id`.

Semantica:

- preserva ordenacao logica;
- deve incluir numero sequencial;
- deve apontar para evento anterior quando houver encadeamento causal direto;
- evita depender apenas de timestamps para reconstruir o fluxo.

### producer

Componente que produziu o evento.

Semantica:

- identifica se o evento veio de runtime, policies, registry, capability,
  artifact generation ou observability;
- deve incluir versao ou identificador auditavel do produtor;
- nao deve expor implementacao interna, prompt ou modelo.

### subject

Objeto ou decisao sobre o qual o evento fala.

Semantica:

- informa se o evento trata de task, plan, capability, policy, registry,
  executor selection, artifact ou result;
- deve incluir identificador do assunto quando existir;
- nao deve carregar o objeto completo quando uma referencia versionada for
  suficiente.

### input_refs

Referencias aos inputs que influenciaram o evento ou decisao.

Semantica:

- cada input decisivo deve ter identificador e versao ou snapshot;
- pode referenciar task, plan, capability contract, policy, registry snapshot,
  artifact, memory autorizada ou executor metadata;
- nao deve conter payload bruto;
- ausencia de input versionado torna a decisao nao reproduzivel.

### summary

Resumo curto, seguro e humano.

Semantica:

- explica o fato sem vazar dados sensiveis;
- nao substitui artefato, policy, task ou resultado;
- nao deve conter prompt, chain-of-thought, stack trace longo ou payload cru.

## Metadados condicionais

Alguns metadados sao obrigatorios apenas quando o evento registra determinado
tipo de fato.

### decision

Obrigatorio quando o evento registra uma decisao.

Deve indicar:

- tipo de decisao;
- outcome;
- motivo seguro;
- criterio aplicado quando houver;
- alternativas consideradas quando houver selecao;
- alternativas descartadas quando houver selecao.

`decision` em evento nao substitui uma decisao completa de policy nem um
artefato de decisao duravel. Ele registra o recorte auditavel necessario para
entender o fato.

### state_transition

Obrigatorio quando o evento registra transicao de estado.

Deve indicar:

- estado anterior;
- estado seguinte;
- motivo seguro da transicao.

Evento de transicao nao substitui maquina de estados nem armazenamento de
estado operacional.

### artifact_refs

Obrigatorio quando o evento envolve artefato.

Deve referenciar:

- `artifact_id`;
- `artifact_version`;
- relacao do artefato com o evento.

Eventos nao devem copiar `content.body` nem resolver `content.uri`.

### policy_ref

Obrigatorio quando o evento registra avaliacao ou resultado de policy.

Deve referenciar:

- policy id;
- policy version;
- outcome seguro;
- constraints quando existirem.

Evento de policy nao deve carregar a decisao completa de policy quando ela
exigir objeto proprio ou artefato duravel.

### registry_ref

Obrigatorio quando o evento registra consulta ou decisao baseada no Registry.

Deve referenciar:

- snapshot do Registry;
- registros ou candidatos considerados;
- registros ou candidatos descartados;
- criterio deterministico de ordenacao ou descarte quando aplicavel.

Evento nao substitui o snapshot do Registry.

## Identidade

`event_id` identifica um evento imutavel.

Regras:

- todo evento tem exatamente um `event_id`;
- `event_id` nao muda depois de registrado;
- correcao de evento deve ser outro evento;
- reversao de decisao deve ser outro evento;
- evento original nunca deve ser apagado ou reescrito;
- eventos podem referenciar eventos anteriores por causalidade.

Identidade de evento nao depende de arquivo, caminho, storage, banco ou log
externo.

## Versionamento

`event_version` versiona o formato do evento.

Regras:

- mudanca em campo obrigatorio exige nova versao;
- mudanca de semantica de campo exige nova versao;
- eventos antigos devem continuar legiveis;
- eventos devem referenciar versoes dos inputs decisivos;
- nenhum evento deve depender de `latest` para ser compreendido depois.

Mudancas compativeis:

- adicionar campo opcional;
- adicionar novo tipo de evento;
- adicionar nova relacao de artefato;
- refinar descricao sem mudar significado.

Mudancas incompativeis:

- remover campo obrigatorio;
- alterar significado de `event_type`;
- alterar semantica de `sequence`;
- tornar `input_refs` opcionais para eventos de decisao;
- permitir conteudo bruto sensivel dentro do evento.

## Causalidade

Causalidade explica por que um evento veio depois de outro.

Eventos devem preservar causalidade por:

- `trace_id`;
- `sequence`;
- referencia ao evento anterior quando houver;
- referencias a inputs versionados;
- referencias a artefatos, policies e snapshots usados;
- registro de alternativas consideradas e descartadas quando houver selecao.

Ordenacao temporal nao basta. Dois eventos podem ter timestamps proximos ou
iguais. A ordem auditavel deve vir da sequencia e das referencias causais.

## Rastreabilidade

Rastreabilidade conecta evento, task, capability, executor, policy, registry,
artefato e resultado.

Um evento deve permitir seguir a trilha:

- da task para o plano;
- do plano para capabilities;
- das capabilities para candidatos do Registry;
- dos candidatos para selecao de executor;
- da selecao para policy gates;
- da execucao para artefatos;
- dos artefatos para validacao;
- da validacao para `ExecutionResult`.

Essa rastreabilidade deve usar ids, versoes e snapshots, nao nomes narrativos
ou memoria implicita.

## Relacao com TaskEnvelope

`TaskEnvelope` normaliza a intencao em uma unidade de trabalho.

Eventos devem:

- referenciar `task_id`;
- preservar `trace_id`;
- registrar quando a task foi aceita, bloqueada, cancelada ou concluida;
- nao alterar objetivo, escopo ou constraints da task;
- nao embutir payload cru do pedido original.

Evento nao substitui `TaskEnvelope`.

## Relacao com CapabilityContract

`CapabilityContract` define a semantica de uma capability.

Eventos devem:

- referenciar `capability_id` e `capability_version` quando a capability
  estiver envolvida;
- registrar inicio, conclusao, falha ou validacao relevante;
- apontar para criterios usados quando houver avaliacao;
- nao redefinir entrada, saida, sucesso ou side effects da capability.

Evento nao substitui contrato semantico de capability.

## Relacao com ExecutionEngine

O `ExecutionEngine` conduz o ciclo de vida da execucao.

Eventos sao a evidencia minima das decisoes e transicoes do engine.

Eventos devem registrar:

- aceite da task;
- resolucao do plano;
- policy checks;
- consultas ao Registry;
- selecao de executor;
- preparo de contexto;
- execucao da capability;
- validacao de artefatos;
- consolidacao de resultado;
- encerramento ou falha.

O engine nao deve tomar decisao relevante sem evento correspondente ou sem
artefato quando a decisao for duravel.

## Relacao com ExecutionResult

`ExecutionResult` consolida o status final da execucao.

Eventos explicam como esse resultado foi alcancado.

Regras:

- resultado deve referenciar eventos relevantes;
- status global deve ser coerente com eventos de capacidade, falha, policy e
  artefato;
- eventos nao substituem o resumo consolidado do resultado;
- resultado nao deve duplicar todo o log de eventos.

## Relacao com ArtifactEnvelope

`ArtifactEnvelope` preserva conteudo duravel. Eventos preservam causalidade.

Eventos devem:

- registrar quando artefato foi proposto, produzido, validado, rejeitado ou
  usado como input;
- referenciar artefatos por `artifact_id` e `artifact_version`;
- registrar relacao do artefato com o fato observado;
- nao copiar conteudo completo do artefato;
- nao substituir `source`, `provenance` ou `validation` do envelope.

## Relacao com Registry

Registry fornece disponibilidade e metadados de descoberta por snapshot.

Eventos devem:

- registrar consultas decisivas ao Registry;
- referenciar snapshot usado;
- registrar candidatos considerados;
- registrar candidatos descartados;
- registrar criterio deterministico de descarte ou ordenacao;
- nunca registrar persona como criterio de selecao.

Evento nao substitui Registry nem snapshot.

## Relacao com PolicyEngine

PolicyEngine decide `allow`, `deny`, `allow_with_constraints` ou
`requires_approval`.

Eventos devem:

- referenciar policy id e policy version;
- registrar subject avaliado;
- registrar outcome;
- registrar motivo seguro;
- registrar constraints quando existirem;
- apontar para artefato de decisao quando a justificativa for duravel.

Evento nao substitui decisao completa de policy nem autoriza reinterpretar
policy depois.

## Relacao com Observability

Observability consome eventos para explicar execucoes.

Eventos devem ser seguros para observabilidade:

- sem secrets;
- sem payloads crus;
- sem prompts internos;
- sem conteudo integral de artefatos sensiveis;
- com mensagens curtas e redigidas.

Logs e metricas podem derivar de eventos, mas nao substituem o contrato de
evento.

## Invariantes

- Todo evento deve ter `event_id`.
- Todo evento deve ter `event_version`.
- Todo evento deve pertencer a exatamente um `trace_id`.
- Todo evento deve pertencer a exatamente um `task_id`.
- Todo evento deve ter tipo semantico.
- Todo evento deve ter timestamps de ocorrencia e registro.
- Todo evento deve ter produtor identificavel.
- Todo evento deve ter assunto identificavel.
- Todo evento de decisao deve referenciar inputs versionados.
- Todo evento de selecao deve registrar alternativas consideradas e
  descartadas quando existirem.
- Todo evento que envolve artefato deve usar referencia, nao conteudo bruto.
- Todo evento de Registry deve referenciar snapshot.
- Todo evento de policy deve referenciar policy versionada.
- Eventos sao append-only.
- Correcao ou reversao deve ser novo evento.
- Eventos nao podem depender de `latest`, memoria implicita ou estado mutavel
  nao versionado.
- Eventos nao podem depender de persona, modelo ou prompt para serem
  compreendidos.

## O que nao pertence ao EventContract

Nao pertence ao `EventContract`:

- conteudo completo de artefatos;
- `content.body` de artefatos;
- estado operacional completo;
- maquina de estados;
- decisoes completas de policy;
- regras internas de policy;
- memoria implicita;
- contexto nao autorizado;
- payload cru de usuario;
- prompts internos;
- system prompts;
- chain-of-thought;
- personas;
- nome narrativo de agente;
- modelo de IA;
- provedor de modelo;
- temperatura ou configuracao de modelo;
- ranking nao versionado de candidatos;
- storage;
- banco de dados;
- logs brutos de adaptadores;
- stack traces longos;
- secrets, tokens, senhas ou credenciais;
- codigo;
- SDK;
- CLI;
- servidor;
- pseudocodigo.

Se alguma dessas informacoes for necessaria para auditoria, o evento deve
referenciar um objeto apropriado, versionado e autorizado, sem embutir seu
conteudo sensivel.

## Pontos em aberto

- Definir catalogo final de `event_type`.
- Definir convencao final de namespaces de eventos.
- Definir formato final de `sequence`.
- Definir como representar eventos de correcao.
- Definir como representar eventos de reversao.
- Definir formato final de `producer.version`.
- Definir formato seguro para hashes ou classificacoes quando necessario.
- Definir regras de retencao sem escolher storage agora.
- Definir relacao entre eventos e futura maquina de estados.
- Definir quais decisoes exigem artefato `decision` alem do evento.
- Definir como eventos derivados de observabilidade serao classificados.

## Nao objetivos

- Implementar emissao de eventos.
- Implementar event store.
- Implementar banco.
- Implementar servidor.
- Implementar CLI.
- Implementar SDK.
- Implementar validadores.
- Implementar maquina de estados.
- Implementar Registry.
- Implementar Policy Engine.
- Implementar runtime.
- Criar agentes.
- Criar prompts.
- Escolher modelo ou provedor.
