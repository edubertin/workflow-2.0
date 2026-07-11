# CapabilityContract

Versao: `0.1.0-draft`

Este documento define o contrato semantico de uma capability no Workflow V2.

Uma capability e a menor unidade de trabalho que o runtime consegue planejar,
validar, consultar no Registry, submeter a policies e encaminhar para execucao
sem conhecer agentes, personas, modelos ou prompts.

O `CapabilityContract` descreve o que uma capability significa. Ele nao
descreve quem executa, como executa ou onde executa.

## Responsabilidade

O `CapabilityContract` deve tornar explicita a semantica estavel de uma
capability.

Ele deve responder:

- qual trabalho a capability representa;
- quais entradas sao necessarias;
- quais saidas sao esperadas;
- quais criterios tornam a execucao bem-sucedida;
- quais falhas sao reconheciveis;
- quais side effects podem ocorrer;
- quais permissoes sao exigidas;
- quais artefatos podem ser produzidos ou consumidos;
- qual versao da semantica esta sendo usada.

Ele nao deve decidir executor, policy, plano, memoria, estado de execucao ou
conteudo final de artefatos.

## Proposito

O contrato existe para permitir que o kernel opere por capacidades, nao por
personas.

Com um contrato semantico versionado, o runtime pode:

- validar se uma tarefa pode ser mapeada para uma capability;
- consultar o Registry por candidatos compativeis;
- submeter side effects e permissoes ao Policy Engine;
- exigir eventos e artefatos auditaveis;
- consolidar resultados sem depender de detalhes de agente;
- reproduzir historicamente decisoes a partir de inputs versionados.

## Identificacao

Toda capability deve ter identidade estavel e versionada.

Campos semanticos obrigatorios:

- `capability_id`: identificador estavel no formato `domain.action` ou
  `domain.resource.action`.
- `capability_version`: versao da semantica da capability.
- `title`: nome humano curto, apenas para leitura.
- `description`: descricao objetiva do trabalho representado.
- `status`: estado do contrato, como `draft`, `active` ou `deprecated`.

Campos semanticos opcionais:

- `owner`: area responsavel pela definicao da semantica.
- `domain`: dominio funcional da capability.
- `deprecated_by`: referencia para capability ou versao substituta.

Regras:

- `capability_id` nao pode representar persona, cargo, tom de voz ou agente.
- `capability_version` muda quando a semantica observavel mudar.
- `title` e `description` nao podem alterar o significado dos campos formais.
- status `deprecated` nao invalida execucoes historicas.

## Entradas

Entradas descrevem o que a capability precisa receber para ser executavel.

O contrato deve declarar:

- entradas obrigatorias;
- entradas opcionais;
- tipos ou categorias esperadas;
- referencias aceitas, como task, artefato, memoria autorizada ou contexto;
- restricoes relevantes;
- dados que exigem policy antes do uso.

Regras:

- entradas obrigatorias devem ser verificaveis antes da execucao;
- entradas decisivas devem ser versionadas ou referenciadas por snapshot;
- dados sensiveis nao devem ser embutidos no contrato;
- secrets, credenciais e prompts internos nao sao entradas validas;
- memoria pode ser uma referencia autorizada, mas nao pode substituir entrada
  obrigatoria sem decisao explicita de policy;
- payloads grandes devem ser referenciados, nao descritos como conteudo bruto.

O contrato define a forma semantica das entradas. Ele nao carrega os valores de
uma execucao especifica.

## Saidas

Saidas descrevem o que a capability promete produzir ou tornar disponivel.

O contrato deve declarar:

- saidas obrigatorias;
- saidas opcionais;
- status possiveis;
- artefatos esperados, quando houver;
- criterios minimos de validacao;
- diagnosticos seguros que podem acompanhar falhas.

Regras:

- saidas devem ser avaliaveis contra criterios de sucesso;
- saidas duraveis devem ser preservadas por `Artifact Envelope v0`;
- o contrato pode exigir referencias a artefatos, mas nao define o conteudo de
  uma instancia especifica de artefato;
- resultado consolidado pertence ao `ExecutionResult`, nao ao
  `CapabilityContract`;
- mensagens de erro devem ser seguras e nao expor dados sensiveis.

## Criterios de sucesso e falha

Toda capability deve declarar criterios observaveis de sucesso.

Criterios de sucesso devem:

