# Arquitetura do Workflow V2

Workflow V2 e um runtime de orquestracao orientado a capacidades. Sua funcao e transformar uma intencao em execucoes verificaveis, governadas por politicas e materializadas em artefatos.

O kernel nao conhece personas. Ele nao deve saber se existe um "agente pesquisador", "agente dev" ou "agente gerente". Ele conhece somente capacidades, contratos, politicas, estado e resultados. Agentes sao executores registrados que podem cumprir capacidades.

## Revisao critica da arquitetura inicial

A primeira versao acertou tres fundamentos:

- separou agentes de modelos;
- colocou capacidades no centro;
- definiu a necessidade de contratos.

Mas ainda havia tres riscos:

- `Agente` aparecia cedo demais no modelo mental, antes de `Capability`.
- `Estado`, `Memoria`, `Eventos` e `Artefatos` estavam agrupados, apesar de terem papeis diferentes.
- O ciclo de execucao era curto demais para explicar gates, criterios de sucesso, geracao de artefatos e observabilidade.

A simplificacao adotada agora e esta: o kernel executa capacidades, nao agentes. Agentes podem aparecer como candidatos opacos registrados no Registry, mas a selecao final pertence ao Execution Engine e deve seguir contrato deterministico.

## Modelo conceitual

```text
Intent
  |
  v
Runtime
  |
  +-- Policies
  +-- Registry
  +-- Capabilities
  +-- Memory
  +-- Observability
  +-- Artifact Generation
  |
  v
Capability Execution
  |
  v
Artifacts + Events + Result
```

## Responsabilidades separadas

### Runtime

Runtime e o ciclo operacional de execucao.

Responsabilidades:

- receber uma intencao;
- normalizar a intencao em uma tarefa;
- resolver capacidades necessarias;
- coordenar execucao;
- aplicar checkpoints;
- consolidar resultados;
- fechar a execucao com artefatos e eventos.

O runtime nao decide sozinho se algo e permitido. Ele consulta policies.

O runtime nao escolhe executor por nome de agente. Ele pede ao registry candidatos para uma capacidade.

### Policies

Policies definem o que pode acontecer, em quais condicoes e com quais confirmacoes.

Responsabilidades:

- classificar risco;
- validar permissoes;
- bloquear acoes nao autorizadas;
- exigir confirmacao humana quando necessario;
- definir limites de efeitos colaterais;
- impedir leitura ou exposicao de dados sensiveis;
- registrar decisoes de allow, deny ou require approval.

Policies devem ser avaliadas antes da execucao e tambem durante checkpoints relevantes.

### Registry

Registry e o catalogo de capacidades, executores e compatibilidade.

Responsabilidades:

- registrar capacidades disponiveis;
- registrar executores capazes de cumprir capacidades;
- mapear versoes de contrato;
- expor requisitos de permissao;
- informar limites, confiabilidade e compatibilidade;
- devolver candidatos ao runtime.

O registry pode conhecer agentes como executores. O kernel nao deve codificar personas nem depender delas.

### Capabilities

Capabilities sao unidades roteaveis de trabalho.

Uma capacidade define:

- objetivo operacional;
- entradas;
- saidas;
- criterios de sucesso;
- criterios de falha;
- permissoes;
- efeitos colaterais;
- artefatos esperados;
- eventos obrigatorios.

Capacidades devem ser estaveis o suficiente para permitir troca de executor sem alterar o contrato do trabalho.

### Memory

Memory fornece contexto reutilizavel.

Responsabilidades:

- recuperar contexto relevante;
- armazenar preferencias e conhecimento duravel;
- disponibilizar historico quando permitido;
- respeitar escopo, expiracao e politicas de privacidade.

Memory nao e fonte de verdade para entregas. Quando uma decisao precisa sobreviver, ela vira artefato.

### Observability

Observability explica o que o runtime fez e por que fez.

Responsabilidades:

- registrar eventos;
- correlacionar trace, task, capability e executor;
- expor logs seguros;
- medir duracao, retries, bloqueios e falhas;
- permitir auditoria;
- redigir dados sensiveis.

Observabilidade nao e apenas debug. Ela e parte do contrato de confianca do runtime.

### Artifact Generation

Artifact Generation transforma execucoes em entregas verificaveis.

Responsabilidades:

