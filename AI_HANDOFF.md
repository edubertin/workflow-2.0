# AI Handoff - Workflow V2

Status: handoff draft
Last updated: 2026-07-13

This document is for an AI model that has no access to the previous
conversation and may not have repository context loaded yet.

## Project Overview

Workflow V2 is a capability-oriented orchestration runtime.

Its purpose is to transform an intent into a deterministic, auditable execution
that is governed by policies, routed through capabilities, materialized through
artifacts, and explained by events.

The project is intentionally not a multi-agent persona framework. Agents may
exist later, but only as opaque executors registered for capabilities.

The kernel must know:

- tasks;
- capabilities;
- contracts;
- policies;
- registry snapshots;
- commands;
- runtime context;
- events;
- effects;
- artifacts;
- execution results.

The kernel must not know:

- personas;
- prompts;
- model names as architectural rules;
- provider-specific behavior;
- implicit memory;
- executor narrative roles.

## Immutable Principles

These principles should not be weakened without an explicit architecture
decision:

- The kernel routes by `capability_id`, never by agent persona.
- Agents are executors, not domain primitives.
- Capabilities define work semantics; executors only declare support.
- Events are the operational source of truth.
- Artifacts are the source of truth for durable content.
- `ExecutionResult` is an auditable index of closure, not a parallel source of
  truth.
- Memory may provide context, but it must not replace artifacts or versioned
  inputs.
- Every runtime decision must be deterministic and auditable from versioned
  inputs.
- No decisive decision may depend on `latest`, implicit memory, prompt content,
  model preference, wall-clock time, or random ids.
- Every decisive event must reference the versioned inputs or snapshots that
  influenced it.
- Every executor selection must preserve considered and discarded alternatives.
- Policy outcomes must remain explicit and must not be collapsed into generic
  failures.
- Artifact content must not be duplicated into events or `ExecutionResult`.
- Contracts come before implementation.

## Current Architecture State

The architecture is mostly documented as normative Markdown specifications,
with a minimal TypeScript walking skeleton under `kernel/runtime`.

The core architecture separates:

- Runtime;
- Policies;
- Registry;
- Capabilities;
- Memory;
- Observability;
- Artifact Generation.

The central runtime objects are:

- `TaskEnvelope`;
- `CapabilityPlan`;
- `Command`;
- `RuntimeContext`;
- `Effect`;
- `Event`;
- `ArtifactEnvelope`;
- `ExecutionResult`.

The Execution State Machine defines states including:

- `accepted`;
- `plan_resolving`;
- `plan_ready`;
- `policy_checking`;
- `registry_lookup`;
- `executor_selecting`;
- `running`;
- `artifact_collecting`;
- `result_consolidating`;
- `completed`;
- `partial`;
- `blocked`;
- `requires_approval`;
- `failed`;
- `cancelled`.

The current implementation skeleton supports only:

- one task;
- one capability;
- one invoked executor per execution;
- static registry;
- deterministic policy fixture;
- minimal event stream;
- minimal artifact output for the happy path;
- no output artifacts for policy deny paths;
- no output artifacts for Registry no-candidate path;
- deterministic selection between two eligible candidates;
- deterministic eligibility filtering before ranking;
- deterministic canonical tie-breaker for equal-rank eligible candidates;
- deterministic Policy constraint filtering before ranking;
- deterministic replay by reducing events to current state;
- deterministic fingerprinting by canonical JSON.

Supported scenarios:

- `policy_allow -> succeeded`;
- `policy_deny_correctable -> blocked`;
- `policy_deny_terminal -> failed`;
- `registry_no_candidate -> blocked`;
- `registry_multiple_eligible -> succeeded`;
- `registry_mixed_eligibility -> succeeded`;
- `registry_equal_rank_tiebreaker -> succeeded`;
- `policy_allow_with_constraints -> succeeded`.

It does not implement:

- agents;
- SDK;
- CLI;
- server;
- database;
- queue;
- scheduler;
- retries;
- recovery;
- approvals;
- memory as decisive input;
- multiple capabilities;
- distributed infrastructure.

