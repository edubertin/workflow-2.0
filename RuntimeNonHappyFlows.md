# RuntimeNonHappyFlows

Status: draft
Version: 0.1.0

## Purpose

This document specifies the first non-happy runtime flows for Workflow V2.
It describes how the runtime represents blocked, denied, and failed
execution paths without changing the core philosophy:

- the kernel knows capabilities, never personas;
- agents are opaque executors;
- decisions are deterministic and auditably derived from versioned inputs;
- events are facts;
- artifacts preserve durable content;
- ExecutionResult consolidates references, outcomes, and evidence.

This is an architectural specification only. It does not define code,
pseudocode, SDKs, CLIs, servers, databases, queues, or storage mechanisms.

## Scope

The initial non-happy flows cover:

- plan resolution that cannot continue;
- policy denial;
- registry lookup without a usable executor candidate;
- capability execution failure;
- artifact validation or collection failure;
- result consolidation failure.

Retries, recovery, approvals, partial completion, cancellation, scheduler
behavior, distributed coordination, and operational infrastructure remain out
of scope for this document.

## Terminology

### Blocked

Blocked means the runtime cannot continue the current execution with the
currently available versioned inputs, but the condition may be resolved by a
new explicit input, approval, contract version, registry snapshot, policy
version, or artifact.

Blocked is a runtime state.

### Denied

Denied means PolicyEngine returned a policy decision whose outcome is `deny`.
Denied is a policy outcome, not an independent runtime state in the initial
Execution State Machine.

A denied decision must be recorded as an event. The runtime then moves to a
state that reflects what the denial means for execution:

- `blocked` when the denial is correctable by explicit future input or approval;
- `failed` when the denial makes the current execution impossible under the
  applicable policy and task scope.

### Failed

Failed means the runtime attempted or evaluated a required step and determined
that the current execution cannot satisfy its required criteria.

Failed is a terminal runtime state for the current execution attempt. A later
execution may be started only from a new command, task version, or other
explicit versioned input.

## Normative Principles

- No non-happy path may be silent.
- Every state change must be represented by one or more events that conform to
  EventContract.
- Every decisive event must reference the versioned inputs used to make the
  decision.
- RuntimeContext may expose current state only as a derived view from replayed
  events; it is never a source of truth.
- ExecutionResult must reference the decisive events and artifacts that justify
  its status.
- A policy denial must not be collapsed into a generic runtime failure without
  preserving the policy decision event.
- Memory, prompts, personas, model choices, and unversioned current state must
  not be required to replay any non-happy decision.

## State Placement

| Condition | Runtime State | Source of Decision | Notes |
| --- | --- | --- | --- |
| Missing or insufficient plan inputs | `blocked` | Execution Engine | Requires new versioned input or contract clarification. |
| Policy outcome is `deny` and correctable | `blocked` | PolicyEngine | Denial is preserved as policy event; runtime waits for explicit change. |
| Policy outcome is `deny` and terminal | `failed` | PolicyEngine | Denial is preserved as policy event before execution failure. |
| No usable registry candidate exists | `blocked` or `failed` | Registry plus Execution Engine | Blocked when a future snapshot can resolve it; failed when current scope makes execution impossible. |
| Executor or capability execution fails | `failed` | Executor result interpreted by Execution Engine | The executor remains opaque; failure evidence is captured through events and artifacts. |
| Required artifact is missing or invalid | `blocked` or `failed` | Artifact validation | Blocked if a corrected artifact can be supplied; failed if the required artifact cannot be produced. |
| ExecutionResult cannot be consolidated normally | `failed` | Execution Engine | A minimal failed ExecutionResult must still be emitted. |

## Initial Non-Happy Flows

### 1. Plan Resolution Blocked

This flow occurs when the runtime cannot derive a valid CapabilityPlan from a
TaskEnvelope and the available contracts.

Allowed transition:

```text
plan_resolving -> blocked
```

Typical causes:

- requested capability cannot be identified from versioned task inputs;
- required TaskEnvelope field is absent or invalid;
- required CapabilityContract is missing or incompatible;
- plan criteria cannot be made deterministic from the available inputs.

Required event trail:

- a plan resolution event that records the versioned inputs considered;
- `execution.blocked` with the blocking reason and required next input.