- produzir documentos, planos, patches, relatorios, manifests, registros de decisao e traces;
- validar que artefatos esperados foram gerados;
- associar artefatos a task, capability, executor e trace;
- preservar artefatos como fonte de verdade;
- diferenciar rascunho, resultado parcial e entrega final.

Formato inicial: todo artefato deve usar `Artifact Envelope v0`, definido em `kernel/artifact-generation/README.md`.

O envelope e deliberadamente pequeno: identidade, tipo, status, origem, conteudo, proveniencia e validacao. Essa escolha evita criar um sistema de storage antes da hora e ainda preserva o que o runtime precisa para auditar e retomar trabalho.

Artefatos sao o que permite revisar, retomar e auditar trabalho sem depender da memoria implicita de um agente.

## Fluxo resumido

1. Runtime recebe uma intencao.
2. Runtime normaliza a intencao em task.
3. Policies classificam risco e limites iniciais.
4. Runtime resolve capacidades necessarias.
5. Registry encontra executores candidatos para cada capacidade.
6. Policies validam permissao, efeitos colaterais e necessidade de aprovacao.
7. Runtime agenda a execucao.
8. Executor cumpre a capacidade usando adaptadores permitidos.
9. Observability registra eventos e decisoes.
10. Artifact Generation produz ou valida artefatos.
11. Runtime avalia criterios de sucesso.
12. Runtime fecha com resultado estruturado.

O ciclo completo esta em `RuntimeFlow.md`.

## Fronteiras do kernel

O kernel pode:

- coordenar capacidades;
- consultar registry;
- aplicar policies;
- solicitar memoria por contrato;
- emitir eventos;
- registrar estado;
- exigir artefatos;
- consolidar resultado.

O kernel nao pode:

- conhecer personas;
- depender de um modelo especifico;
- embutir prompts como arquitetura;
- escolher executor por nome narrativo;
- permitir que memoria substitua artefato;
- deixar adaptadores contaminarem contratos centrais;
- executar acao de risco sem policy gate.

## Decisoes arquiteturais

### ADR-001: Capability-first

Decisao: o runtime roteia por capacidade.

Justificativa: capacidade e uma unidade testavel, versionavel e substituivel. Persona e uma descricao narrativa instavel.

Consequencia: todo executor precisa declarar capacidades suportadas.

### ADR-002: Agent as executor

Decisao: agente e executor, nao primitiva central do kernel.

Justificativa: isso permite que a mesma capacidade seja cumprida por modelo, codigo, humano, servico externo ou composicao.

Consequencia: o registry pode armazenar agentes, mas o runtime consome candidatos por capacidade.

### ADR-003: Artifacts as source of truth

Decisao: artefatos sao a fonte de verdade de entregas e decisoes.

Justificativa: conversas e memoria sao frageis para auditoria. Artefatos podem ser revisados, versionados e retomados.

Consequencia: capacidades importantes devem declarar artefatos esperados.

### ADR-004: Policies before execution

Decisao: toda execucao passa por policy gates.

Justificativa: capacidades podem ter efeitos externos, dados sensiveis ou acoes irreversiveis.

Consequencia: o runtime precisa suportar estados `blocked` e `requires_approval`.

### ADR-005: Keep the first runtime small

Decisao: a primeira implementacao futura deve suportar uma task, uma capacidade e um executor antes de multiagente.

Justificativa: multiagente aumenta complexidade antes de provar o contrato basico.

Consequencia: orquestracao composta deve ser projetada, mas nao implementada antes do ciclo simples funcionar.

### ADR-006: Artifact Envelope v0

Decisao: o formato inicial de artefatos sera um envelope simples e versionado.

Justificativa: o runtime precisa rastrear origem, status e validacao de cada entrega, mas ainda nao precisa decidir storage, assinatura, grafo de dependencias ou schema especifico por tipo.

Consequencia: todo artefato deve carregar `artifact_version`, `artifact_id`, `artifact_type`, `status`, `source`, `content`, `provenance` e `validation`.

## Pendencias arquiteturais

- Definir formato final dos schemas.
- Escolher mecanismo de persistencia de estado.
- Definir lifecycle de artefatos.
- Definir estrategia de versionamento de capacidades.
- Definir como approvals humanos entram no runtime.
- Definir como memoria sera escopada por usuario, projeto e tarefa.
- Definir taxonomia inicial de permissoes.