- ser verificaveis;
- depender de entradas e contratos versionados;
- indicar artefatos obrigatorios quando eles forem fonte de verdade;
- evitar avaliacao puramente subjetiva;
- permitir que o `ExecutionEngine` consolide status por capability.

Criterios de falha devem:

- identificar ausencia ou invalidade de entradas;
- identificar violacao de policy;
- identificar incompatibilidade com Registry ou executor;
- identificar ausencia de artefato obrigatorio;
- indicar quando a falha e recuperavel ou exige aprovacao.

O contrato nao precisa definir a estrategia de retry. Ele apenas deve tornar a
falha reconhecivel.

## Efeitos colaterais declarados

Side effects sao consequencias que podem alterar ou observar estado fora do
objeto de entrada imediato.

O contrato deve declarar side effects possiveis, como:

- `read`;
- `write`;
- `network`;
- `external_state`;
- `destructive`.

Regras:

- todo side effect possivel deve estar declarado antes da execucao;
- side effects nao declarados devem ser tratados como proibidos;
- side effects destrutivos ou externos exigem avaliacao explicita de policy;
- o contrato nao concede permissao por si so;
- o `PolicyEngine` pode restringir ou bloquear side effects declarados;
- um executor nao pode ampliar side effects alem do contrato e da policy.

## Versionamento

`capability_version` versiona a semantica da capability.

Mudancas compativeis incluem:

- adicionar entrada opcional;
- adicionar saida opcional;
- refinar descricao sem alterar comportamento verificavel;
- adicionar criterio de diagnostico nao obrigatorio;
- declarar metadado nao decisivo.

Mudancas incompativeis incluem:

- remover entrada obrigatoria;
- alterar significado de entrada ou saida;
- alterar criterio de sucesso obrigatorio;
- alterar status possiveis;
- ampliar side effects;
- reduzir garantias de validacao;
- alterar artefato obrigatorio.

Regras:

- execucoes devem referenciar `capability_id` e `capability_version`;
- eventos devem registrar a versao usada;
- Registry deve apontar para a mesma versao do contrato;
- versoes antigas devem continuar compreensiveis para auditoria historica;
- nenhuma decisao deve depender de `latest` sem snapshot ou versao explicita.

## Relacao com TaskEnvelope

`TaskEnvelope` representa a intencao, o escopo e as restricoes de uma tarefa.

O `CapabilityContract` representa a semantica de uma capability possivel.

Relacao:

- o `TaskEnvelope` fornece objetivo, escopo, constraints e side effects
  permitidos;
- a resolucao de plano pode mapear uma task para uma ou mais capabilities;
- uma capability so e valida para a task se suas entradas, side effects e
  criterios forem compativeis com o envelope;
- o contrato nao altera a intencao original da task;
- o contrato nao armazena valores especificos do `TaskEnvelope`.

## Relacao com CapabilityPlan

`CapabilityPlan` escolhe quais capabilities serao usadas para cumprir uma
task.

O `CapabilityContract` define o significado de cada capability escolhida.

Relacao:

- cada passo do plano deve referenciar `capability_id` e
  `capability_version`;
- o plano pode ordenar capabilities e declarar dependencias;
- o plano pode fornecer referencias de entrada para cada passo;
- o plano nao pode redefinir entradas, saidas, side effects ou criterios do
  contrato;
- se o plano exigir comportamento fora do contrato, ele deve usar outra
  capability ou outra versao.

## Relacao com Registry

O Registry e a fonte de verdade para disponibilidade e metadados de descoberta.

O `CapabilityContract` e a fonte de verdade semantica da capability.

Relacao:

- o Registry referencia contratos por `capability_id` e
  `capability_version`;
- o Registry lista candidatos compativeis com uma capability;
- o Registry nao redefine significado, entradas, saidas ou criterios;
- se um registro contradisser o contrato, o registro e invalido;
- consultas decisivas ao Registry devem usar snapshot versionado.

Em termos simples: o contrato diz o que a capability e; o Registry diz onde ela
esta disponivel e quais candidatos opacos declaram suporte a ela.

## Relacao com ExecutionEngine

O `ExecutionEngine` conduz o ciclo de vida da execucao.

Relacao:

- o engine usa o contrato para validar o plano;
- o engine consulta o Registry usando id e versao da capability;
- o engine submete side effects e permissoes ao Policy Engine;
- o engine seleciona executor sem conhecer persona;
- o engine registra eventos com a capability e sua versao;
- o engine consolida status no `ExecutionResult`.

