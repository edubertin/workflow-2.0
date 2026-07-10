# Workflow 2.0

Workflow 2.0 e um runtime de orquestracao de agentes desacoplado de modelos, provedores e personas.

O projeto nasce com uma premissa simples: agentes nao sao personagens. Agentes sao unidades operacionais que declaram capacidades, recebem contratos de execucao e cooperam dentro de um kernel previsivel.

## Estado atual

Este repositorio contem apenas a arquitetura inicial, o contrato universal de agentes e a estrutura de pastas do kernel.

Ainda nao existem agentes implementados, SDK, CLI, servidor, persistencia real ou integracoes com modelos.

## Principios

- Orientado a capacidades, nao a personas.
- Runtime desacoplado do modelo.
- Contratos antes de implementacao.
- Kernel pequeno, extensivel e observavel.
- Execucao previsivel, auditavel e baseada em politicas.
- Adaptadores nas bordas, sem acoplamento com provedores especificos.

## Estrutura

```text
.
|-- ARCHITECTURE.md
|-- contracts/
|   `-- UNIVERSAL_AGENT_CONTRACT.md
`-- kernel/
    |-- README.md
    |-- adapters/
    |-- capabilities/
    |-- events/
    |-- memory/
    |-- observability/
    |-- orchestration/
    |-- policies/
    |-- registry/
    |-- runtime/
    |-- scheduler/
    `-- state/
```

## Documentos principais

- `ARCHITECTURE.md`: arquitetura conceitual do runtime.
- `contracts/UNIVERSAL_AGENT_CONTRACT.md`: contrato universal para agentes orientados a capacidades.
- `kernel/README.md`: fronteiras e responsabilidades iniciais do kernel.

## Nao objetivos desta fase

- Implementar agentes.
- Escolher um provedor de modelo.
- Criar uma interface de usuario.
- Definir armazenamento definitivo.
- Acoplar o runtime a uma persona, prompt fixo ou fluxo proprietario.