## Relevant Repository Structure

```text
.
|-- README.md
|-- AGENTS.md
|-- ARCHITECTURE.md
|-- RuntimeFlow.md
|-- ExecutionEngine.md
|-- ExecutionStateMachine.md
|-- RuntimeNonHappyFlows.md
|-- ResultReferenceModel.md
|-- CommandContract.md
|-- EffectContract.md
|-- RuntimeContextContract.md
|-- AttemptContract.md
|-- EventContract.md
|-- EventCatalog.md
|-- ArtifactEnvelope.md
|-- CapabilityContract.md
|-- PolicyEngine.md
|-- PolicyConstraintsContract.md
|-- Registry.md
|-- RegistrySnapshotContract.md
|-- contracts/
|   |-- TaskEnvelope.md
|   |-- CapabilityPlan.md
|   |-- ExecutionResult.md
|   |-- CapabilityContract.md
|   |-- EventContract.md
|   |-- PolicyConstraintsContract.md
|   |-- RegistrySnapshotContract.md
|   `-- UNIVERSAL_AGENT_CONTRACT.md
`-- kernel/
    |-- README.md
    |-- artifact-generation/
    |   `-- README.md
    `-- runtime/
        |-- WALKING_SKELETON_REVIEW.md
        `-- walking-skeleton.ts