ExecutionResult requirements:

- `status` must be `blocked`;
- `event_refs` must include the blocking event;
- `decision_refs` must reference the plan decision that could not complete;
- `pending` must describe the explicit missing versioned input or contract;
- no fabricated CapabilityPlan may be emitted to hide the blocked condition.

### 2. Policy Denied

This flow occurs when PolicyEngine evaluates a command, plan, context, or
effect declaration and returns `deny`.

Allowed transitions:

```text
policy_checking -> blocked
policy_checking -> failed
```

Denied is not modeled as a separate runtime state. It is preserved as a policy
decision event and then mapped to the appropriate runtime state.

Required event trail:

- policy evaluation event with policy version and input references;
- policy decision event with outcome `deny`;
- `execution.blocked` or `execution.failed`, depending on whether the denial is
  correctable within the execution model.

ExecutionResult requirements:

- `policy_outcomes` must include the denied policy decision reference;
- `event_refs` must include both the policy denial event and the resulting
  runtime state event;
- `status` must be `blocked` for correctable denial or `failed` for terminal
  denial;
- `errors` must identify the condition as policy denial without exposing
  sensitive policy internals;
- `pending` may be present only when the denial is correctable.

Replay requirement:

- replay must be able to derive the same denial using only the policy version,
  input references, command reference, task reference, registry snapshot when
  relevant, and prior event stream.

### 3. Registry Candidate Not Found

This flow occurs when the runtime asks Registry for candidates matching the
required capability and no usable executor metadata is available.

Allowed transitions:

```text
registry_lookup -> blocked
registry_lookup -> failed
```

Required event trail:

- registry lookup event with registry snapshot identity and version;
- `registry.lookup.no_candidate` when the Registry snapshot returns an empty
  candidate set, or executor selection blocked event when candidates exist but
  are all rejected;
- `execution.blocked` or `execution.failed`.

ExecutionResult requirements:

- `status` must reflect whether the condition is correctable (`blocked`) or
  terminal for the current execution (`failed`);
- `decision_refs` must reference `registry_lookup` when no candidate exists in
  the Registry snapshot, or `executor_selection` when candidates existed but
  selection rejected them;
- `event_refs` must include the registry lookup and resulting state event;
- rejected candidates, when any exist, must be referenced with identity,
  version, and rejection reason;
- `pending` may identify the missing capability registration or executor
  metadata when the condition is blocked.

Replay requirement:

- the registry snapshot must be sufficient to reconstruct why no candidate was
  selected without consulting current Registry state.

### 4. Capability Execution Failed

This flow occurs after a selected executor attempts a declared capability and
reports failure or fails to produce required evidence.

Allowed transition:

```text
running -> failed
```

Required event trail:

- capability execution started event;
- capability execution failed event with safe failure summary and evidence
  references;
- `execution.failed`.

ExecutionResult requirements:

- `status` must be `failed`;
- `capability_results` must include the failed capability attempt reference;
- `event_refs` must include the execution failure event and capability failure
  event;
- `artifact_refs` may include any durable failure evidence or produced
  artifacts, but must not inline artifact content;
- `errors` must contain a deterministic error classification.

Replay requirement:

- replay must not require executor internals, prompts, model choices, or
  persona data. It must rely on events, effect declarations, evidence
  references, and artifact envelopes.

### 5. Artifact Collection Or Validation Failed

This flow occurs when a required artifact is missing, invalid, rejected, or
cannot be linked to the expected provenance.

Allowed transitions:

```text
artifact_collecting -> blocked
artifact_collecting -> failed
```

Required event trail:

- artifact collection or validation event with artifact identity when present;
- validation outcome event or failure event;
- `execution.blocked` or `execution.failed`.

ExecutionResult requirements:

- `status` must be `blocked` when a corrected artifact can be supplied;
- `status` must be `failed` when the required artifact cannot be produced for
  the current execution;
- `artifact_refs` must reference valid, invalid, or rejected artifact envelopes
  when they exist;
- `validation` references must point to the validation evidence rather than
  restating artifact content;
- `pending` may describe the missing or corrected artifact only for blocked
  outcomes.

Replay requirement:

- replay must be able to determine the same artifact outcome from artifact
  envelope version, validation references, provenance references, and event
  order.