O `ExecutionEngine` nao pode alterar criterios do contrato durante a execucao.
Se a execucao exigir semantica diferente, deve haver outra versao de capability
ou outra capability.

## Relacao com PolicyEngine

O `PolicyEngine` decide se algo e permitido, negado, condicionado ou exige
aprovacao.

Relacao:

- o contrato declara permissoes e side effects possiveis;
- a policy avalia esses dados contra task, contexto, plano e candidatos;
- a policy pode restringir execucao mesmo quando o contrato permite o side
  effect;
- a policy nao pode ampliar permissoes alem do contrato;
- decisoes de policy devem ser auditaveis por eventos.

O contrato informa o que pode ser necessario. A policy decide se isso pode
acontecer em uma execucao especifica.

## Relacao com artefatos

O `CapabilityContract` pode declarar artefatos esperados, obrigatorios ou
opcionais.

Regras:

- artefatos produzidos devem usar `Artifact Envelope v0`;
- o contrato pode declarar tipo, finalidade e criterio de validacao do
  artefato;
- o contrato nao contem o corpo do artefato;
- o contrato nao substitui `artifact_id`, `provenance`, `source` ou
  `validation`;
- conhecimento duravel produzido por uma capability deve ser registrado como
  artefato quando for fonte de verdade.

## Auditabilidade

Toda execucao de capability deve ser auditavel sem depender de memoria
implicita.

Eventos relacionados devem referenciar:

- `task_id`;
- `trace_id`;
- `capability_id`;
- `capability_version`;
- inputs versionados ou snapshots;
- Registry snapshot quando houver discovery;
- policy decision quando houver avaliacao;
- artefatos produzidos ou consumidos.

Uma decisao que nao consegue apontar para contrato versionado nao e
historicamente reproduzivel.

## Invariantes

- O kernel conhece capabilities, nao personas.
- Uma capability e definida por contrato semantico, nao por executor.
- Todo contrato deve ser versionado.
- Todo contrato deve declarar entradas e saidas minimas.
- Todo contrato deve declarar side effects possiveis.
- Todo contrato deve possuir criterios verificaveis de sucesso.
- Nenhum contrato pode depender de modelo, provedor, prompt ou tom de agente.
- Nenhum contrato pode conter secrets ou credenciais.
- Nenhum contrato pode carregar estado de execucao.
- Nenhum contrato pode substituir Registry, PolicyEngine, CapabilityPlan,
  TaskEnvelope, EventContract, Artifact Envelope ou ExecutionResult.

## O que nao pertence ao CapabilityContract

Nao pertence ao `CapabilityContract`:

- identidade final do executor;
- nome, persona, tom, avatar ou papel narrativo de agente;
- modelo de IA, provedor, temperatura ou configuracao de prompt;
- prompts internos, system prompts ou chain-of-thought;
- selecao de executor;
- ranking de candidatos;
- disponibilidade operacional;
- snapshot do Registry;
- decisao de policy;
- aprovacao humana especifica;
- plano de execucao;
- ordem entre multiplas capabilities;
- valores concretos de uma task especifica;
- estado de execucao;
- eventos emitidos como log historico;
- conteudo final de artefatos;
- memoria ou contexto implicito;
- secrets, tokens, senhas ou credenciais;
- estrategia de retry, scheduling ou concorrencia;
- implementacao, codigo, SDK, CLI, servidor ou banco;
- pseudocodigo.

Se alguma dessas informacoes for necessaria, ela deve viver no componente ou
contrato apropriado, nao dentro do `CapabilityContract`.

## Pontos em aberto

- Definir taxonomia final de permissoes.
- Definir taxonomia final de side effects.
- Definir formato final de criterios de sucesso.
- Definir convencao final de versionamento semantico.
- Definir quando uma mudanca exige nova capability ou apenas nova versao.
- Definir quais tipos de artefato iniciais cada familia de capability pode
  produzir.

## Nao objetivos

- Implementar capabilities.
- Implementar agentes.
- Implementar runtime.
- Implementar Registry.
- Implementar Policy Engine.
- Criar SDK, CLI, servidor ou banco.
- Definir prompts ou modelos.
- Definir armazenamento de memoria ou artefatos.