```

Important note: the worktree currently contains many modified and untracked
files. Do not revert or discard them unless explicitly instructed.

## Document Authority

Use this authority order when a conflict appears:

1. `README.md` and `AGENTS.md` define project philosophy and working rules.
2. `ARCHITECTURE.md` defines component boundaries.
3. `ExecutionStateMachine.md` defines states, transitions, terminality, replay,
   retries, timeouts, and recovery.
4. `ExecutionEngine.md` defines the operational runtime cycle.
5. Root specs such as `EventContract.md`, `EventCatalog.md`,
   `ArtifactEnvelope.md`, `CapabilityContract.md`, `CommandContract.md`,
   `EffectContract.md`, `RuntimeContextContract.md`, `PolicyEngine.md`,
   `Registry.md`, `RuntimeNonHappyFlows.md`, and `ResultReferenceModel.md`
   define semantic contracts.
6. `contracts/*.md` defines the minimal object contracts a future
   implementation must accept or produce.
7. `kernel/*/README.md` maps structure and should not override normative specs.

If a semantic root spec conflicts with a file in `contracts/`, update the
contract explicitly before implementation. Do not choose an implicit
interpretation in code.

## Decision Timeline

1. Base architecture established.
   Workflow V2 became a runtime for orchestration by capabilities, not agents.

2. Kernel/persona boundary fixed.
   The kernel may discover and select opaque executors, but never routes by
   persona, prompt, model, style, or narrative role.

3. Responsibility boundaries separated.
   Runtime, Policies, Registry, Capabilities, Memory, Observability, and
   Artifact Generation became distinct concerns.

4. Artifact Envelope v0 selected.
   Artifacts are versioned envelopes with identity, type, status, source,
   content, provenance, and validation.

5. Core object contracts specified.
   `TaskEnvelope`, `CapabilityPlan`, and `ExecutionResult` were defined as
   normative minimal objects.

6. Execution Engine specified.
   The runtime cycle from `TaskEnvelope` to `ExecutionResult` was described,
   including plan resolution, policy gates, registry lookup, executor
   selection, events, artifacts, and result consolidation.

7. Determinism and replay strengthened.
   Every decision must depend only on versioned inputs and snapshots. Executor
   selection must record discarded alternatives.

8. EventContract and EventCatalog defined.
   Events became immutable facts and the minimum audit trail for replay.

9. PolicyEngine defined.
   Policy returns only `allow`, `deny`, `allow_with_constraints`, or
   `requires_approval`. It knows neither agents nor models.

10. Registry defined.
    Registry is the source of truth for capability discovery and execution
    metadata, not for artifacts, memory, prompts, or execution state.

11. Command, Effect, and RuntimeContext specified.
    Commands request transitions, Effects declare external work, and
    RuntimeContext freezes decision inputs.

12. Execution State Machine specified.
    State, commands, events, effects, runtime context, replay, failures,
    retries, timeouts, and recovery responsibilities were separated.

13. Non-happy flows specified.
    `blocked`, `denied`, and `failed` were modeled. `denied` is a policy
    outcome, not a runtime state.

14. Result reference model specified.
    `ExecutionResult` was clarified as an index of references to decisions,
    events, policy outcomes, selections, errors, pending work, and artifacts.

15. Walking skeleton implemented.
    A minimal deterministic TypeScript skeleton was added under
    `kernel/runtime/walking-skeleton.ts`.

16. First non-happy runtime flow implemented.
    The skeleton now supports:
    - `policy_allow -> succeeded`;
    - `policy_deny_correctable -> blocked`.

17. Terminal policy deny flow implemented.
    The skeleton now also supports:
    - `policy_deny_terminal -> failed`.

18. AttemptContract specified.
    `AttemptContract.md` now defines attempt identity, attempt creation,
    relation with Task, Command, Effect, Events and ExecutionResult, and future
    support for retries, timeouts and late results without implementing those
    mechanisms.

19. Registry no-candidate flow implemented.
    The walking skeleton now supports `registry_no_candidate -> blocked` after
    policy allow, using an explicit Registry snapshot with an empty eligible
    candidate set.

20. Deterministic selection between two eligible executors implemented.
    The walking skeleton now supports `registry_multiple_eligible -> succeeded`
    using one Registry snapshot with two eligible candidates, a versioned
    selection rule, canonical candidate ordering and a proof that `[alpha,
    beta]` and `[beta, alpha]` enumerations produce the same fingerprint.

21. Mixed eligibility before ranking implemented.
    The walking skeleton now supports `registry_mixed_eligibility -> succeeded`
    using one Registry snapshot with one inactive higher-priority candidate and
    one active lower-priority candidate. Eligibility removes the inactive
    candidate before ranking, and `[inactive, active]` and `[active, inactive]`
    enumerations produce the same fingerprint.

22. Equal-rank canonical tie-breaker implemented.
    The walking skeleton now supports
    `registry_equal_rank_tiebreaker -> succeeded` using one Registry snapshot
    with two active, eligible candidates that share the same
    `declared_priority`. The selection records the ranking-key equality,
    applies the documented canonical identity tuple and proves `[tie_a, tie_b]`
    and `[tie_b, tie_a]` enumerations produce the same fingerprint.

23. Policy allow with constraints implemented.
    The walking skeleton now supports
    `policy_allow_with_constraints -> succeeded` using a typed, versioned
    constraint set emitted by Policy. Registry lookup discovers both
    candidates without constraint pushdown, intrinsic eligibility passes for
    both, Policy constraint evaluation discards the better-priority high-risk
    candidate before ranking, and inverted Registry enumerations produce the
    same fingerprint.

## Last Work Completed

The latest walking skeleton implementation added deterministic Policy
constraint filtering before ranking:

```text
policy allow_with_constraints -> registry lookup with constrained candidates
-> deterministic executor selection -> capability execution -> succeeded
```

Implemented behavior:

- policy fixture returns `allow_with_constraints`;
- policy decision references a typed and versioned constraint set;
- constraint set digest is derived deterministically and excludes its own
  digest field;
- Registry lookup runs against explicit snapshot
  `registry_snapshot_policy_constraints_001@0.1.0`;
- Registry lookup discovers both candidates and does not apply constraint
  pushdown;
- candidates are
  `executor.walking_skeleton.constraint_a_high_risk@0.1.0` and
  `executor.walking_skeleton.constraint_b_low_risk@0.1.0`;
- selection rule is
  `executor_selection.walking_skeleton.default@0.1.0`;
- ranking key is `declared_priority` ascending;
- both candidates are active, support the requested capability and pass
  intrinsic eligibility;
- `executor.walking_skeleton.constraint_a_high_risk` has better priority but
  fails constraint `risk_level eq low`;
- failed constraint evidence records constraint id, version, target, operator,
  observed value and source Registry record reference;
- only `executor.walking_skeleton.constraint_b_low_risk` enters the ranking;
- no eligible alternative remains unselected in this scenario;
- only the selected executor is invoked;
- output artifact source references
  `executor.walking_skeleton.constraint_b_low_risk`;
- `ExecutionResult.status` is `succeeded`;
- `decision_refs` references policy, Registry lookup, executor selection and
  result decisions;
- replay reconstructs `completed`;
- `[constraint_a, constraint_b]` and `[constraint_b, constraint_a]` internal
  Registry enumerations produce the same considered candidate order,
  intrinsic eligibility, constraint outcome, discarded candidate, ranking,
  selected executor, artifact, result, event sequence and canonical
  fingerprint.

The equal-rank tie-breaker flow remains implemented:

```text
policy allow -> registry lookup with equal-rank eligible candidates
-> deterministic executor selection -> capability execution -> succeeded
```

It still selects `executor.walking_skeleton.tie_a`, records
`executor.walking_skeleton.tie_b` as `tie_breaker_ranked_lower`, invokes only
tie_a and replays to `completed`.

The mixed eligibility flow remains implemented:

```text
policy allow -> registry lookup with mixed eligibility candidates
-> deterministic executor selection -> capability execution -> succeeded
```

It still discards `executor.walking_skeleton.mixed_a_inactive` before ranking,
selects `executor.walking_skeleton.mixed_b_active`, invokes only the active
eligible executor and replays to `completed`.

The deterministic two-eligible flow remains implemented:

```text
policy allow -> registry lookup with two eligible candidates
-> deterministic executor selection -> capability execution -> succeeded
```

It still selects `executor.walking_skeleton.alpha`, records
`executor.walking_skeleton.beta` as an eligible non-selected alternative with
reason `ranked_lower`, invokes only alpha and replays to `completed`.

The Registry no-candidate flow remains implemented:

```text
policy allow -> registry no candidate -> execution blocked
```

It still records an explicit empty candidate set, emits
`registry.lookup.no_candidate`, fabricates no candidates or artifacts and
replays to `blocked`.

The happy path and policy deny paths were preserved:

```text
policy allow -> registry lookup -> executor selection -> capability execution
-> artifact validation -> succeeded
```

```text
policy deny correctable -> execution blocked
```

The latest documentation work added `AttemptContract.md` as a normative
architecture contract. No attempt runner, retry engine, scheduler, recovery
runner, storage or runtime infrastructure was implemented.

Verification performed:

- TypeScript strict check passed via `pnpm dlx --package typescript@latest tsc`
  because no local `package.json` or `tsconfig.json` exists.
- Deterministic demo passed through `verifyWalkingSkeletonScenarios()`.
- Text checks passed for ASCII and trailing spaces in the touched TypeScript
  file.
- `git diff --check` passed. For untracked files, no-index diff check was used
  where needed.

## Current Walking Skeleton Event Sequences

Happy path:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
registry.lookup.completed
execution.executor.selected
execution.context.prepared
capability.execution.started
capability.execution.completed
capability.artifact.proposed
artifact.validation.completed
execution.result.consolidation.started
execution.result.consolidation.completed
execution.completed
```

