# RuntimeFlow

Este documento descreve o ciclo completo de execucao do Workflow V2.

O runtime executa capacidades. Ele nao executa personas.

## Estados principais

```text
received
normalized
policy_checked
capabilities_resolved
executor_selected
running
artifact_pending
success_evaluated
completed
```

Estados alternativos:

```text
blocked
requires_approval
failed
partial
cancelled
```

## Ciclo completo

### 1. Intent received

Entrada inicial de usuario, sistema externo ou agenda.

O runtime registra:

- `intent_id`;
- `trace_id`;
- origem;
- timestamp;
- contexto disponivel;
- limites declarados.

Saida: intent registrada, sem execucao ainda.

### 2. Normalize task

O runtime transforma a intencao em uma task estruturada.

A task deve conter:

- objetivo;
- escopo;
- restricoes;
- contexto;
- artefatos esperados, se ja forem conhecidos;
- side effects permitidos;
- deadline ou prioridade, quando aplicavel.

Saida: `TaskEnvelope`.

### 3. Initial policy check

Policies avaliam a task antes de qualquer decomposicao arriscada.

Perguntas:

- ha dados sensiveis?
- ha escrita, publicacao ou efeito externo?
- ha acao destrutiva?
- ha necessidade de aprovacao humana?
- o escopo esta claro o suficiente?

Saidas possiveis:

- `allow`;
- `deny`;
- `requires_approval`;
- `needs_clarification`.

### 4. Resolve capabilities

O runtime identifica quais capacidades sao necessarias para cumprir a task.

Exemplo conceitual:

```text
Task: revisar arquitetura e atualizar documentos

Capabilities:
- repository.inspect
- architecture.review
- documentation.write
- artifact.summarize
```

Nesta fase, o runtime ainda nao escolhe agentes.

Saida: `CapabilityPlan`.

### 5. Validate capability contracts

Cada capacidade planejada precisa ter contrato conhecido.

Validacoes:

- entrada exigida esta disponivel;
- saida esperada esta definida;
- criterios de sucesso existem;
- riscos e side effects estao declarados;
- artefatos esperados sao conhecidos;
- eventos obrigatorios estao definidos.

Se faltar contrato, a execucao deve bloquear ou gerar tarefa de definicao arquitetural antes de prosseguir.

### 6. Registry lookup

O runtime consulta o registry por executores candidatos para cada capacidade.

O registry responde com candidatos, nao com decisoes finais.

Metadados esperados:

- executor id;
- tipo de executor;
- capacidades suportadas;
- versao do contrato;
- requisitos de adaptador;
- limites;
- confiabilidade conhecida;
- permissoes necessarias.

### 7. Executor selection

O runtime escolhe executor com base em criterios objetivos.

Criterios possiveis:

- compatibilidade de contrato;
- permissao;
- disponibilidade;
- menor risco;
- menor complexidade;
- custo;
- historico de sucesso;
- requisito de ferramenta ou ambiente.

Regra: nome de persona nao pode ser criterio de selecao do kernel.

### 8. Execution policy gate

Antes de rodar, policies validam a combinacao:

```text
task + capability + executor + context + side effects
```

Saidas:

- `allow`;
- `deny`;
- `requires_approval`;
- `allow_with_constraints`.

Constraints podem limitar arquivos, sistemas externos, rede, escrita, tempo, custo ou tipo de artefato.

### 9. Prepare execution context

Runtime prepara o contexto minimo para o executor.

Inclui:

- input validado;
- contexto autorizado;
- policy envelope;
- trace id;
- artifact requirements;
- observability hooks;
- timeout;
- cancellation token conceitual.

Nao inclui:

- memoria irrestrita;
- secrets nao solicitados;
- prompt global como contrato;
- informacao fora do escopo.

### 10. Run capability

Executor cumpre a capacidade.

Durante a execucao, deve emitir eventos:

- `capability.execution.started`;
- `capability.progress.updated`, quando util;
- `capability.artifact.proposed`, quando aplicavel;
- `capability.execution.completed` ou `capability.execution.failed`.

O executor pode usar adaptadores permitidos, mas nao pode ampliar permissao.

### 11. Generate or validate artifacts

Artifact Generation verifica se a capacidade produziu os artefatos esperados no formato `Artifact Envelope v0`.

Exemplos:

- documento arquitetural;
- contrato;
- patch;
- relatorio;
- decisao registrada;
- plano de execucao;
- trace resumido.

Artefatos recebem um envelope simples:

```yaml
artifact_version: "0.1.0"
artifact_id: "artifact_ulid_or_uuid"
artifact_type: "document|decision|plan|patch|report|trace|manifest"
status: "draft|proposed|final|superseded|rejected"
title: "Nome humano curto"
source:
  task_id: "task_id"
  capability_id: "capability_id"
  executor_id: "executor_id"
  trace_id: "trace_id"
content:
  format: "markdown|json|patch|text"
  uri: "optional/path/or/external-reference"
  body: "optional-inline-content"
provenance:
  created_at: "iso-8601"
  created_by: "runtime|executor|human"
validation:
  status: "unchecked|valid|invalid"
  criteria:
    - "criterio verificavel"
```

Regra simples: exatamente um entre `content.body` e `content.uri` deve existir. `content.format` descreve a serializacao do conteudo, enquanto `artifact_type` descreve a finalidade do artefato.

### 12. Evaluate success

Runtime compara resultado com criterios de sucesso do CapabilityContract.

Perguntas:

- a saida exigida existe?
- o artefato esperado foi criado?
- os criterios objetivos foram cumpridos?
- houve violacao de policy?
- ha erro recuperavel?
- o resultado e parcial?

Saida: status final por capacidade.

### 13. Consolidate result

Runtime consolida resultados de uma ou mais capacidades.

Resultado deve conter:

- status global;
- resumo;
- artefatos;
- eventos relevantes;
- decisoes tomadas;
- pendencias;
- recomendacoes;
- bloqueios.

### 14. Close execution

Runtime fecha a task.

Acoes:

- persistir estado final;
- registrar eventos finais;
- indexar artefatos;
- liberar locks;
- expor resumo ao usuario ou sistema chamador.

## Falhas e bloqueios

Falhas devem ser explicitas.

Tipos:

- `contract_missing`;
- `input_invalid`;
- `policy_denied`;
- `approval_required`;
- `executor_unavailable`;
- `adapter_failed`;
- `artifact_missing`;
- `success_criteria_failed`;
- `unexpected_error`.

Nenhum erro deve ser silenciosamente ignorado.

## Simplificacao deliberada

O primeiro runtime futuro deve implementar apenas:

```text
one task -> one capability -> one executor -> one result -> one artifact set
```

Depois disso, o mesmo contrato pode evoluir para:

```text
one task -> capability graph -> multiple executors -> consolidated artifacts
```

Essa ordem evita construir uma orquestracao complexa antes de validar o contrato mais importante.
