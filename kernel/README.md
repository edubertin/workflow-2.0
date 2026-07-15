# Kernel

O kernel e o nucleo do Workflow V2.

Ele coordena capacidades, execucoes, politicas, registry, memoria, observabilidade, artefatos, estado e adaptadores. Esta pasta define apenas a estrutura conceitual inicial do kernel.

Nao ha implementacao nesta fase.

## Submodulos

- `adapters`: bordas para modelos, ferramentas e sistemas externos.
- `artifact-generation`: geracao e validacao de artefatos como fonte de verdade.
- `capabilities`: catalogo e semantica de capacidades.
- `events`: eventos internos e trilha de auditoria.
- `memory`: memoria acessada por contrato.
- `observability`: logs, traces, metricas e diagnostico.
- `orchestration`: decomposicao, roteamento e composicao de trabalho.
- `policies`: permissoes, limites e regras de seguranca.
- `registry`: registro de capacidades, candidatos opacos e versoes.
- `runtime`: ciclo de vida de execucoes.
- `scheduler`: fila, concorrencia e agendamento.
- `state`: estado operacional e referencias de artefatos de execucao.