Correctable policy deny path:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
policy.decision.denied
execution.blocked
execution.result.consolidation.started
execution.result.consolidation.completed
```

Terminal policy deny path:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
policy.decision.denied
execution.failed
execution.result.consolidation.started
execution.result.consolidation.completed
```

Registry no-candidate path:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
registry.lookup.completed
registry.lookup.no_candidate
execution.blocked
execution.result.consolidation.started
execution.result.consolidation.completed
```

Registry multiple-eligible path:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
registry.lookup.completed
execution.executor.selected
execution.context.prepared
capability.execution.started
capability.execution.completed
capability.artifact.proposed
artifact.validation.completed
execution.result.consolidation.started
execution.result.consolidation.completed
execution.completed
```

Registry mixed-eligibility path:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
registry.lookup.completed
execution.executor.selected
execution.context.prepared
capability.execution.started
capability.execution.completed
capability.artifact.proposed
artifact.validation.completed
execution.result.consolidation.started
execution.result.consolidation.completed
execution.completed
```

Registry equal-rank tie-breaker path:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
registry.lookup.completed
execution.executor.selected
execution.context.prepared
capability.execution.started
capability.execution.completed
capability.artifact.proposed
artifact.validation.completed
execution.result.consolidation.started
execution.result.consolidation.completed
execution.completed
```