### 6. Result Consolidation Failed

This flow occurs when the runtime cannot produce a normal successful
ExecutionResult from the accumulated events, decisions, artifacts, and
capability outcomes.

Allowed transition:

```text
result_consolidating -> failed
```

Required event trail:

- result consolidation started event;
- execution failure event describing the consolidation failure.

ExecutionResult requirements:

- a minimal failed ExecutionResult must still be emitted;
- `status` must be `failed`;
- `event_refs` must include the consolidation failure event;
- `errors` must explain which required reference or invariant prevented normal
  consolidation;
- the result must not invent successful artifacts, capability outcomes, or
  decisions to complete the shape.

Replay requirement:

- replay must reconstruct the same failed result from the event stream and the
  referenced artifacts available at that historical point.

## ExecutionResult Clarifications

The existing ExecutionResult contract can represent the initial non-happy
flows. No schema-breaking change is required for this stage.

The following usage rules are normative:

- `status` is the runtime outcome, not the raw policy outcome.
- `blocked` requires at least one `execution.blocked` event reference.
- `failed` requires at least one `execution.failed` event reference.
- Policy denial must appear in `policy_outcomes` and in `event_refs`.
- `decision_refs` must include the decision that directly caused the non-happy
  outcome.
- `pending` is valid only for outcomes that can continue after new explicit
  input, approval, contract version, policy version, registry snapshot, or
  artifact.
- `errors` must classify failures without embedding prompts, sensitive data,
  executor internals, or artifact content.
- `artifact_refs` may reference invalid or rejected artifacts when those
  artifacts were durably produced and validated.

## Deterministic Replay Requirements

For every non-happy flow, replay must be able to reconstruct:

- the same state transition;
- the same policy outcome;
- the same registry candidate set and rejected alternatives;
- the same artifact validation outcome;
- the same ExecutionResult status;
- the same decisive event references.

Replay must use only:

- TaskEnvelope identity and version;
- Command identity and version;
- RuntimeContext derived from prior events;
- CapabilityContract identity and version;
- CapabilityPlan identity and version when present;
- Registry snapshot identity and version;
- Policy identity and version;
- Effect identity and version when present;
- Attempt identity, version and ordinal when an attempt influenced failure,
  timeout, cancellation or late-result handling;
- ArtifactEnvelope identity and version when present;
- EventContract-compliant event stream.

Replay must not use:

- current Registry state;
- current policy definitions;
- implicit memory;
- prompts;
- personas;
- model selection;
- executor internals;
- wall-clock decisions not captured as events.

## Relationship With Events

Events remain the audit trail for non-happy paths. Each event must follow
EventContract and must not embed artifact content, prompts, sensitive payloads,
or implementation details.

At minimum, decisive non-happy events must identify:

- the subject being decided;
- the versioned inputs considered;
- the outcome;
- the reason summary;
- alternatives discarded when selection occurred;
- the causal predecessor event or command.

When a non-happy path depends on a concrete attempt, the decisive event must
carry `attempt_id`, `attempt_version`, `attempt_number`, `effect_id`,
`effect_version`, `command_id`, `command_version` and the versioned inputs that
made the attempt decision reproducible.

## Relationship With Artifacts

Artifacts preserve durable content and evidence. A non-happy ExecutionResult
may reference artifacts that are:

- produced successfully before failure;
- invalid according to validation;
- rejected because they do not satisfy provenance or criteria;
- evidence of an execution failure.

The ExecutionResult must reference artifact envelopes rather than duplicate
artifact content.

## Open Points

- A later normative error taxonomy may define canonical error codes for
  blocked and failed outcomes.
- Approval-specific blocked behavior remains deferred to an approval contract
  or policy extension.
- The threshold for converting a long-lived blocked execution into a failed or
  cancelled execution remains a policy decision, not a state machine default.
- EventCatalog may later standardize more granular event type names for
  artifact validation failures and registry lookup failures, as long as they
  remain compatible with EventContract.

## Non-Goals

This document does not define:

- retry policy;
- recovery policy;
- approval workflow;
- executor implementation;
- agent behavior;
- storage model;
- transport;
- scheduler behavior;
- observability backend;
- SDK, CLI, API, server, or database.
