# Arquitetura do Workflow 2.0

Workflow 2.0 e um runtime de orquestracao de agentes orientado a capacidades.

O kernel coordena trabalho entre agentes, ferramentas, memoria, estado e politicas, mas nao assume que um agente e uma persona, nem que um modelo especifico esta presente. Modelos, ferramentas e sistemas externos entram por adaptadores.

## Objetivos arquiteturais

- Separar orquestracao de inferencia.
- Tratar agentes como executores de capacidades declaradas.
- Permitir multiplos modelos, provedores e estrategias de execucao.
- Manter contratos estaveis entre kernel, agentes e adaptadores.
- Tornar decisoes, eventos, permissoes e resultados auditaveis.

## Modelo mental

```text
Usuario ou sistema externo
        |
        v
Kernel de orquestracao
        |
        +-- Registro de capacidades
        +-- Planejamento e roteamento
        +-- Politicas e permissoes
        +-- Estado, memoria e eventos
        +-- Observabilidade
        |
        v
Agentes orientados a capacidades
        |
        v
Adaptadores de modelo, ferramenta e ambiente
```

## Componentes

### Kernel

O kernel e o nucleo de coordenacao. Ele recebe intencoes, resolve capacidades necessarias, aplica politicas, agenda execucoes, registra eventos e consolida resultados.

O kernel nao deve conter logica especifica de modelo, prompt proprietario ou comportamento de persona.

### Capacidades

Uma capacidade descreve algo que o sistema consegue fazer, com entradas, saidas, pre-condicoes, efeitos, riscos e limites.

Exemplos conceituais:

- `read.local_file`
- `write.documentation`
- `analyze.repository`
- `run.validation`
- `create.pull_request`

Agentes declaram capacidades. O kernel seleciona executores com base nessas capacidades, nao em nomes de personas.

### Agentes

Um agente e uma unidade operacional que implementa uma ou mais capacidades.

O agente deve:

- declarar seu manifesto;
- aceitar uma tarefa em formato contratual;
- devolver resultado estruturado;
- expor eventos relevantes;
- respeitar politicas do kernel;
- nao depender diretamente de um modelo especifico.

### Adaptadores

Adaptadores conectam o runtime a modelos, ferramentas, arquivos, APIs, navegadores, filas, bancos ou ambientes externos.

Adaptadores pertencem as bordas do sistema. Eles podem ser substituidos sem alterar o contrato universal de agente.

### Registro

O registro mantem o catalogo de capacidades, agentes disponiveis, versoes de contrato e metadados de compatibilidade.

Ele responde perguntas como:

- quais capacidades existem;
- quem pode executar cada capacidade;
- quais permissoes sao exigidas;
- qual contrato cada executor suporta.

### Orquestracao

A orquestracao transforma uma intencao em uma ou mais execucoes coordenadas.

Responsabilidades iniciais:

- decompor trabalho;
- selecionar capacidades;
- escolher executores;
- acompanhar dependencias;
- consolidar resultados;
- interromper quando politicas ou riscos exigirem.

### Politicas

Politicas definem limites de execucao, permissoes, confirmacoes, acesso a recursos, risco operacional e regras de seguranca.

O kernel deve aplicar politicas antes de executar acoes com efeito externo ou reversibilidade limitada.

### Estado e memoria

Estado representa execucoes atuais, historico operacional e artefatos de trabalho.

Memoria representa contexto reutilizavel, preferencias, conhecimento duravel e relacoes entre trabalhos. A memoria deve ser acessada por contrato e nunca como dependencia implicita.

### Eventos

Eventos tornam o runtime observavel e auditavel.

Toda execucao relevante deve poder emitir eventos como:

- tarefa recebida;
- capacidade resolvida;
- executor selecionado;
- permissao exigida;
- acao iniciada;
- acao concluida;
- falha;
- resultado produzido.

### Observabilidade

Observabilidade cobre logs, traces, metricas, auditoria e diagnostico.

O objetivo nao e apenas depurar falhas, mas explicar por que o runtime tomou determinada decisao.

## Ciclo de execucao

1. Uma intencao entra no kernel.
2. O kernel normaliza a intencao em uma tarefa.
3. O registro resolve capacidades candidatas.
4. Politicas validam risco, permissao e contexto.
5. O orquestrador seleciona executores.
6. O scheduler agenda execucoes.
7. Agentes executam capacidades via adaptadores.
8. Eventos, estado e observabilidade sao atualizados.
9. O kernel consolida e devolve resultado estruturado.

## Fronteiras importantes

- O kernel nao implementa agentes.
- Agentes nao escolhem politicas globais.
- Modelos nao sao dependencias centrais do contrato.
- Prompts nao sao a arquitetura.
- Personas nao sao unidades de roteamento.
- Adaptadores nao devem contaminar o dominio do kernel.

## Versao inicial do contrato

A primeira versao conceitual do contrato esta em `contracts/UNIVERSAL_AGENT_CONTRACT.md`.