Policy allow with constraints path:

```text
execution.task.accepted
execution.plan.resolution.started
execution.plan.resolution.completed
policy.check.completed
registry.lookup.completed
execution.executor.selected
execution.context.prepared
capability.execution.started
capability.execution.completed
capability.artifact.proposed
artifact.validation.completed
execution.result.consolidation.started
execution.result.consolidation.completed
execution.completed
```

## Next Clear Objective

The next solid objective is to choose the next narrow runtime validation step.
The strongest candidate is:

```text
capability execution failure -> execution failed
```

Recommended approach:

1. Preserve all eight existing scenarios.
2. Preserve the order-independence proof for `registry_multiple_eligible`.
3. Preserve the eligibility-before-ranking proof for
   `registry_mixed_eligibility`.
4. Preserve the canonical tie-breaker proof for
   `registry_equal_rank_tiebreaker`.
5. Preserve the Policy constraint proof for `policy_allow_with_constraints`.
6. Keep one task, one capability and one invoked executor per execution.
7. Make the executor return deterministic failure evidence by explicit fixture.
8. Emit capability failure and execution failure events sufficient for replay.
9. Produce `ExecutionResult.status = failed` with classified error.
10. Prove deterministic fingerprints for repeated runs.

Retries, timeouts and late results should remain out of implementation scope
until attempt events, retry policy and timeout semantics are specified in more
detail on top of `AttemptContract.md`.

## What Not To Do

Do not:

- introduce agents;
- introduce personas;
- introduce prompts;
- introduce model-specific behavior;
- add SDK, CLI, server, API, database, queue, or distributed infrastructure;
- implement retries before attempt events, retry policy and timeout semantics
  are specified;
- implement approvals before `ApprovalContract`;
- implement decisive memory before `MemoryReferenceContract`;
- implement multiple capabilities before the one-capability skeleton is stable;
- expand beyond the current two-candidate deterministic selection scenarios
  before the next scope is explicitly requested;
- select executor by name, style, role, or persona;
- use `latest` state for decisions;
- use wall-clock time or random ids for canonical outputs;
- fabricate artifacts to satisfy a blocked or failed result;
- duplicate artifact content into events or `ExecutionResult`;
- collapse policy denial into generic unexpected error;
- mutate existing user work or revert unrelated dirty files;
- commit or push unless explicitly instructed.

## Open Points

Architecture-level open points:

- Final schema format for runtime objects.
- Canonical error taxonomy.
- Final event type catalog.
- Which decisions require artifact type `decision`.
- Complete Policy constraint language.
- Final Registry snapshot storage and export format.
- Executor ranking rule format.
- Attempt event names and retry/timeout policy on top of `AttemptContract`.
- Approval representation and lifecycle.
- Memory reference contract if memory becomes decisive.
- Storage strategy for events and artifacts.
- Lifecycle for artifact `superseded` and `rejected`.
- When long-lived `blocked` becomes `failed` or `cancelled`.
- How `partial` spawns a future task.

Implementation-level open points:

- No local `package.json`.
- No local `tsconfig.json`.
- No formal test runner.
- Walking skeleton verification exists as exported functions, not as a test
  file.
