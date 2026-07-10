# CapabilityPlan

Versao: `0.1.0-draft`

`CapabilityPlan` e o objeto que traduz um `TaskEnvelope` em uma sequencia ou grafo simples de capacidades.

Ele nao representa execucao concluida e nao deve depender de personas. O plano descreve quais capacidades sao necessarias, em qual ordem relativa e com quais criterios de sucesso.

## Responsabilidade

Definir o trabalho em termos de capacidades antes da selecao final de executores.

## Proposito

- transformar task em capacidades;
- preservar rastreabilidade com `task_id` e `trace_id`;
- declarar dependencias entre capacidades;
- explicitar entradas, saidas esperadas e artefatos por capacidade;
- fornecer base para policy gate e registry lookup;
- impedir roteamento por persona.

## Campos obrigatorios

```yaml
plan_version: "0.1.0"
plan_id: "plan_ulid_or_uuid"
task_id: "task_ulid_or_uuid"
trace_id: "trace_ulid_or_uuid"
status: "draft|ready|blocked"
capabilities:
  - step_id: "step_id"
    capability_id: "domain.action"
    capability_version: "0.1.0"
    purpose: "Por que esta capacidade e necessaria"
    input_refs:
      - "task.intent"
    expected_outputs:
      - "saida esperada"
    expected_artifacts:
      - artifact_type: "document|decision|plan|patch|report|trace|manifest"
        title: "Nome esperado"
    depends_on: []
    success_criteria:
      - "criterio verificavel"
```

## Campos opcionais

```yaml
policy_requirements:
  required_permissions:
    - "workspace.read"
  max_risk_level: "low|medium|high|critical"
candidate_constraints:
  allowed_executor_types:
    - "agent|service|human|code"
  forbidden_executor_ids:
    - "executor_id"
notes:
  - "observacao arquitetural"
```

## Invariantes

- `CapabilityPlan` deve referenciar exatamente um `task_id`.
- Cada `step_id` deve ser unico dentro do plano.
- Cada `capability_id` deve existir como contrato conhecido ou o plano deve ficar `blocked`.
- `depends_on` so pode referenciar `step_id` existente.
- O plano nao pode depender de nome, tom, persona ou avatar de agente.
- `candidate_constraints` pode limitar tipo ou executor por razoes objetivas, mas nao pode escolher uma persona.
- Cada capacidade deve ter pelo menos um criterio de sucesso verificavel.
- Artefatos esperados no plano devem ser compativeis com `Artifact Envelope v0`.

## Relacao com Artifact Envelope

`CapabilityPlan` define quais artefatos cada capacidade deve produzir ou validar.

Quando um artefato for gerado, o `Artifact Envelope v0` deve apontar para a capacidade do plano:

```yaml
source:
  task_id: "task_ulid_or_uuid"
  capability_id: "domain.action"
  executor_id: "executor_id"
  trace_id: "trace_ulid_or_uuid"
```

`Artifact Envelope v0` nao substitui o plano. Ele comprova entregas produzidas por uma ou mais capacidades planejadas.

## Exemplo valido

```yaml
plan_version: "0.1.0"
plan_id: "plan_01JABC"
task_id: "task_01JABC"
trace_id: "trace_01JABC"
status: "ready"
capabilities:
  - step_id: "step_1"
    capability_id: "repository.inspect"
    capability_version: "0.1.0"
    purpose: "Ler documentos arquiteturais existentes"
    input_refs:
      - "task.scope"
      - "task.context_refs"
    expected_outputs:
      - "lista de documentos relevantes"
    expected_artifacts: []
    depends_on: []
    success_criteria:
      - "Documentos relevantes foram identificados"
  - step_id: "step_2"
    capability_id: "documentation.specify"
    capability_version: "0.1.0"
    purpose: "Criar especificacoes dos objetos centrais do runtime"
    input_refs:
      - "step_1.expected_outputs"
      - "task.intent"
    expected_outputs:
      - "tres contratos documentados"
    expected_artifacts:
      - artifact_type: "document"
        title: "TaskEnvelope.md"
      - artifact_type: "document"
        title: "CapabilityPlan.md"
      - artifact_type: "document"
        title: "ExecutionResult.md"
    depends_on:
      - "step_1"
    success_criteria:
      - "Cada contrato define campos, invariantes e exemplos"
```

Por que e valido:

- roteia por capacidades;
- explicita dependencia entre passos;
- nao escolhe executor por persona;
- declara artefatos esperados por capacidade.

## Exemplo invalido

```yaml
plan_version: "0.1.0"
plan_id: "plan_01JABC"
task_id: "task_01JABC"
trace_id: "trace_01JABC"
status: "ready"
capabilities:
  - step_id: "step_1"
    capability_id: "architect_persona"
    purpose: "Usar o agente arquiteto"
    input_refs: []
    expected_outputs: []
    expected_artifacts: []
    depends_on:
      - "missing_step"
```

Por que e invalido:

- `capability_id` descreve persona, nao capacidade;
- falta `capability_version`;
- `depends_on` referencia passo inexistente;
- nao ha criterio de sucesso;
- `input_refs` e `expected_outputs` estao vazios sem justificativa.