- Event metadata is intentionally minimal and not yet a full schema.
- Replay currently reduces event stream to latest state transition only.
- Event store, persistence, and artifact storage are not implemented.

## Executive Summary For A New AI Chat

You are working on Workflow V2, a capability-oriented orchestration runtime.
The core rule is immutable: the kernel knows capabilities, never personas.
Agents are only opaque executors registered for capabilities. The system must
be deterministic and auditable: every runtime decision depends only on
versioned inputs, snapshots, events, artifacts, and explicit contracts. Events
are the operational source of truth; artifacts are the source of truth for
durable content; `ExecutionResult` is only an auditable index of references,
not a parallel source of truth.

Read first: `README.md`, `AGENTS.md`, `ARCHITECTURE.md`,
`ExecutionStateMachine.md`, `ExecutionEngine.md`, `EventContract.md`,
`EventCatalog.md`, `PolicyEngine.md`, `Registry.md`,
`RuntimeNonHappyFlows.md`, `ResultReferenceModel.md`, `CommandContract.md`,
`EffectContract.md`, `RuntimeContextContract.md`, `AttemptContract.md`,
`ArtifactEnvelope.md`, and `contracts/*.md`.

Current implementation exists only as a minimal walking skeleton in
`kernel/runtime/walking-skeleton.ts`. It supports eight deterministic scenarios:
`policy_allow -> succeeded`, `policy_deny_correctable -> blocked`,
`policy_deny_terminal -> failed`, `registry_no_candidate -> blocked`,
`registry_multiple_eligible -> succeeded`,
`registry_mixed_eligibility -> succeeded`, and
`registry_equal_rank_tiebreaker -> succeeded`, and
`policy_allow_with_constraints -> succeeded`. In both deny flows, policy deny
occurs before Registry lookup; no executor is selected or invoked; no
capability starts; no output artifact is fabricated. Correctable deny emits
`execution.blocked`; terminal deny emits `execution.failed` with classified
error `policy_denied_terminal`. The Registry no-candidate flow happens after
policy allow, records `registry.lookup.completed`, `registry.lookup.no_candidate`
and `execution.blocked`, uses an explicit Registry snapshot, fabricates no
candidates, selects no executor, starts no capability, declares no attempt and
creates no output artifact. The multiple-eligible flow canonicalizes two
eligible candidates from the same Registry snapshot, selects
`executor.walking_skeleton.alpha`, records `executor.walking_skeleton.beta` as
`ranked_lower`, invokes only alpha, produces the expected artifact and replays
to `completed`. The mixed-eligibility flow canonicalizes one inactive
higher-priority candidate and one active lower-priority candidate, discards the
inactive candidate before ranking, ranks only the active candidate, invokes
only the active executor, produces the expected artifact and replays to
`completed`. The equal-rank tie-breaker flow canonicalizes two active eligible
candidates with the same `declared_priority`, applies the documented canonical
identity tuple, selects `executor.walking_skeleton.tie_a`, records
`executor.walking_skeleton.tie_b` as `tie_breaker_ranked_lower`, invokes only
tie_a and replays to `completed`. The Policy constraints flow emits a typed
constraint set, discovers both candidates through Registry, discards the
better-priority high-risk candidate by constraint before ranking, selects and
invokes only the low-risk candidate and replays to `completed`. Replay
reconstructs the expected final state for all eight scenarios, and repeated
identical runs produce identical
canonical fingerprints.

Do not implement agents, SDK, CLI, server, database, queue, retries, recovery,
approvals, decisive memory, multiple capabilities, or multiple executors unless
explicitly asked. Do not use personas, prompts, model names, implicit memory,
`latest` state, wall-clock time, or random ids as decision inputs. Do not commit
or push unless explicitly instructed.

Recommended next step: implement the next narrow non-happy flow
`capability_execution_failed -> failed`, or stay architectural and specify the
event details needed for future attempt tracking before touching retries,
timeouts, late results or recovery.
