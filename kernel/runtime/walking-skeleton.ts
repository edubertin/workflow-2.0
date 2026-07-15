type Version = "0.1.0";
type DraftVersion = "0.1.0-draft";
type SideEffect = "read" | "write" | "network" | "external_state" | "destructive";
type CandidateStatus = "active" | "inactive" | "deprecated";
type CompatibilityStatus = "compatible" | "incompatible" | "unknown";
type RiskLevel = "low" | "medium" | "high" | "critical";
type EligibilityReason = "eligible" | "frozen_status_not_active";
type PolicyConstraintOutcome = "satisfied" | "unsatisfied";
type ExecutionState =
  | "initial"
  | "accepted"
  | "plan_ready"
  | "policy_checking"
  | "registry_lookup"
  | "executor_selecting"
  | "running"
  | "artifact_collecting"
  | "result_consolidating"
  | "blocked"
  | "completed"
  | "failed";
type CommandType =
  | "execution.task.accept"
  | "execution.plan.resolve"
  | "execution.policy.apply"
  | "execution.registry.apply"
  | "execution.executor.select"
  | "execution.capability.apply"
  | "execution.artifact.apply"
  | "execution.result.consolidate";
type EffectType =
  | "policy.evaluate"
  | "registry.lookup"
  | "executor.invoke"
  | "artifact.validate"
  | "result.consolidate";
type RegistryEnumerationOrder = "declared" | "reversed";
type EventType =
  | "execution.task.accepted"
  | "execution.plan.resolution.started"
  | "execution.plan.resolution.completed"
  | "policy.check.completed"
  | "policy.decision.denied"
  | "registry.lookup.completed"
  | "registry.lookup.no_candidate"
  | "execution.executor.selected"
  | "execution.context.prepared"
  | "capability.execution.started"
  | "capability.execution.completed"
  | "capability.artifact.proposed"
  | "artifact.validation.completed"
  | "execution.result.consolidation.started"
  | "execution.result.consolidation.completed"
  | "execution.blocked"
  | "execution.completed"
  | "execution.failed";
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

interface VersionedRef {
  readonly kind: string;
  readonly id: string;
  readonly version: string;
}

interface TaskEnvelope {
  readonly task_version: Version;
  readonly task_id: string;
  readonly trace_id: string;
  readonly intent: {
    readonly summary: string;
    readonly raw: string;
  };
  readonly scope: {
    readonly include: readonly string[];
    readonly exclude: readonly string[];
  };
  readonly constraints: readonly string[];
  readonly allowed_side_effects: readonly SideEffect[];
  readonly requested_by: {
    readonly type: "human" | "system" | "schedule";
    readonly id: string;
  };
  readonly created_at: string;
  readonly expected_artifacts: readonly ExpectedArtifact[];
}

interface ExpectedArtifact {
  readonly artifact_type: "document" | "decision" | "plan" | "patch" | "report" | "trace" | "manifest";
  readonly title: string;
}

interface CapabilityPlan {
  readonly plan_version: Version;
  readonly plan_id: string;
  readonly task_id: string;
  readonly trace_id: string;
  readonly status: "ready";
  readonly capabilities: readonly PlannedCapability[];
}

interface PlannedCapability {
  readonly step_id: string;
  readonly capability_id: string;
  readonly capability_version: Version;
  readonly purpose: string;
  readonly input_refs: readonly VersionedRef[];
  readonly expected_outputs: readonly string[];
  readonly expected_artifacts: readonly ExpectedArtifact[];
  readonly depends_on: readonly string[];
  readonly success_criteria: readonly string[];
}

interface Command {
  readonly command_version: Version;
  readonly command_id: string;
  readonly command_type: CommandType;
  readonly trace_id: string;
  readonly task_id: string;
  readonly requested_at: string;
  readonly requested_by: {
    readonly kind: "runtime" | "state_machine" | "policy" | "registry" | "executor" | "human" | "system";
    readonly id: string;
  };
  readonly target: {
    readonly kind: "execution" | "task" | "plan" | "capability" | "artifact" | "result";
    readonly id: string;
  };
  readonly expected_state: {
    readonly state: ExecutionState;
    readonly version: DraftVersion;
  };
  readonly causality: {
    readonly caused_by_event_id: string | null;
    readonly caused_by_command_id: string | null;
  };
  readonly input_refs: readonly VersionedRef[];
  readonly effect_request: readonly EffectRequest[];
  readonly intent: {
    readonly action: string;
    readonly reason: string;
  };
  readonly idempotency: {
    readonly key: string;
    readonly scope: "trace" | "task" | "target";
  };
}

interface EffectRequest {
  readonly effect_type: EffectType;
  readonly effect_version: Version;
  readonly side_effects: readonly SideEffect[];
  readonly input_refs: readonly VersionedRef[];
}

interface RuntimeContext {
  readonly runtime_context_version: Version;
  readonly runtime_context_id: string;
  readonly trace_id: string;
  readonly task_id: string;
  readonly created_at: string;
  readonly state_machine: {
    readonly id: "execution_state_machine";
    readonly version: DraftVersion;
  };
  readonly current_state: {
    readonly state: ExecutionState;
    readonly version: DraftVersion;
  };
  readonly command_ref: {
    readonly command_id: string;
    readonly command_version: Version;
  };
  readonly event_stream_ref: {
    readonly last_event_id: string | null;
    readonly last_sequence_number: number;
  };
  readonly input_refs: readonly VersionedRef[];
  readonly determinism: {
    readonly logical_time: string;
    readonly id_namespace: string;
    readonly ordering_rule: string;
  };
}

interface Effect {
  readonly effect_version: Version;
  readonly effect_id: string;
  readonly effect_type: EffectType;
  readonly trace_id: string;
  readonly task_id: string;
  readonly declared_at: string;
  readonly declared_by: {
    readonly kind: "state_machine";
    readonly id: "execution_state_machine";
  };
  readonly command_ref: {
    readonly command_id: string;
    readonly command_version: Version;
  };
  readonly causality: {
    readonly caused_by_event_id: string | null;
    readonly state_transition: {
      readonly from: ExecutionState;
      readonly to: ExecutionState;
    };
  };
  readonly input_refs: readonly VersionedRef[];
  readonly side_effects: readonly SideEffect[];
  readonly idempotency: {
    readonly key: string;
    readonly scope: "trace" | "task" | "command" | "effect_type";
  };
  readonly expected_evidence: readonly string[];
}

interface WorkflowEvent {
  readonly event_version: Version;
  readonly event_id: string;
  readonly event_type: EventType;
  readonly occurred_at: string;
  readonly recorded_at: string;
  readonly trace_id: string;
  readonly task_id: string;
  readonly sequence: {
    readonly number: number;
    readonly previous_event_id: string | null;
  };
  readonly producer: {
    readonly component: "runtime" | "state_machine" | "policy" | "registry" | "capability" | "artifact_generation";
    readonly version: DraftVersion;
  };
  readonly subject: {
    readonly kind: "task" | "plan" | "policy" | "registry" | "executor_selection" | "capability" | "artifact" | "result";
    readonly id: string;
  };
  readonly decision: {
    readonly kind: "none" | "state_transition" | "selection" | "registry_lookup" | "policy_outcome" | "validation" | "result";
    readonly outcome: "accepted" | "allowed" | "allowed_with_constraints" | "denied" | "selected" | "no_candidate" | "blocked" | "succeeded" | "failed";
  };
  readonly input_refs: readonly VersionedRef[];
  readonly summary: string;
  readonly state_transition: {
    readonly from: ExecutionState;
    readonly to: ExecutionState;
  };
  readonly artifact_refs: readonly ArtifactRef[];
  readonly registry_ref?: RegistryEventRef;
  readonly selection_ref?: ExecutorSelectionEventRef;
}

interface RegistryEventRef {
  readonly registry_snapshot_id: string;
  readonly registry_snapshot_version: Version;
  readonly registry_snapshot_schema_version: Version;
  readonly registry_source_ref: RegistrySourceRef;
  readonly registry_snapshot_digest: string;
  readonly snapshot_scope: SnapshotScope;
  readonly lookup_criteria: LookupCriteria;
  readonly capability_id: string;
  readonly capability_version: Version;
  readonly considered_candidates: readonly CandidateRef[];
  readonly discarded_candidates: readonly CandidateDiscardRef[];
  readonly eligible_candidate_count: number;
}

interface CandidateRef {
  readonly candidate_id: string;
  readonly candidate_metadata_version: Version;
  readonly registry_record_id?: string;
  readonly registry_record_version?: Version;
}

interface CandidateDiscardRef extends CandidateRef {
  readonly reason: string;
  readonly failed_criterion?: string;
  readonly evidence_ref?: VersionedRef;
}

interface ArtifactRef {
  readonly artifact_id: string;
  readonly artifact_version: Version;
  readonly artifact_type: "document" | "decision" | "plan" | "patch" | "report" | "trace" | "manifest";
  readonly status: "draft" | "proposed" | "final" | "superseded" | "rejected";
}

interface ArtifactEnvelope extends ArtifactRef {
  readonly title: string;
  readonly source: {
    readonly task_id: string;
    readonly capability_id: string;
    readonly executor_id: string;
    readonly trace_id: string;
  };
  readonly content: {
    readonly format: "markdown" | "json" | "patch" | "text";
    readonly body: string;
  };
  readonly provenance: {
    readonly created_at: string;
    readonly created_by: "runtime" | "executor" | "human";
  };
  readonly validation: {
    readonly status: "unchecked" | "valid" | "invalid";
    readonly criteria: readonly string[];
  };
}

interface ExecutionResult {
  readonly result_version: Version;
  readonly result_id: string;
  readonly task_id: string;
  readonly plan_id: string;
  readonly trace_id: string;
  readonly status: "succeeded" | "blocked" | "failed";
  readonly summary: string;
  readonly capability_results: readonly CapabilityResult[];
  readonly artifacts: readonly ArtifactRef[];
  readonly event_refs: readonly EventRef[];
  readonly decision_refs: readonly DecisionRef[];
  readonly completed_at: string;
  readonly pending?: readonly string[];
  readonly errors?: readonly ResultError[];
  readonly policy_outcomes?: readonly PolicyOutcomeRef[];
}

interface ResultError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

interface PolicyOutcomeRef {
  readonly decision_id: string;
  readonly decision_version: Version;
  readonly outcome: "allow" | "deny" | "requires_approval" | "allow_with_constraints";
  readonly constraint_set_ref?: PolicyConstraintSetRef;
}

interface CapabilityResult {
  readonly step_id: string;
  readonly capability_id: string;
  readonly status: "succeeded" | "blocked" | "failed";
  readonly summary: string;
}

interface EventRef {
  readonly event_id: string;
  readonly event_version: Version;
  readonly event_type: EventType;
}

interface DecisionRef {
  readonly kind: "policy" | "registry_lookup" | "executor_selection" | "artifact_validation" | "result";
  readonly id: string;
  readonly version: string;
}

interface PolicyConstraintSetRef {
  readonly constraint_set_id: string;
  readonly constraint_set_version: Version;
  readonly constraint_set_schema_version: Version;
  readonly constraint_set_digest: string;
}

interface PolicyConstraintSet extends PolicyConstraintSetRef {
  readonly provenance: {
    readonly source_id: string;
    readonly source_version: Version;
    readonly source_digest: string;
  };
  readonly operator_catalog: {
    readonly catalog_id: "policy_constraint_operator_catalog.walking_skeleton";
    readonly catalog_version: Version;
  };
  readonly policy_decision_ref: {
    readonly decision_id: string;
    readonly decision_version: Version;
  };
  readonly policy_ref: {
    readonly policy_id: "walking_skeleton.policy";
    readonly policy_version: Version;
  };
  readonly subject_ref: VersionedRef;
  readonly input_refs: readonly VersionedRef[];
  readonly constraints: readonly PolicyConstraint[];
  readonly composition: {
    readonly operator: "all";
    readonly children: readonly PolicyConstraintChild[];
  };
  readonly canonicalization: {
    readonly object_key_order: "lexicographic";
    readonly set_order: "canonical_identity";
  };
}

interface PolicyConstraintChild {
  readonly constraint_ref: {
    readonly constraint_id: string;
    readonly constraint_version: Version;
  };
}

interface PolicyConstraint {
  readonly constraint_id: string;
  readonly constraint_version: Version;
  readonly constraint_type: "registry_candidate";
  readonly enforcement_phase: "selection_eligibility";
  readonly target: {
    readonly kind: "registry_record";
    readonly path: "eligibility_metadata.risk_level";
  };
  readonly operator: {
    readonly operator_id: "eq";
    readonly operator_version: Version;
  };
  readonly value_type: "enum_token";
  readonly value: RiskLevel;
  readonly source_ref: VersionedRef;
  readonly failure_code: "policy_constraint_failed";
}

interface PolicyDecision {
  readonly decision_version: Version;
  readonly decision_id: string;
  readonly policy_id: "walking_skeleton.policy";
  readonly policy_version: Version;
  readonly outcome: "allow" | "deny" | "allow_with_constraints";
  readonly reason: string;
  readonly recoverable: boolean;
  readonly required_input: VersionedRef | null;
  readonly constraint_set?: PolicyConstraintSet;
}

interface RegistrySourceRef {
  readonly source_id: "registry_source.walking_skeleton.static";
  readonly source_version: Version;
  readonly source_digest: string;
}

interface RegistryLookup {
  readonly lookup_id: string;
  readonly lookup_version: Version;
  readonly decision_id: string;
  readonly decision_version: Version;
  readonly registry_snapshot_id: string;
  readonly registry_snapshot_version: Version;
  readonly registry_snapshot_schema_version: Version;
  readonly registry_source_ref: RegistrySourceRef;
  readonly registry_snapshot_digest: string;
  readonly snapshot_scope: SnapshotScope;
  readonly lookup_criteria: LookupCriteria;
  readonly capability_id: string;
  readonly capability_version: Version;
  readonly considered_candidates: readonly ExecutorCandidate[];
  readonly candidates: readonly ExecutorCandidate[];
  readonly discarded_candidates: readonly CandidateDiscardRef[];
}

interface SnapshotScope {
  readonly scope_type: "lookup_scoped";
  readonly description: string;
}

interface LookupCriteria {
  readonly capability_id: string;
  readonly capability_version: Version;
  readonly include_inactive: boolean;
  readonly candidate_types: readonly ["execution_candidate"];
  readonly required_permissions: readonly ["workspace.read"];
  readonly required_side_effects: readonly ["read"];
  readonly policy_constraint_refs: readonly VersionedRef[];
}

interface ExecutorCandidate {
  readonly executor_id: string;
  readonly metadata_version: Version;
  readonly registry_record_id: string;
  readonly registry_record_version: Version;
  readonly capability_id: string;
  readonly capability_version: Version;
  readonly status: CandidateStatus;
  readonly declared_permissions: readonly ["workspace.read"];
  readonly declared_side_effects: readonly ["read"];
  readonly eligibility_metadata: {
    readonly required_adapters: readonly string[];
    readonly risk_level: RiskLevel;
    readonly compatibility_status: CompatibilityStatus;
  };
  readonly ranking_metadata: {
    readonly declared_priority: {
      readonly value: number;
      readonly governed_by: "registry_configuration";
      readonly governed_version: Version;
      readonly validated_by_registry: true;
    };
  };
  readonly provenance: {
    readonly source_id: string;
    readonly source_version: Version;
    readonly source_record_id: string;
  };
}

interface ExecutorSelection {
  readonly selection_id: string;
  readonly selection_version: Version;
  readonly selected: ExecutorCandidate;
  readonly considered: readonly ExecutorCandidate[];
  readonly eligibility: readonly CandidateEligibility[];
  readonly ineligible: readonly CandidateIneligible[];
  readonly policy_constraint_results: readonly PolicyConstraintEvaluation[];
  readonly constraint_discarded_candidates: readonly PolicyConstraintDiscard[];
  readonly ranked_eligible_candidates: readonly RankedCandidate[];
  readonly alternatives_not_selected: readonly NonSelectedAlternative[];
  readonly selection_rule: SelectionRule;
  readonly tie_breaker_applied: boolean;
  readonly ranking_key_equalities: readonly RankingKeyEquality[];
  readonly tie_breaker_values: readonly TieBreakerValue[];
  readonly discarded: readonly string[];
  readonly criterion_version: Version;
}

interface SelectionRule {
  readonly selection_rule_id: "executor_selection.walking_skeleton.default";
  readonly selection_rule_version: Version;
  readonly ranking_keys: readonly RankingKey[];
  readonly final_tie_breaker: {
    readonly key: "canonical_candidate_identity";
    readonly fields: readonly ["executor_id", "metadata_version", "registry_record_id", "registry_record_version"];
    readonly direction: "ascending";
  };
}

interface RankingKey {
  readonly key: "declared_priority";
  readonly source: "registry_candidate_metadata";
  readonly direction: "ascending";
  readonly missing_value_behavior: "blocked";
}

interface CandidateEligibility extends CandidateRef {
  readonly eligible: boolean;
  readonly reason: EligibilityReason;
  readonly failed_criterion?: "frozen_status_active_required";
  readonly evidence_ref?: VersionedRef;
}

interface CandidateIneligible extends CandidateRef {
  readonly eligible: false;
  readonly reason: "frozen_status_not_active";
  readonly failed_criterion: "frozen_status_active_required";
  readonly evidence_ref: VersionedRef;
}

interface PolicyConstraintEvaluation extends CandidateRef {
  readonly constraint_set_ref: PolicyConstraintSetRef;
  readonly constraint_ref: {
    readonly constraint_id: string;
    readonly constraint_version: Version;
  };
  readonly target: PolicyConstraint["target"];
  readonly operator: PolicyConstraint["operator"];
  readonly value_type: PolicyConstraint["value_type"];
  readonly expected_value: PolicyConstraint["value"];
  readonly observed_value: RiskLevel;
  readonly observed_value_ref: VersionedRef;
  readonly outcome: PolicyConstraintOutcome;
  readonly reason: "policy_constraint_satisfied" | "policy_constraint_unsatisfied";
}

interface PolicyConstraintDiscard extends CandidateRef {
  readonly reason: "policy_constraint_unsatisfied";
  readonly failure_code: "policy_constraint_failed";
  readonly constraint_set_ref: PolicyConstraintSetRef;
  readonly constraint_ref: {
    readonly constraint_id: string;
    readonly constraint_version: Version;
  };
  readonly evidence: PolicyConstraintEvaluation;
}

interface RankedCandidate extends CandidateRef {
  readonly rank: number;
  readonly ranking_factors: readonly RankingFactor[];
  readonly selection_status: "selected" | "eligible_not_selected";
  readonly non_selection_reason?: "ranked_lower" | "tie_breaker_ranked_lower";
}

interface RankingFactor {
  readonly key: "declared_priority";
  readonly value: number;
  readonly value_ref: VersionedRef;
  readonly governed_by: "registry_configuration";
  readonly governed_version: Version;
}

interface NonSelectedAlternative extends CandidateRef {
  readonly rank: number;
  readonly reason: "ranked_lower" | "tie_breaker_ranked_lower";
  readonly selection_rule_id: SelectionRule["selection_rule_id"];
  readonly selection_rule_version: Version;
  readonly ranking_factors: readonly RankingFactor[];
}

interface RankingKeyEquality {
  readonly key: "declared_priority";
  readonly value: number;
  readonly candidate_ids: readonly string[];
  readonly evidence_refs: readonly VersionedRef[];
}

interface TieBreakerValue extends CandidateRef {
  readonly tuple: readonly [string, Version, string, Version];
}

interface ExecutorSelectionEventRef {
  readonly selection_id: string;
  readonly selection_version: Version;
  readonly task_ref: VersionedRef;
  readonly plan_ref: VersionedRef;
  readonly capability_id: string;
  readonly capability_version: Version;
  readonly registry_snapshot_id: string;
  readonly registry_snapshot_version: Version;
  readonly registry_snapshot_schema_version: Version;
  readonly registry_source_ref: RegistrySourceRef;
  readonly registry_snapshot_digest: string;
  readonly snapshot_scope: SnapshotScope;
  readonly lookup_criteria: LookupCriteria;
  readonly policy_decision_id: string;
  readonly policy_decision_version: Version;
  readonly policy_constraints: readonly PolicyConstraintSetRef[];
  readonly constraint_set_ref?: PolicyConstraintSetRef;
  readonly selection_rule_id: SelectionRule["selection_rule_id"];
  readonly selection_rule_version: Version;
  readonly considered_candidates: readonly CandidateRef[];
  readonly eligibility: readonly CandidateEligibility[];
  readonly ineligible_candidates: readonly CandidateIneligible[];
  readonly policy_constraint_results: readonly PolicyConstraintEvaluation[];
  readonly constraint_discarded_candidates: readonly PolicyConstraintDiscard[];
  readonly ranked_eligible_candidates: readonly RankedCandidate[];
  readonly selected_candidate: CandidateRef;
  readonly alternatives_not_selected: readonly NonSelectedAlternative[];
  readonly tie_breaker_applied: boolean;
  readonly tie_breaker: SelectionRule["final_tie_breaker"];
  readonly ranking_key_equalities: readonly RankingKeyEquality[];
  readonly tie_breaker_values: readonly TieBreakerValue[];
}

interface ExecutorOutput {
  readonly status: "succeeded";
  readonly summary: string;
  readonly artifact: ArtifactEnvelope;
}

interface ArtifactValidation {
  readonly artifact: ArtifactEnvelope;
  readonly status: "valid";
}

interface StateMachineResult {
  readonly events: readonly WorkflowEvent[];
  readonly effects: readonly Effect[];
}

type WalkingSkeletonScenario =
  | "policy_allow"
  | "policy_allow_with_constraints"
  | "policy_deny_correctable"
  | "policy_deny_terminal"
  | "registry_no_candidate"
  | "registry_multiple_eligible"
  | "registry_mixed_eligibility"
  | "registry_equal_rank_tiebreaker";

interface WalkingSkeletonRun {
  readonly scenario: WalkingSkeletonScenario;
  readonly task: TaskEnvelope;
  readonly plan: CapabilityPlan;
  readonly commands: readonly Command[];
  readonly runtime_contexts: readonly RuntimeContext[];
  readonly registry_lookups: readonly RegistryLookup[];
  readonly effects: readonly Effect[];
  readonly events: readonly WorkflowEvent[];
  readonly artifacts: readonly ArtifactEnvelope[];
  readonly result: ExecutionResult;
  readonly replay_state: ExecutionState;
  readonly fingerprint: string;
}

interface ScenarioVerification {
  readonly scenario: WalkingSkeletonScenario;
  readonly passed: boolean;
  readonly deterministic: boolean;
  readonly status_ok: boolean;
  readonly event_sequence_ok: boolean;
  readonly replay_ok: boolean;
  readonly forbidden_events_absent: boolean;
  readonly executor_events_absent: boolean;
  readonly executor_effect_absent: boolean;
  readonly attempt_events_absent: boolean;
  readonly output_artifacts_absent: boolean;
  readonly effect_request_correspondence_ok: boolean;
  readonly outcome_contract_ok: boolean;
  readonly first_fingerprint: string;
  readonly second_fingerprint: string;
  readonly event_sequence: readonly EventType[];
  readonly replay_state: ExecutionState;
  readonly final_status: ExecutionResult["status"];
}

interface WalkingSkeletonDemo {
  readonly passed: boolean;
  readonly allow: ScenarioVerification;
  readonly allow_with_constraints: ScenarioVerification;
  readonly policy_constraints_order_independence: PolicyConstraintsOrderIndependenceVerification;
  readonly deny: ScenarioVerification;
  readonly deny_terminal: ScenarioVerification;
  readonly registry_no_candidate: ScenarioVerification;
  readonly registry_multiple_eligible: ScenarioVerification;
  readonly registry_order_independence: RegistryOrderIndependenceVerification;
  readonly registry_mixed_eligibility: ScenarioVerification;
  readonly registry_mixed_order_independence: MixedEligibilityOrderIndependenceVerification;
  readonly registry_equal_rank_tiebreaker: ScenarioVerification;
  readonly registry_tiebreaker_order_independence: TieBreakerOrderIndependenceVerification;
  readonly registry_snapshot_digest_rules: RegistrySnapshotDigestVerification;
}

interface RegistrySnapshotDigestVerification {
  readonly passed: boolean;
  readonly same_digest_for_inverted_order: boolean;
  readonly changed_source_ref_changes_digest: boolean;
  readonly changed_digestible_field_changes_digest: boolean;
  readonly digest_input_excludes_snapshot_digest: boolean;
  readonly forward_digest: string;
  readonly reversed_digest: string;
}

interface RegistryOrderIndependenceVerification {
  readonly passed: boolean;
  readonly forward_fingerprint: string;
  readonly reversed_fingerprint: string;
  readonly same_fingerprint: boolean;
  readonly same_selected_executor: boolean;
  readonly same_ranking: boolean;
  readonly same_considered_candidates: boolean;
  readonly same_non_selected_alternative: boolean;
  readonly same_event_sequence: boolean;
  readonly same_artifact: boolean;
  readonly same_result: boolean;
  readonly replay_completed: boolean;
  readonly selected_executor_id: string;
  readonly ranking: readonly RankedCandidate[];
}

interface MixedEligibilityOrderIndependenceVerification {
  readonly passed: boolean;
  readonly forward_fingerprint: string;
  readonly reversed_fingerprint: string;
  readonly same_fingerprint: boolean;
  readonly same_selected_executor: boolean;
  readonly same_ranking: boolean;
  readonly same_considered_candidates: boolean;
  readonly same_ineligible_candidate: boolean;
  readonly same_discard_evidence: boolean;
  readonly same_event_sequence: boolean;
  readonly same_artifact: boolean;
  readonly same_result: boolean;
  readonly replay_completed: boolean;
  readonly ineligible_not_ranked: boolean;
  readonly ineligible_not_invoked: boolean;
  readonly executor_invoke_effects_forward: number;
  readonly executor_invoke_effects_reversed: number;
  readonly selected_executor_id: string;
  readonly ineligible_candidate_id: string;
  readonly ranking: readonly RankedCandidate[];
}

interface TieBreakerOrderIndependenceVerification {
  readonly passed: boolean;
  readonly forward_fingerprint: string;
  readonly reversed_fingerprint: string;
  readonly same_fingerprint: boolean;
  readonly same_selected_executor: boolean;
  readonly same_ranking: boolean;
  readonly same_considered_candidates: boolean;
  readonly same_eligibility: boolean;
  readonly same_ranking_key_equalities: boolean;
  readonly same_tie_breaker_values: boolean;
  readonly same_non_selected_alternative: boolean;
  readonly same_event_sequence: boolean;
  readonly same_artifact: boolean;
  readonly same_result: boolean;
  readonly replay_completed: boolean;
  readonly tie_breaker_applied: boolean;
  readonly no_candidates_ineligible: boolean;
  readonly executor_invoke_effects_forward: number;
  readonly executor_invoke_effects_reversed: number;
  readonly selected_executor_id: string;
  readonly alternative_executor_id: string;
  readonly alternative_reason: NonSelectedAlternative["reason"];
  readonly ranking: readonly RankedCandidate[];
  readonly tie_breaker_values: readonly TieBreakerValue[];
}

interface PolicyConstraintsOrderIndependenceVerification {
  readonly passed: boolean;
  readonly forward_fingerprint: string;
  readonly reversed_fingerprint: string;
  readonly same_fingerprint: boolean;
  readonly same_constraint_set_digest: boolean;
  readonly same_selected_executor: boolean;
  readonly same_considered_candidates: boolean;
  readonly same_intrinsic_eligibility: boolean;
  readonly same_policy_constraint_results: boolean;
  readonly same_constraint_discard: boolean;
  readonly same_ranking: boolean;
  readonly same_event_sequence: boolean;
  readonly same_artifact: boolean;
  readonly same_result: boolean;
  readonly replay_completed: boolean;
  readonly registry_did_not_hide_candidate: boolean;
  readonly better_priority_candidate_not_ranked: boolean;
  readonly executor_invoke_effects_forward: number;
  readonly executor_invoke_effects_reversed: number;
  readonly selected_executor_id: string;
  readonly discarded_candidate_id: string;
  readonly constraint_set_digest: string;
  readonly ranking: readonly RankedCandidate[];
}

interface WorkState {
  readonly scenario: WalkingSkeletonScenario;
  readonly registryEnumeration: RegistryEnumerationOrder;
  readonly task: TaskEnvelope;
  readonly plan: CapabilityPlan;
  readonly policyDecisions: PolicyDecision[];
  readonly registryLookups: RegistryLookup[];
  readonly executorSelections: ExecutorSelection[];
  readonly commands: Command[];
  readonly runtimeContexts: RuntimeContext[];
  readonly effects: Effect[];
  readonly events: WorkflowEvent[];
  readonly artifacts: ArtifactEnvelope[];
}

type Evidence =
  | { readonly kind: "none" }
  | { readonly kind: "plan"; readonly plan: CapabilityPlan }
  | { readonly kind: "policy"; readonly decision: PolicyDecision }
  | { readonly kind: "registry"; readonly lookup: RegistryLookup }
  | { readonly kind: "selection"; readonly selection: ExecutorSelection }
  | { readonly kind: "executor_output"; readonly output: ExecutorOutput }
  | { readonly kind: "artifact_validation"; readonly validation: ArtifactValidation }
  | { readonly kind: "result"; readonly result: ExecutionResult };

export function createWalkingSkeletonTask(scenario: WalkingSkeletonScenario = "policy_allow"): TaskEnvelope {
  const correctableDeny = scenario === "policy_deny_correctable";
  const terminalDeny = scenario === "policy_deny_terminal";
  const allowWithConstraints = scenario === "policy_allow_with_constraints";
  const registryNoCandidate = scenario === "registry_no_candidate";
  const registryMultipleEligible = scenario === "registry_multiple_eligible";
  const registryMixedEligibility = scenario === "registry_mixed_eligibility";
  const registryEqualRankTieBreaker = scenario === "registry_equal_rank_tiebreaker";
  const denied = correctableDeny || terminalDeny;
  return {
    task_version: "0.1.0",
    task_id: taskIdForScenario(scenario),
    trace_id: traceIdForScenario(scenario),
    intent: {
      summary: registryNoCandidate
        ? "Validate Registry no candidate blocked flow"
        : allowWithConstraints
        ? "Validate policy constraints before ranking"
        : registryMultipleEligible
        ? "Validate deterministic selection between two eligible executors"
        : registryMixedEligibility
        ? "Validate deterministic eligibility before ranking"
        : registryEqualRankTieBreaker
        ? "Validate deterministic canonical tie-breaker selection"
        : terminalDeny
        ? "Validate terminal policy deny flow"
        : correctableDeny
          ? "Validate correctable policy deny flow"
          : "Validate Workflow V2 walking skeleton",
      raw: registryNoCandidate
        ? "Run a deterministic policy allow followed by a Registry lookup with no eligible candidate and close as blocked."
        : allowWithConstraints
        ? "Run a deterministic policy allow with constraints followed by constraint-filtered executor selection and close as succeeded."
        : registryMultipleEligible
        ? "Run a deterministic policy allow followed by selection between two eligible executors and close as succeeded."
        : registryMixedEligibility
        ? "Run a deterministic policy allow followed by one ineligible higher-priority candidate, one eligible lower-priority candidate and close as succeeded."
        : registryEqualRankTieBreaker
        ? "Run a deterministic policy allow followed by two equal-rank eligible candidates and close as succeeded by canonical tie-breaker."
        : denied
        ? terminalDeny
          ? "Run a deterministic terminal policy deny before registry lookup and close as failed."
          : "Run a deterministic policy deny before registry lookup and close as blocked."
        : "Run one deterministic capability from TaskEnvelope to ExecutionResult."
    },
    scope: {
      include: ["kernel/runtime/walking-skeleton"],
      exclude: ["database", "queue", "api", "cli", "sdk", "distributed_infra"]
    },
    constraints: registryNoCandidate
      ? [
        "one capability",
        "policy allow fixture",
        "registry no candidate fixture",
        "no executor selection",
        "no executor invocation",
        "no output artifacts"
      ]
      : allowWithConstraints
      ? [
        "one capability",
        "policy allow_with_constraints fixture",
        "two discovered executor candidates",
        "policy constraint evaluated by kernel before ranking",
        "invoke selected constraint-satisfying executor only"
      ]
      : registryMultipleEligible
      ? [
        "one capability",
        "policy allow fixture",
        "two eligible executor candidates",
        "deterministic canonical ranking",
        "invoke selected executor only"
      ]
      : registryMixedEligibility
      ? [
        "one capability",
        "policy allow fixture",
        "two considered executor candidates",
        "eligibility before ranking",
        "inactive candidate discarded before ranking",
        "invoke selected eligible executor only"
      ]
      : registryEqualRankTieBreaker
      ? [
        "one capability",
        "policy allow fixture",
        "two equal-rank eligible executor candidates",
        "canonical tie-breaker applied",
        "invoke selected executor only"
      ]
      : denied
      ? [
        "one capability",
        terminalDeny ? "policy terminal deny fixture" : "policy deny fixture",
        "no registry lookup",
        "no executor invocation",
        "no output artifacts"
      ]
      : ["one capability", "one executor", "deterministic stubs only"],
    allowed_side_effects: ["read", "write"],
    requested_by: {
      type: "human",
      id: "eduardo"
    },
    created_at: "2026-07-11T12:00:00.000Z",
    expected_artifacts: [
      {
        artifact_type: "report",
        title: "Walking Skeleton Result"
      }
    ]
  };
}

function taskIdForScenario(scenario: WalkingSkeletonScenario): string {
  switch (scenario) {
    case "policy_allow":
      return "task_walk_001";
    case "policy_allow_with_constraints":
      return "task_walk_policy_allow_with_constraints_001";
    case "policy_deny_correctable":
      return "task_walk_policy_deny_001";
    case "policy_deny_terminal":
      return "task_walk_policy_deny_terminal_001";
    case "registry_no_candidate":
      return "task_walk_registry_no_candidate_001";
    case "registry_multiple_eligible":
      return "task_walk_registry_multiple_eligible_001";
    case "registry_mixed_eligibility":
      return "task_walk_registry_mixed_eligibility_001";
    case "registry_equal_rank_tiebreaker":
      return "task_walk_registry_equal_rank_tiebreaker_001";
  }
}

function traceIdForScenario(scenario: WalkingSkeletonScenario): string {
  switch (scenario) {
    case "policy_allow":
      return "trace_walk_001";
    case "policy_allow_with_constraints":
      return "trace_walk_policy_allow_with_constraints_001";
    case "policy_deny_correctable":
      return "trace_walk_policy_deny_001";
    case "policy_deny_terminal":
      return "trace_walk_policy_deny_terminal_001";
    case "registry_no_candidate":
      return "trace_walk_registry_no_candidate_001";
    case "registry_multiple_eligible":
      return "trace_walk_registry_multiple_eligible_001";
    case "registry_mixed_eligibility":
      return "trace_walk_registry_mixed_eligibility_001";
    case "registry_equal_rank_tiebreaker":
      return "trace_walk_registry_equal_rank_tiebreaker_001";
  }
}

export function runWalkingSkeleton(
  scenario: WalkingSkeletonScenario = "policy_allow",
  task: TaskEnvelope = createWalkingSkeletonTask(scenario),
  registryEnumeration: RegistryEnumerationOrder = "declared"
): WalkingSkeletonRun {
  const plan = createCapabilityPlan(task);
  const state: WorkState = {
    scenario,
    registryEnumeration,
    task,
    plan,
    policyDecisions: [],
    registryLookups: [],
    executorSelections: [],
    commands: [],
    runtimeContexts: [],
    effects: [],
    events: [],
    artifacts: []
  };
  step(state, "execution.task.accept", { kind: "none" });
  step(state, "execution.plan.resolve", { kind: "plan", plan });
  const policy = runPolicyEffect(requireEffect(state, "policy.evaluate"), state, scenario);
  state.policyDecisions.push(policy);
  step(state, "execution.policy.apply", { kind: "policy", decision: policy });
  if (policy.outcome === "deny") {
    const resultDraft = runResultEffect(requireEffect(state, "result.consolidate"), state);
    step(state, "execution.result.consolidate", { kind: "result", result: resultDraft });
    const result = consolidateResult(state);
    return finalizeRun(state, result);
  }
  const registry = runRegistryEffect(requireEffect(state, "registry.lookup"), state);
  state.registryLookups.push(registry);
  step(state, "execution.registry.apply", { kind: "registry", lookup: registry });
  if (registry.candidates.length === 0) {
    const resultDraft = runResultEffect(requireEffect(state, "result.consolidate"), state);
    step(state, "execution.result.consolidate", { kind: "result", result: resultDraft });
    const result = consolidateResult(state);
    return finalizeRun(state, result);
  }
  const selection = selectExecutor(registry, policy);
  state.executorSelections.push(selection);
  step(state, "execution.executor.select", { kind: "selection", selection });
  const executorOutput = runExecutorEffect(requireEffect(state, "executor.invoke"), state);
  state.artifacts.push(executorOutput.artifact);
  step(state, "execution.capability.apply", { kind: "executor_output", output: executorOutput });
  const validation = runArtifactEffect(requireEffect(state, "artifact.validate"), state);
  step(state, "execution.artifact.apply", { kind: "artifact_validation", validation });
  const resultDraft = runResultEffect(requireEffect(state, "result.consolidate"), state);
  step(state, "execution.result.consolidate", { kind: "result", result: resultDraft });
  const result = consolidateResult(state);
  return finalizeRun(state, result);
}

export function runWalkingSkeletonDemo(): WalkingSkeletonDemo {
  const allow = verifyScenario("policy_allow");
  const allowWithConstraints = verifyScenario("policy_allow_with_constraints");
  const policyConstraintsOrderIndependence = verifyPolicyConstraintsOrderIndependence();
  const deny = verifyScenario("policy_deny_correctable");
  const denyTerminal = verifyScenario("policy_deny_terminal");
  const registryNoCandidate = verifyScenario("registry_no_candidate");
  const registryMultipleEligible = verifyScenario("registry_multiple_eligible");
  const registryOrderIndependence = verifyRegistryMultipleEligibleOrderIndependence();
  const registryMixedEligibility = verifyScenario("registry_mixed_eligibility");
  const registryMixedOrderIndependence = verifyRegistryMixedEligibilityOrderIndependence();
  const registryEqualRankTieBreaker = verifyScenario("registry_equal_rank_tiebreaker");
  const registryTieBreakerOrderIndependence = verifyRegistryTieBreakerOrderIndependence();
  const registrySnapshotDigestRules = verifyRegistrySnapshotDigestRules();
  return {
    passed: allow.passed
      && allowWithConstraints.passed
      && policyConstraintsOrderIndependence.passed
      && deny.passed
      && denyTerminal.passed
      && registryNoCandidate.passed
      && registryMultipleEligible.passed
      && registryOrderIndependence.passed
      && registryMixedEligibility.passed
      && registryMixedOrderIndependence.passed
      && registryEqualRankTieBreaker.passed
      && registryTieBreakerOrderIndependence.passed
      && registrySnapshotDigestRules.passed,
    allow,
    allow_with_constraints: allowWithConstraints,
    policy_constraints_order_independence: policyConstraintsOrderIndependence,
    deny,
    deny_terminal: denyTerminal,
    registry_no_candidate: registryNoCandidate,
    registry_multiple_eligible: registryMultipleEligible,
    registry_order_independence: registryOrderIndependence,
    registry_mixed_eligibility: registryMixedEligibility,
    registry_mixed_order_independence: registryMixedOrderIndependence,
    registry_equal_rank_tiebreaker: registryEqualRankTieBreaker,
    registry_tiebreaker_order_independence: registryTieBreakerOrderIndependence,
    registry_snapshot_digest_rules: registrySnapshotDigestRules
  };
}

export function verifyWalkingSkeletonScenarios(): WalkingSkeletonDemo {
  return runWalkingSkeletonDemo();
}

export function verifyRegistryMultipleEligibleOrderIndependence(): RegistryOrderIndependenceVerification {
  const task = createWalkingSkeletonTask("registry_multiple_eligible");
  const forward = runWalkingSkeleton("registry_multiple_eligible", task, "declared");
  const reversed = runWalkingSkeleton("registry_multiple_eligible", task, "reversed");
  const forwardSelection = requireRunSelection(forward);
  const reversedSelection = requireRunSelection(reversed);
  const sameFingerprint = forward.fingerprint === reversed.fingerprint;
  const sameRanking = canonicalStringify(forwardSelection.ranked_eligible_candidates)
    === canonicalStringify(reversedSelection.ranked_eligible_candidates);
  const sameConsidered = canonicalStringify(forwardSelection.considered_candidates)
    === canonicalStringify(reversedSelection.considered_candidates);
  const sameAlternative = canonicalStringify(forwardSelection.alternatives_not_selected)
    === canonicalStringify(reversedSelection.alternatives_not_selected);
  const sameArtifact = canonicalStringify(forward.artifacts) === canonicalStringify(reversed.artifacts);
  const sameResult = canonicalStringify(forward.result) === canonicalStringify(reversed.result);
  const sameEventSequence = sameSequence(
    forward.events.map((event) => event.event_type),
    reversed.events.map((event) => event.event_type)
  );
  const sameSelectedExecutor = forwardSelection.selected_candidate.candidate_id
    === reversedSelection.selected_candidate.candidate_id;
  const replayCompleted = forward.replay_state === "completed" && reversed.replay_state === "completed";
  return {
    passed: sameFingerprint
      && sameSelectedExecutor
      && sameRanking
      && sameConsidered
      && sameAlternative
      && sameEventSequence
      && sameArtifact
      && sameResult
      && replayCompleted,
    forward_fingerprint: forward.fingerprint,
    reversed_fingerprint: reversed.fingerprint,
    same_fingerprint: sameFingerprint,
    same_selected_executor: sameSelectedExecutor,
    same_ranking: sameRanking,
    same_considered_candidates: sameConsidered,
    same_non_selected_alternative: sameAlternative,
    same_event_sequence: sameEventSequence,
    same_artifact: sameArtifact,
    same_result: sameResult,
    replay_completed: replayCompleted,
    selected_executor_id: forwardSelection.selected_candidate.candidate_id,
    ranking: forwardSelection.ranked_eligible_candidates
  };
}

export function verifyRegistryMixedEligibilityOrderIndependence(): MixedEligibilityOrderIndependenceVerification {
  const task = createWalkingSkeletonTask("registry_mixed_eligibility");
  const forward = runWalkingSkeleton("registry_mixed_eligibility", task, "declared");
  const reversed = runWalkingSkeleton("registry_mixed_eligibility", task, "reversed");
  const forwardSelection = requireRunSelection(forward);
  const reversedSelection = requireRunSelection(reversed);
  const forwardIneligible = forwardSelection.ineligible_candidates[0];
  const reversedIneligible = reversedSelection.ineligible_candidates[0];
  const selectedExecutorId = forwardSelection.selected_candidate.candidate_id;
  const ineligibleCandidateId = forwardIneligible?.candidate_id ?? "missing";
  const sameFingerprint = forward.fingerprint === reversed.fingerprint;
  const sameRanking = canonicalStringify(forwardSelection.ranked_eligible_candidates)
    === canonicalStringify(reversedSelection.ranked_eligible_candidates);
  const sameConsidered = canonicalStringify(forwardSelection.considered_candidates)
    === canonicalStringify(reversedSelection.considered_candidates);
  const sameIneligible = canonicalStringify(forwardSelection.ineligible_candidates)
    === canonicalStringify(reversedSelection.ineligible_candidates);
  const sameEvidence = canonicalStringify(forwardIneligible?.evidence_ref ?? null)
    === canonicalStringify(reversedIneligible?.evidence_ref ?? null);
  const sameArtifact = canonicalStringify(forward.artifacts) === canonicalStringify(reversed.artifacts);
  const sameResult = canonicalStringify(forward.result) === canonicalStringify(reversed.result);
  const sameEventSequence = sameSequence(
    forward.events.map((event) => event.event_type),
    reversed.events.map((event) => event.event_type)
  );
  const sameSelectedExecutor = selectedExecutorId === reversedSelection.selected_candidate.candidate_id;
  const replayCompleted = forward.replay_state === "completed" && reversed.replay_state === "completed";
  const rankedCandidateIds = forwardSelection.ranked_eligible_candidates.map((candidate) => candidate.candidate_id);
  const ineligibleNotRanked = !rankedCandidateIds.includes(ineligibleCandidateId)
    && forwardSelection.alternatives_not_selected.length === 0;
  const executorInvokeForward = forward.effects.filter((effect) => effect.effect_type === "executor.invoke").length;
  const executorInvokeReversed = reversed.effects.filter((effect) => effect.effect_type === "executor.invoke").length;
  const artifactExecutorIds = forward.artifacts.map((artifact) => artifact.source.executor_id);
  const ineligibleNotInvoked = executorInvokeForward === 1
    && executorInvokeReversed === 1
    && artifactExecutorIds.length === 1
    && artifactExecutorIds[0] === selectedExecutorId
    && !artifactExecutorIds.includes(ineligibleCandidateId);
  return {
    passed: sameFingerprint
      && sameSelectedExecutor
      && sameRanking
      && sameConsidered
      && sameIneligible
      && sameEvidence
      && sameEventSequence
      && sameArtifact
      && sameResult
      && replayCompleted
      && ineligibleNotRanked
      && ineligibleNotInvoked,
    forward_fingerprint: forward.fingerprint,
    reversed_fingerprint: reversed.fingerprint,
    same_fingerprint: sameFingerprint,
    same_selected_executor: sameSelectedExecutor,
    same_ranking: sameRanking,
    same_considered_candidates: sameConsidered,
    same_ineligible_candidate: sameIneligible,
    same_discard_evidence: sameEvidence,
    same_event_sequence: sameEventSequence,
    same_artifact: sameArtifact,
    same_result: sameResult,
    replay_completed: replayCompleted,
    ineligible_not_ranked: ineligibleNotRanked,
    ineligible_not_invoked: ineligibleNotInvoked,
    executor_invoke_effects_forward: executorInvokeForward,
    executor_invoke_effects_reversed: executorInvokeReversed,
    selected_executor_id: selectedExecutorId,
    ineligible_candidate_id: ineligibleCandidateId,
    ranking: forwardSelection.ranked_eligible_candidates
  };
}

export function verifyRegistryTieBreakerOrderIndependence(): TieBreakerOrderIndependenceVerification {
  const task = createWalkingSkeletonTask("registry_equal_rank_tiebreaker");
  const forward = runWalkingSkeleton("registry_equal_rank_tiebreaker", task, "declared");
  const reversed = runWalkingSkeleton("registry_equal_rank_tiebreaker", task, "reversed");
  const forwardSelection = requireRunSelection(forward);
  const reversedSelection = requireRunSelection(reversed);
  const forwardAlternative = forwardSelection.alternatives_not_selected[0];
  const reversedAlternative = reversedSelection.alternatives_not_selected[0];
  const selectedExecutorId = forwardSelection.selected_candidate.candidate_id;
  const alternativeExecutorId = forwardAlternative?.candidate_id ?? "missing";
  const sameFingerprint = forward.fingerprint === reversed.fingerprint;
  const sameRanking = canonicalStringify(forwardSelection.ranked_eligible_candidates)
    === canonicalStringify(reversedSelection.ranked_eligible_candidates);
  const sameConsidered = canonicalStringify(forwardSelection.considered_candidates)
    === canonicalStringify(reversedSelection.considered_candidates);
  const sameEligibility = canonicalStringify(forwardSelection.eligibility)
    === canonicalStringify(reversedSelection.eligibility);
  const sameEqualities = canonicalStringify(forwardSelection.ranking_key_equalities)
    === canonicalStringify(reversedSelection.ranking_key_equalities);
  const sameTieValues = canonicalStringify(forwardSelection.tie_breaker_values)
    === canonicalStringify(reversedSelection.tie_breaker_values);
  const sameAlternative = canonicalStringify(forwardSelection.alternatives_not_selected)
    === canonicalStringify(reversedSelection.alternatives_not_selected);
  const sameArtifact = canonicalStringify(forward.artifacts) === canonicalStringify(reversed.artifacts);
  const sameResult = canonicalStringify(forward.result) === canonicalStringify(reversed.result);
  const sameEventSequence = sameSequence(
    forward.events.map((event) => event.event_type),
    reversed.events.map((event) => event.event_type)
  );
  const sameSelectedExecutor = selectedExecutorId === reversedSelection.selected_candidate.candidate_id;
  const replayCompleted = forward.replay_state === "completed" && reversed.replay_state === "completed";
  const tieBreakerApplied = forwardSelection.tie_breaker_applied && reversedSelection.tie_breaker_applied;
  const noCandidatesIneligible = forwardSelection.ineligible_candidates.length === 0
    && reversedSelection.ineligible_candidates.length === 0
    && forwardSelection.eligibility.every((candidate) => candidate.eligible)
    && reversedSelection.eligibility.every((candidate) => candidate.eligible);
  const executorInvokeForward = forward.effects.filter((effect) => effect.effect_type === "executor.invoke").length;
  const executorInvokeReversed = reversed.effects.filter((effect) => effect.effect_type === "executor.invoke").length;
  const artifactExecutorIds = forward.artifacts.map((artifact) => artifact.source.executor_id);
  const selectedOnlyInvoked = executorInvokeForward === 1
    && executorInvokeReversed === 1
    && artifactExecutorIds.length === 1
    && artifactExecutorIds[0] === selectedExecutorId
    && !artifactExecutorIds.includes(alternativeExecutorId);
  const alternativeReason = forwardAlternative?.reason ?? "ranked_lower";
  return {
    passed: sameFingerprint
      && sameSelectedExecutor
      && sameRanking
      && sameConsidered
      && sameEligibility
      && sameEqualities
      && sameTieValues
      && sameAlternative
      && sameEventSequence
      && sameArtifact
      && sameResult
      && replayCompleted
      && tieBreakerApplied
      && noCandidatesIneligible
      && selectedOnlyInvoked
      && alternativeReason === "tie_breaker_ranked_lower",
    forward_fingerprint: forward.fingerprint,
    reversed_fingerprint: reversed.fingerprint,
    same_fingerprint: sameFingerprint,
    same_selected_executor: sameSelectedExecutor,
    same_ranking: sameRanking,
    same_considered_candidates: sameConsidered,
    same_eligibility: sameEligibility,
    same_ranking_key_equalities: sameEqualities,
    same_tie_breaker_values: sameTieValues,
    same_non_selected_alternative: sameAlternative,
    same_event_sequence: sameEventSequence,
    same_artifact: sameArtifact,
    same_result: sameResult,
    replay_completed: replayCompleted,
    tie_breaker_applied: tieBreakerApplied,
    no_candidates_ineligible: noCandidatesIneligible,
    executor_invoke_effects_forward: executorInvokeForward,
    executor_invoke_effects_reversed: executorInvokeReversed,
    selected_executor_id: selectedExecutorId,
    alternative_executor_id: alternativeExecutorId,
    alternative_reason: alternativeReason,
    ranking: forwardSelection.ranked_eligible_candidates,
    tie_breaker_values: forwardSelection.tie_breaker_values
  };
}

export function verifyPolicyConstraintsOrderIndependence(): PolicyConstraintsOrderIndependenceVerification {
  const task = createWalkingSkeletonTask("policy_allow_with_constraints");
  const forward = runWalkingSkeleton("policy_allow_with_constraints", task, "declared");
  const reversed = runWalkingSkeleton("policy_allow_with_constraints", task, "reversed");
  const forwardSelection = requireRunSelection(forward);
  const reversedSelection = requireRunSelection(reversed);
  const forwardDiscard = forwardSelection.constraint_discarded_candidates[0];
  const reversedDiscard = reversedSelection.constraint_discarded_candidates[0];
  const selectedExecutorId = forwardSelection.selected_candidate.candidate_id;
  const discardedCandidateId = forwardDiscard?.candidate_id ?? "missing";
  const sameFingerprint = forward.fingerprint === reversed.fingerprint;
  const sameDigest = forwardSelection.constraint_set_ref?.constraint_set_digest
    === reversedSelection.constraint_set_ref?.constraint_set_digest;
  const sameConsidered = canonicalStringify(forwardSelection.considered_candidates)
    === canonicalStringify(reversedSelection.considered_candidates);
  const sameIntrinsicEligibility = canonicalStringify(forwardSelection.eligibility)
    === canonicalStringify(reversedSelection.eligibility);
  const sameConstraintResults = canonicalStringify(forwardSelection.policy_constraint_results)
    === canonicalStringify(reversedSelection.policy_constraint_results);
  const sameConstraintDiscard = canonicalStringify(forwardSelection.constraint_discarded_candidates)
    === canonicalStringify(reversedSelection.constraint_discarded_candidates);
  const sameRanking = canonicalStringify(forwardSelection.ranked_eligible_candidates)
    === canonicalStringify(reversedSelection.ranked_eligible_candidates);
  const sameArtifact = canonicalStringify(forward.artifacts) === canonicalStringify(reversed.artifacts);
  const sameResult = canonicalStringify(forward.result) === canonicalStringify(reversed.result);
  const sameEventSequence = sameSequence(
    forward.events.map((event) => event.event_type),
    reversed.events.map((event) => event.event_type)
  );
  const sameSelectedExecutor = selectedExecutorId === reversedSelection.selected_candidate.candidate_id;
  const replayCompleted = forward.replay_state === "completed" && reversed.replay_state === "completed";
  const rankedCandidateIds = forwardSelection.ranked_eligible_candidates.map((candidate) => candidate.candidate_id);
  const registryDidNotHideCandidate = forwardSelection.considered_candidates.length === 2
    && forwardSelection.considered_candidates.some((candidate) => candidate.candidate_id === discardedCandidateId);
  const betterPriorityCandidateNotRanked = !rankedCandidateIds.includes(discardedCandidateId)
    && forwardSelection.ranked_eligible_candidates.length === 1
    && forwardSelection.alternatives_not_selected.length === 0;
  const executorInvokeForward = forward.effects.filter((effect) => effect.effect_type === "executor.invoke").length;
  const executorInvokeReversed = reversed.effects.filter((effect) => effect.effect_type === "executor.invoke").length;
  const artifactExecutorIds = forward.artifacts.map((artifact) => artifact.source.executor_id);
  const selectedOnlyInvoked = executorInvokeForward === 1
    && executorInvokeReversed === 1
    && artifactExecutorIds.length === 1
    && artifactExecutorIds[0] === selectedExecutorId
    && !artifactExecutorIds.includes(discardedCandidateId);
  return {
    passed: sameFingerprint
      && sameDigest
      && sameSelectedExecutor
      && sameConsidered
      && sameIntrinsicEligibility
      && sameConstraintResults
      && sameConstraintDiscard
      && sameRanking
      && sameEventSequence
      && sameArtifact
      && sameResult
      && replayCompleted
      && registryDidNotHideCandidate
      && betterPriorityCandidateNotRanked
      && selectedOnlyInvoked,
    forward_fingerprint: forward.fingerprint,
    reversed_fingerprint: reversed.fingerprint,
    same_fingerprint: sameFingerprint,
    same_constraint_set_digest: sameDigest,
    same_selected_executor: sameSelectedExecutor,
    same_considered_candidates: sameConsidered,
    same_intrinsic_eligibility: sameIntrinsicEligibility,
    same_policy_constraint_results: sameConstraintResults,
    same_constraint_discard: sameConstraintDiscard,
    same_ranking: sameRanking,
    same_event_sequence: sameEventSequence,
    same_artifact: sameArtifact,
    same_result: sameResult,
    replay_completed: replayCompleted,
    registry_did_not_hide_candidate: registryDidNotHideCandidate,
    better_priority_candidate_not_ranked: betterPriorityCandidateNotRanked,
    executor_invoke_effects_forward: executorInvokeForward,
    executor_invoke_effects_reversed: executorInvokeReversed,
    selected_executor_id: selectedExecutorId,
    discarded_candidate_id: discardedCandidateId,
    constraint_set_digest: forwardSelection.constraint_set_ref?.constraint_set_digest ?? "missing",
    ranking: forwardSelection.ranked_eligible_candidates
  };
}

export function verifyRegistrySnapshotDigestRules(): RegistrySnapshotDigestVerification {
  const task = createWalkingSkeletonTask("registry_multiple_eligible");
  const forward = runWalkingSkeleton("registry_multiple_eligible", task, "declared");
  const reversed = runWalkingSkeleton("registry_multiple_eligible", task, "reversed");
  const forwardLookup = requireRunRegistryLookup(forward);
  const reversedLookup = requireRunRegistryLookup(reversed);
  const changedSourceRef: RegistrySourceRef = {
    ...forwardLookup.registry_source_ref,
    source_version: "0.1.0",
    source_digest: stableId("registry_source_digest", ["walking_skeleton.registry", "0.1.0", "changed"])
  };
  const changedScope: SnapshotScope = {
    ...forwardLookup.snapshot_scope,
    description: `${forwardLookup.snapshot_scope.description} changed`
  };
  const sourceChangedDigest = snapshotDigestFor(
    changedSourceRef,
    forwardLookup.snapshot_scope,
    forwardLookup.lookup_criteria,
    forwardLookup.candidates
  );
  const digestibleFieldChangedDigest = snapshotDigestFor(
    forwardLookup.registry_source_ref,
    changedScope,
    forwardLookup.lookup_criteria,
    forwardLookup.candidates
  );
  const digestInput = canonicalStringify(registrySnapshotDigestInput(
    forwardLookup.registry_source_ref,
    forwardLookup.snapshot_scope,
    forwardLookup.lookup_criteria,
    forwardLookup.candidates
  ));
  const sameDigestForInvertedOrder = forwardLookup.registry_snapshot_digest === reversedLookup.registry_snapshot_digest;
  const changedSourceRefChangesDigest = sourceChangedDigest !== forwardLookup.registry_snapshot_digest;
  const changedDigestibleFieldChangesDigest = digestibleFieldChangedDigest !== forwardLookup.registry_snapshot_digest;
  const digestInputExcludesSnapshotDigest = !digestInput.includes("snapshot_digest");
  return {
    passed: sameDigestForInvertedOrder
      && changedSourceRefChangesDigest
      && changedDigestibleFieldChangesDigest
      && digestInputExcludesSnapshotDigest,
    same_digest_for_inverted_order: sameDigestForInvertedOrder,
    changed_source_ref_changes_digest: changedSourceRefChangesDigest,
    changed_digestible_field_changes_digest: changedDigestibleFieldChangesDigest,
    digest_input_excludes_snapshot_digest: digestInputExcludesSnapshotDigest,
    forward_digest: forwardLookup.registry_snapshot_digest,
    reversed_digest: reversedLookup.registry_snapshot_digest
  };
}

function verifyScenario(scenario: WalkingSkeletonScenario): ScenarioVerification {
  const first = runWalkingSkeleton(scenario);
  const second = runWalkingSkeleton(scenario);
  const expectedSequence = expectedEventSequenceFor(scenario);
  const eventSequence = first.events.map((event) => event.event_type);
  const expectedStatus = expectedResultStatusFor(scenario);
  const forbiddenEventsAbsent = forbiddenEventsFor(scenario).every((eventType) => !eventSequence.includes(eventType));
  const executorEventsAbsent = executorEvents().every((eventType) => !eventSequence.includes(eventType));
  const executorEffectAbsent = !first.effects.some((effect) => effect.effect_type === "executor.invoke");
  const attemptEventsAbsent = !eventSequence.some((eventType) => eventType.startsWith("attempt."));
  const outputArtifactsAbsent = expectsOutputArtifact(scenario) ? first.artifacts.length > 0 : first.artifacts.length === 0;
  const executorAbsenceOk = expectsExecutorInvocation(scenario) ? true : executorEventsAbsent;
  const executorEffectAbsenceOk = expectsExecutorInvocation(scenario) ? true : executorEffectAbsent;
  const deterministic = first.fingerprint === second.fingerprint;
  const statusOk = first.result.status === expectedStatus;
  const eventSequenceOk = sameSequence(eventSequence, expectedSequence);
  const replayOk = first.replay_state === expectedReplayStateFor(scenario);
  const effectRequestCorrespondenceOk = verifyEffectRequestCorrespondence(first);
  const outcomeContractOk = verifyOutcomeContractCompatibility(first);
  const passed = deterministic
    && statusOk
    && eventSequenceOk
    && replayOk
    && forbiddenEventsAbsent
    && executorAbsenceOk
    && executorEffectAbsenceOk
    && attemptEventsAbsent
    && outputArtifactsAbsent
    && effectRequestCorrespondenceOk
    && outcomeContractOk;
  return {
    scenario,
    passed,
    deterministic,
    status_ok: statusOk,
    event_sequence_ok: eventSequenceOk,
    replay_ok: replayOk,
    forbidden_events_absent: forbiddenEventsAbsent,
    executor_events_absent: executorEventsAbsent,
    executor_effect_absent: executorEffectAbsent,
    attempt_events_absent: attemptEventsAbsent,
    output_artifacts_absent: outputArtifactsAbsent,
    effect_request_correspondence_ok: effectRequestCorrespondenceOk,
    outcome_contract_ok: outcomeContractOk,
    first_fingerprint: first.fingerprint,
    second_fingerprint: second.fingerprint,
    event_sequence: eventSequence,
    replay_state: first.replay_state,
    final_status: first.result.status
  };
}

function verifyEffectRequestCorrespondence(run: WalkingSkeletonRun): boolean {
  const commandsById = new Map(run.commands.map((command) => [command.command_id, command]));
  const effectsByCommand = new Map<string, Effect[]>();
  for (const effect of run.effects) {
    const effects = effectsByCommand.get(effect.command_ref.command_id) ?? [];
    effects.push(effect);
    effectsByCommand.set(effect.command_ref.command_id, effects);
  }
  const everyEffectHasCommandRequest = run.effects.every((effect) => {
    const command = commandsById.get(effect.command_ref.command_id);
    return command !== undefined
      && command.command_version === effect.command_ref.command_version
      && command.effect_request.some((request) =>
        request.effect_type === effect.effect_type
        && request.effect_version === effect.effect_version
      );
  });
  const noEffectWithoutCommand = run.effects.every((effect) => commandsById.has(effect.command_ref.command_id));
  const emptyRequestsHaveNoEffects = run.commands.every((command) =>
    command.effect_request.length > 0 || (effectsByCommand.get(command.command_id) ?? []).length === 0
  );
  const producedEffectsWereRequested = run.commands.every((command) => {
    const effects = effectsByCommand.get(command.command_id) ?? [];
    return effects.every((effect) =>
      command.effect_request.some((request) => request.effect_type === effect.effect_type)
    );
  });
  return everyEffectHasCommandRequest
    && noEffectWithoutCommand
    && emptyRequestsHaveNoEffects
    && producedEffectsWereRequested;
}

function verifyOutcomeContractCompatibility(run: WalkingSkeletonRun): boolean {
  const eventOutcomes = [
    "accepted",
    "allowed",
    "allowed_with_constraints",
    "denied",
    "selected",
    "no_candidate",
    "blocked",
    "failed",
    "succeeded"
  ];
  const policyOutcomes = ["allow", "deny", "requires_approval", "allow_with_constraints"];
  return run.events.every((event) => eventOutcomes.includes(event.decision.outcome))
    && run.result.policy_outcomes?.every((outcome) => policyOutcomes.includes(outcome.outcome)) !== false;
}

function expectedEventSequenceFor(scenario: WalkingSkeletonScenario): readonly EventType[] {
  if (scenario === "policy_deny_correctable") {
    return [
      "execution.task.accepted",
      "execution.plan.resolution.started",
      "execution.plan.resolution.completed",
      "policy.check.completed",
      "policy.decision.denied",
      "execution.blocked",
      "execution.result.consolidation.started",
      "execution.result.consolidation.completed"
    ];
  }
  if (scenario === "policy_deny_terminal") {
    return [
      "execution.task.accepted",
      "execution.plan.resolution.started",
      "execution.plan.resolution.completed",
      "policy.check.completed",
      "policy.decision.denied",
      "execution.failed",
      "execution.result.consolidation.started",
      "execution.result.consolidation.completed"
    ];
  }
  if (scenario === "registry_no_candidate") {
    return [
      "execution.task.accepted",
      "execution.plan.resolution.started",
      "execution.plan.resolution.completed",
      "policy.check.completed",
      "registry.lookup.completed",
      "registry.lookup.no_candidate",
      "execution.blocked",
      "execution.result.consolidation.started",
      "execution.result.consolidation.completed"
    ];
  }
  return [
    "execution.task.accepted",
    "execution.plan.resolution.started",
    "execution.plan.resolution.completed",
    "policy.check.completed",
    "registry.lookup.completed",
    "execution.executor.selected",
    "execution.context.prepared",
    "capability.execution.started",
    "capability.execution.completed",
    "capability.artifact.proposed",
    "artifact.validation.completed",
    "execution.result.consolidation.started",
    "execution.result.consolidation.completed",
    "execution.completed"
  ];
}

function expectedResultStatusFor(scenario: WalkingSkeletonScenario): ExecutionResult["status"] {
  switch (scenario) {
    case "policy_allow":
    case "policy_allow_with_constraints":
    case "registry_multiple_eligible":
    case "registry_mixed_eligibility":
    case "registry_equal_rank_tiebreaker":
      return "succeeded";
    case "policy_deny_correctable":
      return "blocked";
    case "policy_deny_terminal":
      return "failed";
    case "registry_no_candidate":
      return "blocked";
  }
}

function expectedReplayStateFor(scenario: WalkingSkeletonScenario): ExecutionState {
  switch (scenario) {
    case "policy_allow":
    case "policy_allow_with_constraints":
    case "registry_multiple_eligible":
    case "registry_mixed_eligibility":
    case "registry_equal_rank_tiebreaker":
      return "completed";
    case "policy_deny_correctable":
      return "blocked";
    case "policy_deny_terminal":
      return "failed";
    case "registry_no_candidate":
      return "blocked";
  }
}

function forbiddenEventsFor(scenario: WalkingSkeletonScenario): readonly EventType[] {
  if (expectsExecutorInvocation(scenario)) {
    return [];
  }
  if (scenario === "registry_no_candidate") {
    return [
      "execution.executor.selected",
      "execution.context.prepared",
      "capability.execution.started",
      "capability.execution.completed",
      "capability.artifact.proposed",
      "artifact.validation.completed",
      "execution.completed",
      "execution.failed"
    ];
  }
  return [
    "registry.lookup.completed",
    "registry.lookup.no_candidate",
    "execution.executor.selected",
    "execution.context.prepared",
    "capability.execution.started",
    "capability.execution.completed",
    "capability.artifact.proposed",
    "artifact.validation.completed",
    "execution.completed"
  ];
}

function expectsOutputArtifact(scenario: WalkingSkeletonScenario): boolean {
  return scenario === "policy_allow"
    || scenario === "policy_allow_with_constraints"
    || scenario === "registry_multiple_eligible"
    || scenario === "registry_mixed_eligibility"
    || scenario === "registry_equal_rank_tiebreaker";
}

function expectsExecutorInvocation(scenario: WalkingSkeletonScenario): boolean {
  return expectsOutputArtifact(scenario);
}

function executorEvents(): readonly EventType[] {
  return [
    "execution.executor.selected",
    "execution.context.prepared",
    "capability.execution.started",
    "capability.execution.completed",
    "capability.artifact.proposed"
  ];
}

function sameSequence(left: readonly EventType[], right: readonly EventType[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function step(state: WorkState, commandType: CommandType, evidence: Evidence): void {
  const command = createCommand(state, commandType);
  const context = createRuntimeContext(state, command);
  const result = applyStateMachine(command, context, evidence, state);
  state.commands.push(command);
  state.runtimeContexts.push(context);
  state.events.push(...result.events);
  state.effects.push(...result.effects);
}

function createCapabilityPlan(task: TaskEnvelope): CapabilityPlan {
  return {
    plan_version: "0.1.0",
    plan_id: stableId("plan", [task.task_id, task.task_version]),
    task_id: task.task_id,
    trace_id: task.trace_id,
    status: "ready",
    capabilities: [
      {
        step_id: "step_1",
        capability_id: "walking_skeleton.execute",
        capability_version: "0.1.0",
        purpose: "Validate one deterministic capability end to end.",
        input_refs: [{ kind: "task", id: task.task_id, version: task.task_version }],
        expected_outputs: ["deterministic execution result"],
        expected_artifacts: task.expected_artifacts,
        depends_on: [],
        success_criteria: ["ExecutionResult status is succeeded", "Artifact validation status is valid"]
      }
    ]
  };
}

function createCommand(state: WorkState, commandType: CommandType): Command {
  const currentState = deriveState(state.events);
  const commandId = stableId("command", [state.task.trace_id, commandType, String(state.commands.length + 1)]);
  const inputRefs = inputRefsFor(commandType, state);
  return {
    command_version: "0.1.0",
    command_id: commandId,
    command_type: commandType,
    trace_id: state.task.trace_id,
    task_id: state.task.task_id,
    requested_at: logicalTime(state.commands.length + 1),
    requested_by: { kind: "runtime", id: "walking_skeleton.runtime" },
    target: targetFor(commandType, state),
    expected_state: { state: currentState, version: "0.1.0-draft" },
    causality: {
      caused_by_event_id: lastEventId(state.events),
      caused_by_command_id: lastCommandId(state.commands)
    },
    input_refs: inputRefs,
    effect_request: effectRequestsFor(commandType, state, inputRefs),
    intent: { action: commandType, reason: "walking skeleton deterministic progression" },
    idempotency: {
      key: stableId("idem_command", [state.task.trace_id, commandType, currentState]),
      scope: "trace"
    }
  };
}

function createRuntimeContext(state: WorkState, command: Command): RuntimeContext {
  return {
    runtime_context_version: "0.1.0",
    runtime_context_id: stableId("runtime_context", [command.command_id]),
    trace_id: state.task.trace_id,
    task_id: state.task.task_id,
    created_at: command.requested_at,
    state_machine: { id: "execution_state_machine", version: "0.1.0-draft" },
    current_state: { state: deriveState(state.events), version: "0.1.0-draft" },
    command_ref: { command_id: command.command_id, command_version: command.command_version },
    event_stream_ref: {
      last_event_id: lastEventId(state.events),
      last_sequence_number: state.events.length
    },
    input_refs: command.input_refs,
    determinism: {
      logical_time: command.requested_at,
      id_namespace: state.task.trace_id,
      ordering_rule: "lexicographic-by-id-v0"
    }
  };
}

function applyStateMachine(
  command: Command,
  context: RuntimeContext,
  evidence: Evidence,
  state: WorkState
): StateMachineResult {
  if (context.current_state.state !== command.expected_state.state) {
    return failedTransition(command, context, state);
  }
  switch (command.command_type) {
    case "execution.task.accept":
      return transition(command, context, state, "accepted", ["execution.task.accepted"]);
    case "execution.plan.resolve":
      return transition(command, context, state, "plan_ready", [
        "execution.plan.resolution.started",
        "execution.plan.resolution.completed"
      ], "policy.evaluate");
    case "execution.policy.apply":
      return policyTransition(command, context, state, evidence);
    case "execution.registry.apply":
      return registryTransition(command, context, state, evidence);
    case "execution.executor.select":
      return transition(command, context, state, "running", [
        "execution.executor.selected",
        "execution.context.prepared"
      ], "executor.invoke", [], evidence);
    case "execution.capability.apply":
      return capabilityTransition(command, context, state, evidence);
    case "execution.artifact.apply":
      return transition(command, context, state, "artifact_collecting", ["artifact.validation.completed"], "result.consolidate");
    case "execution.result.consolidate":
      return resultTransition(command, context, state, evidence);
  }
}

function registryTransition(
  command: Command,
  context: RuntimeContext,
  state: WorkState,
  evidence: Evidence
): StateMachineResult {
  if (evidence.kind !== "registry") {
    return failedTransition(command, context, state);
  }
  if (evidence.lookup.candidates.length === 0) {
    return transition(command, context, state, "blocked", [
      "registry.lookup.completed",
      "registry.lookup.no_candidate",
      "execution.blocked"
    ], "result.consolidate", [], evidence);
  }
  return transition(command, context, state, "registry_lookup", ["registry.lookup.completed"], undefined, [], evidence);
}

function policyTransition(
  command: Command,
  context: RuntimeContext,
  state: WorkState,
  evidence: Evidence
): StateMachineResult {
  if (evidence.kind !== "policy") {
    return failedTransition(command, context, state);
  }
  if (evidence.decision.outcome === "deny") {
    if (!evidence.decision.recoverable) {
      return transition(command, context, state, "failed", [
        "policy.check.completed",
        "policy.decision.denied",
        "execution.failed"
      ], "result.consolidate", [], evidence);
    }
    return transition(command, context, state, "blocked", [
      "policy.check.completed",
      "policy.decision.denied",
      "execution.blocked"
    ], "result.consolidate", [], evidence);
  }
  return transition(command, context, state, "policy_checking", ["policy.check.completed"], "registry.lookup", [], evidence);
}

function resultTransition(
  command: Command,
  context: RuntimeContext,
  state: WorkState,
  evidence: Evidence
): StateMachineResult {
  if (evidence.kind !== "result") {
    return failedTransition(command, context, state);
  }
  if (evidence.result.status === "blocked") {
    return transition(command, context, state, "blocked", [
      "execution.result.consolidation.started",
      "execution.result.consolidation.completed"
    ], undefined, [], evidence);
  }
  if (evidence.result.status === "failed") {
    return transition(command, context, state, "failed", [
      "execution.result.consolidation.started",
      "execution.result.consolidation.completed"
    ], undefined, [], evidence);
  }
  return transition(command, context, state, "completed", [
    "execution.result.consolidation.started",
    "execution.result.consolidation.completed",
    "execution.completed"
  ], undefined, [], evidence);
}

function capabilityTransition(
  command: Command,
  context: RuntimeContext,
  state: WorkState,
  evidence: Evidence
): StateMachineResult {
  const artifactRefs = evidence.kind === "executor_output" ? [toArtifactRef(evidence.output.artifact)] : [];
  return transition(command, context, state, "artifact_collecting", [
    "capability.execution.started",
    "capability.execution.completed",
    "capability.artifact.proposed"
  ], "artifact.validate", artifactRefs);
}

function transition(
  command: Command,
  context: RuntimeContext,
  state: WorkState,
  nextState: ExecutionState,
  eventTypes: readonly EventType[],
  effectType?: EffectType,
  artifactRefs: readonly ArtifactRef[] = [],
  evidence: Evidence = { kind: "none" }
): StateMachineResult {
  const events: WorkflowEvent[] = [];
  for (const eventType of eventTypes) {
    events.push(createEvent(command, context, state, eventType, nextState, events, artifactRefs, evidence));
  }
  const effects = effectType === undefined ? [] : [
    createEffect(command, context, state, effectType, nextState)
  ];
  return { events, effects };
}

function failedTransition(command: Command, context: RuntimeContext, state: WorkState): StateMachineResult {
  const event = createEvent(command, context, state, "execution.failed", "failed", [], [], { kind: "none" });
  return { events: [event], effects: [] };
}

function createEvent(
  command: Command,
  context: RuntimeContext,
  state: WorkState,
  eventType: EventType,
  nextState: ExecutionState,
  transitionEvents: readonly WorkflowEvent[],
  artifactRefs: readonly ArtifactRef[],
  evidence: Evidence
): WorkflowEvent {
  const sequence = state.events.length + transitionEvents.length + 1;
  return {
    event_version: "0.1.0",
    event_id: stableId("event", [state.task.trace_id, eventType, String(sequence)]),
    event_type: eventType,
    occurred_at: logicalTime(sequence),
    recorded_at: logicalTime(sequence),
    trace_id: state.task.trace_id,
    task_id: state.task.task_id,
    sequence: { number: sequence, previous_event_id: previousEventId(state.events, transitionEvents) },
    producer: { component: producerFor(eventType), version: "0.1.0-draft" },
    subject: subjectFor(eventType, state),
    decision: decisionFor(eventType, evidence),
    input_refs: eventInputRefs(context, evidence),
    summary: eventType,
    state_transition: { from: context.current_state.state, to: nextState },
    artifact_refs: artifactRefs,
    registry_ref: registryRefFor(eventType, evidence),
    selection_ref: selectionRefFor(eventType, state, evidence)
  };
}

function createEffect(
  command: Command,
  context: RuntimeContext,
  state: WorkState,
  effectType: EffectType,
  nextState: ExecutionState
): Effect {
  return {
    effect_version: "0.1.0",
    effect_id: stableId("effect", [command.command_id, effectType]),
    effect_type: effectType,
    trace_id: state.task.trace_id,
    task_id: state.task.task_id,
    declared_at: command.requested_at,
    declared_by: { kind: "state_machine", id: "execution_state_machine" },
    command_ref: { command_id: command.command_id, command_version: command.command_version },
    causality: {
      caused_by_event_id: lastEventId(state.events),
      state_transition: { from: context.current_state.state, to: nextState }
    },
    input_refs: context.input_refs,
    side_effects: sideEffectsFor(effectType),
    idempotency: {
      key: stableId("idem_effect", [state.task.trace_id, command.command_id, effectType]),
      scope: "command"
    },
    expected_evidence: expectedEvidenceFor(effectType)
  };
}

function requireEffect(state: WorkState, effectType: EffectType): Effect {
  const effect = state.effects.at(-1);
  if (effect === undefined || effect.effect_type !== effectType) {
    throw new Error(`Expected effect ${effectType}.`);
  }
  return effect;
}

function runPolicyEffect(effect: Effect, state: WorkState, scenario: WalkingSkeletonScenario): PolicyDecision {
  void effect;
  if (scenario === "policy_deny_terminal") {
    return {
      decision_version: "0.1.0",
      decision_id: stableId("policy_decision", [state.task.trace_id, "deny_terminal"]),
      policy_id: "walking_skeleton.policy",
      policy_version: "0.1.0",
      outcome: "deny",
      reason: "Terminal policy fixture denied execution before Registry lookup.",
      recoverable: false,
      required_input: null
    };
  }
  if (scenario === "policy_deny_correctable") {
    return {
      decision_version: "0.1.0",
      decision_id: stableId("policy_decision", [state.task.trace_id, "deny"]),
      policy_id: "walking_skeleton.policy",
      policy_version: "0.1.0",
      outcome: "deny",
      reason: "Correctable policy fixture denied execution before Registry lookup.",
      recoverable: true,
      required_input: {
        kind: "policy_remediation_input",
        id: "policy_remediation_context_walk_001",
        version: "0.1.0"
      }
    };
  }
  if (scenario === "policy_allow_with_constraints") {
    const decisionId = stableId("policy_decision", [state.task.trace_id, "allow_with_constraints"]);
    const constraintSet = createWalkingSkeletonConstraintSet(state, decisionId);
    return {
      decision_version: "0.1.0",
      decision_id: decisionId,
      policy_id: "walking_skeleton.policy",
      policy_version: "0.1.0",
      outcome: "allow_with_constraints",
      reason: "Policy fixture allowed execution with a versioned risk-level constraint.",
      recoverable: false,
      required_input: null,
      constraint_set: constraintSet
    };
  }
  return {
    decision_version: "0.1.0",
    decision_id: stableId("policy_decision", [state.task.trace_id, "allow"]),
    policy_id: "walking_skeleton.policy",
    policy_version: "0.1.0",
    outcome: "allow",
    reason: "Policy fixture allowed the walking skeleton execution.",
    recoverable: false,
    required_input: null
  };
}

function createWalkingSkeletonConstraintSet(state: WorkState, decisionId: string): PolicyConstraintSet {
  const capability = state.plan.capabilities[0];
  const constraint: PolicyConstraint = {
    constraint_id: "constraint.walking_skeleton.executor_risk_low",
    constraint_version: "0.1.0",
    constraint_type: "registry_candidate",
    enforcement_phase: "selection_eligibility",
    target: {
      kind: "registry_record",
      path: "eligibility_metadata.risk_level"
    },
    operator: {
      operator_id: "eq",
      operator_version: "0.1.0"
    },
    value_type: "enum_token",
    value: "low",
    source_ref: {
      kind: "policy",
      id: "walking_skeleton.policy",
      version: "0.1.0"
    },
    failure_code: "policy_constraint_failed"
  };
  const base = {
    constraint_set_id: stableId("policy_constraint_set", [state.task.trace_id, decisionId]),
    constraint_set_version: "0.1.0" as const,
    constraint_set_schema_version: "0.1.0" as const,
    provenance: {
      source_id: "policy_source.walking_skeleton.static",
      source_version: "0.1.0" as const,
      source_digest: stableId("policy_source_digest", ["walking_skeleton.policy", "0.1.0"])
    },
    operator_catalog: {
      catalog_id: "policy_constraint_operator_catalog.walking_skeleton" as const,
      catalog_version: "0.1.0" as const
    },
    policy_decision_ref: {
      decision_id: decisionId,
      decision_version: "0.1.0" as const
    },
    policy_ref: {
      policy_id: "walking_skeleton.policy" as const,
      policy_version: "0.1.0" as const
    },
    subject_ref: {
      kind: "capability",
      id: capability.capability_id,
      version: capability.capability_version
    },
    input_refs: [
      { kind: "task", id: state.task.task_id, version: state.task.task_version },
      { kind: "plan", id: state.plan.plan_id, version: state.plan.plan_version }
    ],
    constraints: [constraint],
    composition: {
      operator: "all" as const,
      children: [
        {
          constraint_ref: {
            constraint_id: constraint.constraint_id,
            constraint_version: constraint.constraint_version
          }
        }
      ]
    },
    canonicalization: {
      object_key_order: "lexicographic" as const,
      set_order: "canonical_identity" as const
    }
  };
  return {
    ...base,
    constraint_set_digest: constraintSetDigestFor(base)
  };
}

function constraintSetDigestFor(input: Omit<PolicyConstraintSet, "constraint_set_digest">): string {
  return stableId("constraint_set_digest", [
    canonicalStringify({
      constraint_set_schema_version: input.constraint_set_schema_version,
      provenance: input.provenance,
      operator_catalog: input.operator_catalog,
      policy_decision_ref: input.policy_decision_ref,
      policy_ref: input.policy_ref,
      subject_ref: input.subject_ref,
      input_refs: input.input_refs,
      constraints: input.constraints,
      composition: input.composition,
      canonicalization: input.canonicalization
    })
  ]);
}

function runRegistryEffect(effect: Effect, state: WorkState): RegistryLookup {
  void effect;
  const capability = state.plan.capabilities[0];
  const policyDecision = requirePolicyDecision(state);
  const snapshotId = registrySnapshotIdFor(state.scenario);
  const registrySourceRef = registrySourceRefFor();
  const snapshotScope = snapshotScopeFor(state.scenario);
  const lookupCriteria = lookupCriteriaFor(state.scenario, capability, policyDecision);
  const candidates = canonicalCandidates(registryFixtureCandidates(state, capability));
  const snapshotDigest = snapshotDigestFor(registrySourceRef, snapshotScope, lookupCriteria, candidates);
  return {
    lookup_id: stableId("registry_lookup", [state.task.trace_id, snapshotId, capability.capability_id]),
    lookup_version: "0.1.0",
    decision_id: stableId("decision_registry_lookup", [state.task.trace_id, snapshotId, capability.capability_id]),
    decision_version: "0.1.0",
    registry_snapshot_id: snapshotId,
    registry_snapshot_version: "0.1.0",
    registry_snapshot_schema_version: "0.1.0",
    registry_source_ref: registrySourceRef,
    registry_snapshot_digest: snapshotDigest,
    snapshot_scope: snapshotScope,
    lookup_criteria: lookupCriteria,
    capability_id: capability.capability_id,
    capability_version: capability.capability_version,
    considered_candidates: candidates,
    candidates,
    discarded_candidates: []
  };
}

function registrySourceRefFor(): RegistrySourceRef {
  return {
    source_id: "registry_source.walking_skeleton.static",
    source_version: "0.1.0",
    source_digest: stableId("registry_source_digest", ["walking_skeleton.registry", "0.1.0"])
  };
}

function registrySnapshotIdFor(scenario: WalkingSkeletonScenario): string {
  switch (scenario) {
    case "policy_allow_with_constraints":
      return "registry_snapshot_policy_constraints_001";
    case "registry_no_candidate":
      return "registry_snapshot_no_candidate_001";
    case "registry_multiple_eligible":
      return "registry_snapshot_multiple_eligible_001";
    case "registry_mixed_eligibility":
      return "registry_snapshot_mixed_eligibility_001";
    case "registry_equal_rank_tiebreaker":
      return "registry_snapshot_equal_rank_tiebreaker_001";
    case "policy_allow":
    case "policy_deny_correctable":
    case "policy_deny_terminal":
      return "registry_snapshot_walk_001";
  }
}

function registryFixtureCandidates(state: WorkState, capability: PlannedCapability): readonly ExecutorCandidate[] {
  if (state.scenario === "registry_no_candidate") {
    return [];
  }
  if (state.scenario === "policy_allow_with_constraints") {
    const candidates = [constraintFailingCandidateA(capability), constraintSatisfyingCandidateB(capability)];
    return state.registryEnumeration === "reversed" ? [...candidates].reverse() : candidates;
  }
  if (state.scenario === "registry_mixed_eligibility") {
    const candidates = [mixedIneligibleCandidateA(capability), mixedEligibleCandidateB(capability)];
    return state.registryEnumeration === "reversed" ? [...candidates].reverse() : candidates;
  }
  if (state.scenario === "registry_equal_rank_tiebreaker") {
    const candidates = [tieBreakerCandidateA(capability), tieBreakerCandidateB(capability)];
    return state.registryEnumeration === "reversed" ? [...candidates].reverse() : candidates;
  }
  if (state.scenario !== "registry_multiple_eligible") {
    return [singleExecutorCandidate(capability)];
  }
  const candidates = [rankedExecutorAlpha(capability), rankedExecutorBeta(capability)];
  return state.registryEnumeration === "reversed" ? [...candidates].reverse() : candidates;
}

function snapshotScopeFor(scenario: WalkingSkeletonScenario): SnapshotScope {
  return {
    scope_type: "lookup_scoped",
    description: scenario === "registry_no_candidate"
      ? "Walking skeleton lookup scope with no returned execution candidates."
      : "Walking skeleton lookup scope for one capability."
  };
}

function lookupCriteriaFor(
  scenario: WalkingSkeletonScenario,
  capability: PlannedCapability,
  policyDecision: PolicyDecision
): LookupCriteria {
  return {
    capability_id: capability.capability_id,
    capability_version: capability.capability_version,
    include_inactive: scenario === "registry_mixed_eligibility",
    candidate_types: ["execution_candidate"],
    required_permissions: ["workspace.read"],
    required_side_effects: ["read"],
    policy_constraint_refs: [
      {
        kind: "policy_decision",
        id: policyDecision.decision_id,
        version: policyDecision.decision_version
      }
    ]
  };
}

function snapshotDigestFor(
  registrySourceRef: RegistrySourceRef,
  snapshotScope: SnapshotScope,
  lookupCriteria: LookupCriteria,
  candidates: readonly ExecutorCandidate[]
): string {
  return stableId("snapshot_digest", [
    canonicalStringify(registrySnapshotDigestInput(registrySourceRef, snapshotScope, lookupCriteria, candidates))
  ]);
}

function registrySnapshotDigestInput(
  registrySourceRef: RegistrySourceRef,
  snapshotScope: SnapshotScope,
  lookupCriteria: LookupCriteria,
  candidates: readonly ExecutorCandidate[]
): unknown {
  return {
    registry_snapshot_schema_version: "0.1.0",
    registry_source_ref: registrySourceRef,
    snapshot_scope: snapshotScope,
    lookup_criteria: lookupCriteria,
    records: canonicalRegistrySnapshotRecords(candidates)
  };
}

function canonicalRegistrySnapshotRecords(candidates: readonly ExecutorCandidate[]): readonly JsonValue[] {
  return [...candidates].sort(compareRegistryRecordIdentity).map(toRegistryRecordDigestInput);
}

function compareRegistryRecordIdentity(left: ExecutorCandidate, right: ExecutorCandidate): number {
  return registryRecordIdentity(left).localeCompare(registryRecordIdentity(right));
}

function registryRecordIdentity(candidate: ExecutorCandidate): string {
  return [
    candidate.registry_record_id,
    candidate.registry_record_version,
    candidate.executor_id,
    candidate.metadata_version
  ].join("|");
}

function toRegistryRecordDigestInput(candidate: ExecutorCandidate): JsonValue {
  return {
    registry_record_id: candidate.registry_record_id,
    registry_record_version: candidate.registry_record_version,
    record_type: "execution_candidate",
    executor_id: candidate.executor_id,
    executor_metadata_version: candidate.metadata_version,
    supported_capabilities: [
      {
        capability_id: candidate.capability_id,
        capability_version: candidate.capability_version
      }
    ],
    frozen_status: candidate.status,
    declared_permissions: candidate.declared_permissions,
    declared_side_effects: candidate.declared_side_effects,
    eligibility_metadata: candidate.eligibility_metadata,
    ranking_metadata: candidate.ranking_metadata,
    provenance: candidate.provenance
  };
}

function singleExecutorCandidate(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.local",
    registry_record_id: "registry_record.walking_skeleton.local",
    status: "active",
    declared_priority: 10,
    source_record_id: "source_record.walking_skeleton.local"
  });
}

function rankedExecutorAlpha(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.alpha",
    registry_record_id: "registry_record.walking_skeleton.alpha",
    status: "active",
    declared_priority: 10,
    source_record_id: "source_record.walking_skeleton.alpha"
  });
}

function rankedExecutorBeta(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.beta",
    registry_record_id: "registry_record.walking_skeleton.beta",
    status: "active",
    declared_priority: 20,
    source_record_id: "source_record.walking_skeleton.beta"
  });
}

function mixedIneligibleCandidateA(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.mixed_a_inactive",
    registry_record_id: "registry_record.walking_skeleton.mixed_a_inactive",
    status: "inactive",
    declared_priority: 1,
    source_record_id: "source_record.walking_skeleton.mixed_a_inactive"
  });
}

function mixedEligibleCandidateB(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.mixed_b_active",
    registry_record_id: "registry_record.walking_skeleton.mixed_b_active",
    status: "active",
    declared_priority: 20,
    source_record_id: "source_record.walking_skeleton.mixed_b_active"
  });
}

function tieBreakerCandidateA(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.tie_a",
    registry_record_id: "registry_record.walking_skeleton.tie_a",
    status: "active",
    declared_priority: 10,
    source_record_id: "source_record.walking_skeleton.tie_a"
  });
}

function tieBreakerCandidateB(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.tie_b",
    registry_record_id: "registry_record.walking_skeleton.tie_b",
    status: "active",
    declared_priority: 10,
    source_record_id: "source_record.walking_skeleton.tie_b"
  });
}

function constraintFailingCandidateA(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.constraint_a_high_risk",
    registry_record_id: "registry_record.walking_skeleton.constraint_a_high_risk",
    status: "active",
    declared_priority: 1,
    risk_level: "high",
    source_record_id: "source_record.walking_skeleton.constraint_a_high_risk"
  });
}

function constraintSatisfyingCandidateB(capability: PlannedCapability): ExecutorCandidate {
  return createExecutorCandidate(capability, {
    executor_id: "executor.walking_skeleton.constraint_b_low_risk",
    registry_record_id: "registry_record.walking_skeleton.constraint_b_low_risk",
    status: "active",
    declared_priority: 20,
    risk_level: "low",
    source_record_id: "source_record.walking_skeleton.constraint_b_low_risk"
  });
}

function createExecutorCandidate(
  capability: PlannedCapability,
  input: {
    readonly executor_id: string;
    readonly registry_record_id: string;
    readonly status: CandidateStatus;
    readonly declared_priority: number;
    readonly risk_level?: RiskLevel;
    readonly source_record_id: string;
  }
): ExecutorCandidate {
  return {
    executor_id: input.executor_id,
    metadata_version: "0.1.0",
    registry_record_id: input.registry_record_id,
    registry_record_version: "0.1.0",
    capability_id: capability.capability_id,
    capability_version: capability.capability_version,
    status: input.status,
    declared_permissions: ["workspace.read"],
    declared_side_effects: ["read"],
    eligibility_metadata: {
      required_adapters: [],
      risk_level: input.risk_level ?? "low",
      compatibility_status: "compatible"
    },
    ranking_metadata: {
      declared_priority: {
        value: input.declared_priority,
        governed_by: "registry_configuration",
        governed_version: "0.1.0",
        validated_by_registry: true
      }
    },
    provenance: {
      source_id: "registry_source.walking_skeleton.static",
      source_version: "0.1.0",
      source_record_id: input.source_record_id
    }
  };
}

function selectExecutor(lookup: RegistryLookup, policyDecision: PolicyDecision): ExecutorSelection {
  const considered = canonicalCandidates(lookup.candidates);
  const eligibility = considered.map(evaluateCandidateEligibility);
  const ineligible = eligibility.filter(isIneligibleCandidate);
  const eligibleCandidates = considered.filter((candidate) => isCandidateEligible(candidate, eligibility));
  const policyConstraintResults = evaluatePolicyConstraints(eligibleCandidates, policyDecision);
  const constraintDiscardedCandidates = policyConstraintResults
    .filter(isUnsatisfiedPolicyConstraint)
    .map(toPolicyConstraintDiscard);
  const constraintEligibleCandidates = eligibleCandidates.filter((candidate) =>
    satisfiesPolicyConstraints(candidate, policyConstraintResults)
  );
  const ranked = rankEligibleCandidates(constraintEligibleCandidates);
  const selected = ranked[0];
  if (selected === undefined) {
    throw new Error("Cannot select executor from an empty Registry candidate set.");
  }
  const selectionRule = walkingSkeletonSelectionRule();
  const tieBreakerApplied = wasTieBreakerApplied(ranked);
  return {
    selection_id: stableId("executor_selection", [
      lookup.registry_snapshot_id,
      lookup.capability_id,
      policyDecision.decision_id,
      selectionRule.selection_rule_id,
      selectionRule.selection_rule_version
    ]),
    selection_version: "0.1.0",
    selected: selected.candidate,
    considered,
    eligibility,
    ineligible,
    policy_constraint_results: policyConstraintResults,
    constraint_discarded_candidates: constraintDiscardedCandidates,
    ranked_eligible_candidates: ranked.map((entry) => toRankedCandidate(entry, selected.candidate)),
    alternatives_not_selected: ranked
      .slice(1)
      .map((entry) => toNonSelectedAlternative(entry, selected.candidate, selectionRule)),
    selection_rule: selectionRule,
    tie_breaker_applied: tieBreakerApplied,
    ranking_key_equalities: rankingKeyEqualitiesFor(ranked),
    tie_breaker_values: tieBreakerApplied ? ranked.map((entry) => tieBreakerValueFor(entry.candidate)) : [],
    discarded: [
      ...ineligible.map((candidate) => candidate.candidate_id),
      ...constraintDiscardedCandidates.map((candidate) => candidate.candidate_id)
    ],
    criterion_version: "0.1.0"
  };
}

function canonicalCandidates(candidates: readonly ExecutorCandidate[]): readonly ExecutorCandidate[] {
  return [...candidates].sort(compareCandidateIdentity);
}

function compareCandidateIdentity(left: ExecutorCandidate, right: ExecutorCandidate): number {
  return canonicalCandidateIdentity(left).localeCompare(canonicalCandidateIdentity(right));
}

function canonicalCandidateIdentity(candidate: ExecutorCandidate): string {
  return [
    candidate.executor_id,
    candidate.metadata_version,
    candidate.registry_record_id,
    candidate.registry_record_version
  ].join("|");
}

function rankEligibleCandidates(candidates: readonly ExecutorCandidate[]): readonly CandidateRankingEntry[] {
  return [...candidates]
    .sort(compareCandidateRanking)
    .map((candidate, index) => ({ candidate, rank: index + 1 }));
}

interface CandidateRankingEntry {
  readonly candidate: ExecutorCandidate;
  readonly rank: number;
}

function compareCandidateRanking(left: ExecutorCandidate, right: ExecutorCandidate): number {
  const priorityDiff = declaredPriorityFor(left) - declaredPriorityFor(right);
  return priorityDiff === 0 ? compareCandidateIdentity(left, right) : priorityDiff;
}

function walkingSkeletonSelectionRule(): SelectionRule {
  return {
    selection_rule_id: "executor_selection.walking_skeleton.default",
    selection_rule_version: "0.1.0",
    ranking_keys: [
      {
        key: "declared_priority",
        source: "registry_candidate_metadata",
        direction: "ascending",
        missing_value_behavior: "blocked"
      }
    ],
    final_tie_breaker: {
      key: "canonical_candidate_identity",
      fields: ["executor_id", "metadata_version", "registry_record_id", "registry_record_version"],
      direction: "ascending"
    }
  };
}

function toRankedCandidate(entry: CandidateRankingEntry, selected: ExecutorCandidate): RankedCandidate {
  const nonSelectionReason = nonSelectionReasonFor(entry.candidate, selected);
  return {
    ...toCandidateRef(entry.candidate),
    rank: entry.rank,
    ranking_factors: rankingFactorsFor(entry.candidate),
    selection_status: entry.rank === 1 ? "selected" : "eligible_not_selected",
    ...(entry.rank === 1 ? {} : { non_selection_reason: nonSelectionReason })
  };
}

function toNonSelectedAlternative(
  entry: CandidateRankingEntry,
  selected: ExecutorCandidate,
  selectionRule: SelectionRule
): NonSelectedAlternative {
  return {
    ...toCandidateRef(entry.candidate),
    rank: entry.rank,
    reason: nonSelectionReasonFor(entry.candidate, selected),
    selection_rule_id: selectionRule.selection_rule_id,
    selection_rule_version: selectionRule.selection_rule_version,
    ranking_factors: rankingFactorsFor(entry.candidate)
  };
}

function nonSelectionReasonFor(
  candidate: ExecutorCandidate,
  selected: ExecutorCandidate
): NonSelectedAlternative["reason"] {
  return declaredPriorityFor(candidate) === declaredPriorityFor(selected)
    ? "tie_breaker_ranked_lower"
    : "ranked_lower";
}

function rankingFactorsFor(candidate: ExecutorCandidate): readonly RankingFactor[] {
  const priority = candidate.ranking_metadata.declared_priority;
  return [
    {
      key: "declared_priority",
      value: priority.value,
      value_ref: {
        kind: "registry_record",
        id: candidate.registry_record_id,
        version: candidate.registry_record_version
      },
      governed_by: priority.governed_by,
      governed_version: priority.governed_version
    }
  ];
}

function evaluateCandidateEligibility(candidate: ExecutorCandidate): CandidateEligibility {
  if (candidate.status !== "active") {
    return {
      ...toCandidateRef(candidate),
      eligible: false,
      reason: "frozen_status_not_active",
      failed_criterion: "frozen_status_active_required",
      evidence_ref: registryRecordRef(candidate)
    };
  }
  return {
    ...toCandidateRef(candidate),
    eligible: true,
    reason: "eligible"
  };
}

function evaluatePolicyConstraints(
  candidates: readonly ExecutorCandidate[],
  policyDecision: PolicyDecision
): readonly PolicyConstraintEvaluation[] {
  if (policyDecision.constraint_set === undefined) {
    return [];
  }
  const constraintSet = policyDecision.constraint_set;
  return candidates.flatMap((candidate) =>
    constraintSet.constraints.map((constraint) => evaluatePolicyConstraint(candidate, constraintSet, constraint))
  );
}

function evaluatePolicyConstraint(
  candidate: ExecutorCandidate,
  constraintSet: PolicyConstraintSet,
  constraint: PolicyConstraint
): PolicyConstraintEvaluation {
  const observedValue = candidate.eligibility_metadata.risk_level;
  const satisfied = observedValue === constraint.value;
  return {
    ...toCandidateRef(candidate),
    constraint_set_ref: toPolicyConstraintSetRef(constraintSet),
    constraint_ref: {
      constraint_id: constraint.constraint_id,
      constraint_version: constraint.constraint_version
    },
    target: constraint.target,
    operator: constraint.operator,
    value_type: constraint.value_type,
    expected_value: constraint.value,
    observed_value: observedValue,
    observed_value_ref: registryRecordRef(candidate),
    outcome: satisfied ? "satisfied" : "unsatisfied",
    reason: satisfied ? "policy_constraint_satisfied" : "policy_constraint_unsatisfied"
  };
}

function isUnsatisfiedPolicyConstraint(evaluation: PolicyConstraintEvaluation): boolean {
  return evaluation.outcome === "unsatisfied";
}

function toPolicyConstraintDiscard(evaluation: PolicyConstraintEvaluation): PolicyConstraintDiscard {
  return {
    candidate_id: evaluation.candidate_id,
    candidate_metadata_version: evaluation.candidate_metadata_version,
    registry_record_id: evaluation.registry_record_id,
    registry_record_version: evaluation.registry_record_version,
    reason: "policy_constraint_unsatisfied",
    failure_code: "policy_constraint_failed",
    constraint_set_ref: evaluation.constraint_set_ref,
    constraint_ref: evaluation.constraint_ref,
    evidence: evaluation
  };
}

function satisfiesPolicyConstraints(
  candidate: ExecutorCandidate,
  evaluations: readonly PolicyConstraintEvaluation[]
): boolean {
  return evaluations
    .filter((evaluation) => evaluation.candidate_id === candidate.executor_id)
    .every((evaluation) => evaluation.outcome === "satisfied");
}

function isCandidateEligible(
  candidate: ExecutorCandidate,
  eligibility: readonly CandidateEligibility[]
): boolean {
  return eligibility.some((entry) => entry.candidate_id === candidate.executor_id && entry.eligible);
}

function isIneligibleCandidate(candidate: CandidateEligibility): candidate is CandidateIneligible {
  return !candidate.eligible
    && candidate.reason === "frozen_status_not_active"
    && candidate.failed_criterion === "frozen_status_active_required"
    && candidate.evidence_ref !== undefined;
}

function registryRecordRef(candidate: ExecutorCandidate): VersionedRef {
  return {
    kind: "registry_record",
    id: candidate.registry_record_id,
    version: candidate.registry_record_version
  };
}

function declaredPriorityFor(candidate: ExecutorCandidate): number {
  return candidate.ranking_metadata.declared_priority.value;
}

function wasTieBreakerApplied(ranked: readonly CandidateRankingEntry[]): boolean {
  return ranked.some((entry, index) => {
    const previous = ranked[index - 1];
    return previous !== undefined && declaredPriorityFor(previous.candidate) === declaredPriorityFor(entry.candidate);
  });
}

function rankingKeyEqualitiesFor(ranked: readonly CandidateRankingEntry[]): readonly RankingKeyEquality[] {
  const equalPriorityEntries = ranked.filter((entry, _index, entries) =>
    entries.some((other) =>
      other.candidate.executor_id !== entry.candidate.executor_id
      && declaredPriorityFor(other.candidate) === declaredPriorityFor(entry.candidate)
    )
  );
  if (equalPriorityEntries.length === 0) {
    return [];
  }
  return [
    {
      key: "declared_priority",
      value: declaredPriorityFor(equalPriorityEntries[0].candidate),
      candidate_ids: equalPriorityEntries.map((entry) => entry.candidate.executor_id),
      evidence_refs: equalPriorityEntries.map((entry) => registryRecordRef(entry.candidate))
    }
  ];
}

function tieBreakerValueFor(candidate: ExecutorCandidate): TieBreakerValue {
  return {
    ...toCandidateRef(candidate),
    tuple: [
      candidate.executor_id,
      candidate.metadata_version,
      candidate.registry_record_id,
      candidate.registry_record_version
    ]
  };
}

function runExecutorEffect(effect: Effect, state: WorkState): ExecutorOutput {
  void effect;
  const capability = state.plan.capabilities[0];
  const selection = requireExecutorSelection(state);
  const artifact = createArtifact(state, capability, selection.selected);
  return {
    status: "succeeded",
    summary: "Walking skeleton executor produced one deterministic artifact.",
    artifact
  };
}

function createArtifact(
  state: WorkState,
  capability: PlannedCapability,
  executor: ExecutorCandidate
): ArtifactEnvelope {
  return {
    artifact_version: "0.1.0",
    artifact_id: stableId("artifact", [state.task.trace_id, capability.capability_id]),
    artifact_type: "report",
    status: "final",
    title: "Walking Skeleton Result",
    source: {
      task_id: state.task.task_id,
      capability_id: capability.capability_id,
      executor_id: executor.executor_id,
      trace_id: state.task.trace_id
    },
    content: {
      format: "markdown",
      body: "# Walking Skeleton Result\n\nOne capability completed deterministically."
    },
    provenance: {
      created_at: logicalTime(20),
      created_by: "executor"
    },
    validation: {
      status: "unchecked",
      criteria: capability.success_criteria
    }
  };
}

function runArtifactEffect(effect: Effect, state: WorkState): ArtifactValidation {
  void effect;
  const artifact = state.artifacts[0];
  const validated: ArtifactEnvelope = {
    ...artifact,
    validation: {
      status: "valid",
      criteria: artifact.validation.criteria
    }
  };
  state.artifacts.splice(0, 1, validated);
  return { artifact: validated, status: "valid" };
}

function runResultEffect(effect: Effect, state: WorkState): ExecutionResult {
  void effect;
  return consolidateResult(state);
}

function consolidateResult(state: WorkState): ExecutionResult {
  const currentState = deriveState(state.events);
  if (currentState === "blocked") {
    return consolidateBlockedResult(state);
  }
  if (currentState === "failed") {
    return consolidateFailedResult(state);
  }
  const capability = state.plan.capabilities[0];
  const artifactRefs = state.artifacts.map(toArtifactRef);
  const eventRefs = state.events.map(toEventRef);
  const policyDecision = requirePolicyDecision(state);
  const registryLookup = lastRegistryLookup(state);
  const selection = requireExecutorSelection(state);
  return {
    result_version: "0.1.0",
    result_id: stableId("result", [state.task.trace_id, state.plan.plan_id]),
    task_id: state.task.task_id,
    plan_id: state.plan.plan_id,
    trace_id: state.task.trace_id,
    status: "succeeded",
    summary: "Walking Skeleton completed one deterministic capability.",
    capability_results: [
      {
        step_id: capability.step_id,
        capability_id: capability.capability_id,
        status: "succeeded",
        summary: "Capability completed and produced a validated artifact."
      }
    ],
    artifacts: artifactRefs,
    event_refs: eventRefs,
    decision_refs: [
      {
        kind: "policy",
        id: policyDecision.decision_id,
        version: policyDecision.decision_version
      },
      {
        kind: "registry_lookup",
        id: registryLookup.decision_id,
        version: registryLookup.decision_version
      },
      {
        kind: "executor_selection",
        id: selection.selection_id,
        version: selection.selection_version
      },
      {
        kind: "result",
        id: stableId("decision_result", [state.task.trace_id]),
        version: "0.1.0"
      }
    ],
    completed_at: logicalTime(30),
    policy_outcomes: [toPolicyOutcomeRef(policyDecision)]
  };
}

function consolidateBlockedResult(state: WorkState): ExecutionResult {
  const capability = state.plan.capabilities[0];
  const policyDecision = requirePolicyDecision(state);
  const registryLookup = registryNoCandidateLookup(state);
  if (registryLookup !== null) {
    return {
      result_version: "0.1.0",
      result_id: stableId("result", [state.task.trace_id, state.plan.plan_id]),
      task_id: state.task.task_id,
      plan_id: state.plan.plan_id,
      trace_id: state.task.trace_id,
      status: "blocked",
      summary: "Walking Skeleton blocked because the Registry snapshot had no eligible executor candidate.",
      capability_results: [
        {
          step_id: capability.step_id,
          capability_id: capability.capability_id,
          status: "blocked",
          summary: "Capability was not executed because Registry lookup returned no eligible candidate."
        }
      ],
      artifacts: [],
      event_refs: state.events.map(toEventRef),
      decision_refs: [
        {
          kind: "policy",
          id: policyDecision.decision_id,
          version: policyDecision.decision_version
        },
        {
          kind: "registry_lookup",
          id: registryLookup.decision_id,
          version: registryLookup.decision_version
        },
        {
          kind: "result",
          id: stableId("decision_result", [state.task.trace_id]),
          version: "0.1.0"
        }
      ],
      completed_at: logicalTime(30),
      pending: [
        `registry_no_candidate: provide a new versioned Registry snapshot replacing ${registryLookup.registry_snapshot_id}@${registryLookup.registry_snapshot_version} and containing at least one eligible candidate for ${registryLookup.capability_id}@${registryLookup.capability_version}.`
      ],
      errors: [
        {
          code: "no_executor_candidate",
          message: "Registry lookup completed with an explicit empty eligible candidate set.",
          retryable: false
        }
      ],
      policy_outcomes: [toPolicyOutcomeRef(policyDecision)]
    };
  }
  const requiredInput = policyDecision.required_input;
  const pending = requiredInput === null
    ? ["policy_denied: provide a new versioned remediation input before retrying."]
    : [`policy_denied: provide ${requiredInput.kind}:${requiredInput.id}@${requiredInput.version} before retrying.`];
  return {
    result_version: "0.1.0",
    result_id: stableId("result", [state.task.trace_id, state.plan.plan_id]),
    task_id: state.task.task_id,
    plan_id: state.plan.plan_id,
    trace_id: state.task.trace_id,
    status: "blocked",
    summary: "Walking Skeleton blocked by a correctable policy deny before Registry lookup.",
    capability_results: [
      {
        step_id: capability.step_id,
        capability_id: capability.capability_id,
        status: "blocked",
        summary: "Capability was not executed because policy denied progress before Registry lookup."
      }
    ],
    artifacts: [],
    event_refs: state.events.map(toEventRef),
    decision_refs: [
      {
        kind: "policy",
        id: policyDecision.decision_id,
        version: policyDecision.decision_version
      },
      {
        kind: "result",
        id: stableId("decision_result", [state.task.trace_id]),
        version: "0.1.0"
      }
    ],
    completed_at: logicalTime(30),
    pending,
    errors: [
      {
        code: "policy_denied",
        message: policyDecision.reason,
        retryable: false
      }
    ],
    policy_outcomes: [toPolicyOutcomeRef(policyDecision)]
  };
}

function registryNoCandidateLookup(state: WorkState): RegistryLookup | null {
  const lookup = state.registryLookups.at(-1);
  if (lookup === undefined || lookup.candidates.length > 0) {
    return null;
  }
  return lookup;
}

function consolidateFailedResult(state: WorkState): ExecutionResult {
  const capability = state.plan.capabilities[0];
  const policyDecision = requirePolicyDecision(state);
  return {
    result_version: "0.1.0",
    result_id: stableId("result", [state.task.trace_id, state.plan.plan_id]),
    task_id: state.task.task_id,
    plan_id: state.plan.plan_id,
    trace_id: state.task.trace_id,
    status: "failed",
    summary: "Walking Skeleton failed by a terminal policy deny before Registry lookup.",
    capability_results: [
      {
        step_id: capability.step_id,
        capability_id: capability.capability_id,
        status: "failed",
        summary: "Capability was not executed because policy terminally denied progress before Registry lookup."
      }
    ],
    artifacts: [],
    event_refs: state.events.map(toEventRef),
    decision_refs: [
      {
        kind: "policy",
        id: policyDecision.decision_id,
        version: policyDecision.decision_version
      },
      {
        kind: "result",
        id: stableId("decision_result", [state.task.trace_id]),
        version: "0.1.0"
      }
    ],
    completed_at: logicalTime(30),
    errors: [
      {
        code: "policy_denied_terminal",
        message: policyDecision.reason,
        retryable: false
      }
    ],
    policy_outcomes: [toPolicyOutcomeRef(policyDecision)]
  };
}

function finalizeRun(state: WorkState, result: ExecutionResult): WalkingSkeletonRun {
  const replayState = replayWalkingSkeletonState(state.events);
  const run = {
    scenario: state.scenario,
    task: state.task,
    plan: state.plan,
    commands: state.commands,
    runtime_contexts: state.runtimeContexts,
    registry_lookups: state.registryLookups,
    effects: state.effects,
    events: state.events,
    artifacts: state.artifacts,
    result,
    replay_state: replayState
  };
  return {
    ...run,
    fingerprint: canonicalStringify(run)
  };
}

export function replayWalkingSkeletonState(events: readonly WorkflowEvent[]): ExecutionState {
  return deriveState(events);
}

function deriveState(events: readonly WorkflowEvent[]): ExecutionState {
  if (events.length === 0) {
    return "initial";
  }
  return events[events.length - 1].state_transition.to;
}

function inputRefsFor(commandType: CommandType, state: WorkState): readonly VersionedRef[] {
  const base = [
    { kind: "task", id: state.task.task_id, version: state.task.task_version },
    { kind: "plan", id: state.plan.plan_id, version: state.plan.plan_version }
  ];
  const policyRefs = state.policyDecisions.map((decision) => ({
    kind: "policy_decision",
    id: decision.decision_id,
    version: decision.decision_version
  }));
  const registryRefs = state.registryLookups.map((lookup) => ({
    kind: "registry_snapshot",
    id: lookup.registry_snapshot_id,
    version: lookup.registry_snapshot_version
  }));
  const constraintSetRefs = constraintSetInputRefs(state.policyDecisions);
  if (commandType === "execution.policy.apply") {
    return [...base, ...policyRefs, ...constraintSetRefs];
  }
  if (commandType === "execution.result.consolidate") {
    return [...base, ...policyRefs, ...constraintSetRefs, ...registryRefs];
  }
  if (commandType === "execution.executor.select") {
    return [
      ...base,
      ...policyRefs,
      ...constraintSetRefs,
      ...registryRefs,
      {
        kind: "selection_rule",
        id: walkingSkeletonSelectionRule().selection_rule_id,
        version: walkingSkeletonSelectionRule().selection_rule_version
      }
    ];
  }
  if (commandType === "execution.registry.apply") {
    return [...base, ...policyRefs, ...registryRefs];
  }
  if (commandType === "execution.artifact.apply") {
    return [...base, ...state.artifacts.map((artifact) => ({
      kind: "artifact",
      id: artifact.artifact_id,
      version: artifact.artifact_version
    }))];
  }
  return base;
}

function effectRequestsFor(
  commandType: CommandType,
  state: WorkState,
  inputRefs: readonly VersionedRef[]
): readonly EffectRequest[] {
  return requestedEffectTypesFor(commandType, state).map((effectType) => ({
    effect_type: effectType,
    effect_version: "0.1.0",
    side_effects: sideEffectsFor(effectType),
    input_refs: inputRefs
  }));
}

function requestedEffectTypesFor(commandType: CommandType, state: WorkState): readonly EffectType[] {
  if (commandType === "execution.plan.resolve") {
    return ["policy.evaluate"];
  }
  if (commandType === "execution.policy.apply") {
    const decision = state.policyDecisions.at(-1);
    return decision?.outcome === "deny" ? ["result.consolidate"] : ["registry.lookup"];
  }
  if (commandType === "execution.registry.apply") {
    const lookup = state.registryLookups.at(-1);
    return lookup !== undefined && lookup.candidates.length === 0 ? ["result.consolidate"] : [];
  }
  if (commandType === "execution.executor.select") {
    return ["executor.invoke"];
  }
  if (commandType === "execution.capability.apply") {
    return ["artifact.validate"];
  }
  if (commandType === "execution.artifact.apply") {
    return ["result.consolidate"];
  }
  return [];
}

function constraintSetInputRefs(policyDecisions: readonly PolicyDecision[]): readonly VersionedRef[] {
  return policyDecisions.flatMap((decision) => {
    if (decision.constraint_set === undefined) {
      return [];
    }
    return [
      {
        kind: "policy_constraint_set",
        id: decision.constraint_set.constraint_set_id,
        version: decision.constraint_set.constraint_set_version
      }
    ];
  });
}

function targetFor(commandType: CommandType, state: WorkState): Command["target"] {
  switch (commandType) {
    case "execution.task.accept":
      return { kind: "task", id: state.task.task_id };
    case "execution.plan.resolve":
    case "execution.policy.apply":
    case "execution.registry.apply":
      return { kind: "plan", id: state.plan.plan_id };
    case "execution.executor.select":
    case "execution.capability.apply":
      return { kind: "capability", id: state.plan.capabilities[0].capability_id };
    case "execution.artifact.apply":
      return { kind: "artifact", id: state.artifacts[0]?.artifact_id ?? "artifact.pending" };
    case "execution.result.consolidate":
      return { kind: "result", id: stableId("result", [state.task.trace_id, state.plan.plan_id]) };
  }
}

function producerFor(eventType: EventType): WorkflowEvent["producer"]["component"] {
  if (eventType.startsWith("policy.")) {
    return "policy";
  }
  if (eventType.startsWith("registry.")) {
    return "registry";
  }
  if (eventType.startsWith("capability.")) {
    return "capability";
  }
  if (eventType.startsWith("artifact.")) {
    return "artifact_generation";
  }
  return "state_machine";
}

function subjectFor(eventType: EventType, state: WorkState): WorkflowEvent["subject"] {
  if (eventType.startsWith("policy.")) {
    return { kind: "policy", id: "walking_skeleton.policy" };
  }
  if (eventType.startsWith("registry.")) {
    return { kind: "registry", id: lastRegistryLookup(state).registry_snapshot_id };
  }
  if (eventType === "execution.executor.selected" || eventType === "execution.context.prepared") {
    return { kind: "executor_selection", id: state.plan.capabilities[0].step_id };
  }
  if (eventType.startsWith("capability.")) {
    return { kind: "capability", id: state.plan.capabilities[0].capability_id };
  }
  if (eventType.startsWith("artifact.")) {
    return { kind: "artifact", id: state.artifacts[0]?.artifact_id ?? "artifact.pending" };
  }
  if (eventType.startsWith("execution.result.") || eventType === "execution.completed") {
    return { kind: "result", id: stableId("result", [state.task.trace_id, state.plan.plan_id]) };
  }
  if (eventType.startsWith("execution.plan.")) {
    return { kind: "plan", id: state.plan.plan_id };
  }
  return { kind: "task", id: state.task.task_id };
}

function decisionFor(eventType: EventType, evidence: Evidence): WorkflowEvent["decision"] {
  if (eventType === "policy.check.completed") {
    if (evidence.kind === "policy" && evidence.decision.outcome === "deny") {
      return { kind: "policy_outcome", outcome: "denied" };
    }
    if (evidence.kind === "policy" && evidence.decision.outcome === "allow_with_constraints") {
      return { kind: "policy_outcome", outcome: "allowed_with_constraints" };
    }
    return { kind: "policy_outcome", outcome: "allowed" };
  }
  if (eventType === "policy.decision.denied") {
    return { kind: "policy_outcome", outcome: "denied" };
  }
  if (eventType === "registry.lookup.completed") {
    return { kind: "registry_lookup", outcome: "accepted" };
  }
  if (eventType === "registry.lookup.no_candidate") {
    return { kind: "registry_lookup", outcome: "no_candidate" };
  }
  if (eventType === "execution.executor.selected") {
    return { kind: "selection", outcome: "selected" };
  }
  if (eventType === "execution.blocked") {
    return { kind: "state_transition", outcome: "blocked" };
  }
  if (eventType === "execution.failed") {
    return { kind: "state_transition", outcome: "failed" };
  }
  if (eventType === "artifact.validation.completed") {
    return { kind: "validation", outcome: "succeeded" };
  }
  if (eventType.startsWith("execution.result.") && evidence.kind === "result" && evidence.result.status === "failed") {
    return { kind: "result", outcome: "failed" };
  }
  if (eventType.startsWith("execution.result.") && evidence.kind === "result" && evidence.result.status === "blocked") {
    return { kind: "result", outcome: "blocked" };
  }
  if (eventType === "execution.completed" || eventType.startsWith("execution.result.")) {
    return { kind: "result", outcome: "succeeded" };
  }
  return { kind: "state_transition", outcome: "accepted" };
}

function sideEffectsFor(effectType: EffectType): readonly SideEffect[] {
  if (effectType === "executor.invoke" || effectType === "artifact.validate") {
    return ["read", "write"];
  }
  return ["read"];
}

function expectedEvidenceFor(effectType: EffectType): readonly string[] {
  switch (effectType) {
    case "policy.evaluate":
      return ["policy_decision"];
    case "registry.lookup":
      return ["registry_snapshot"];
    case "executor.invoke":
      return ["executor_result", "artifact_ref"];
    case "artifact.validate":
      return ["event", "artifact_ref"];
    case "result.consolidate":
      return ["execution_result"];
  }
}

function toArtifactRef(artifact: ArtifactEnvelope): ArtifactRef {
  return {
    artifact_id: artifact.artifact_id,
    artifact_version: artifact.artifact_version,
    artifact_type: artifact.artifact_type,
    status: artifact.status
  };
}

function toEventRef(event: WorkflowEvent): EventRef {
  return {
    event_id: event.event_id,
    event_version: event.event_version,
    event_type: event.event_type
  };
}

function toPolicyOutcomeRef(decision: PolicyDecision): PolicyOutcomeRef {
  return {
    decision_id: decision.decision_id,
    decision_version: decision.decision_version,
    outcome: decision.outcome,
    ...(decision.constraint_set === undefined ? {} : { constraint_set_ref: toPolicyConstraintSetRef(decision.constraint_set) })
  };
}

function toPolicyConstraintSetRef(constraintSet: PolicyConstraintSet): PolicyConstraintSetRef {
  return {
    constraint_set_id: constraintSet.constraint_set_id,
    constraint_set_version: constraintSet.constraint_set_version,
    constraint_set_schema_version: constraintSet.constraint_set_schema_version,
    constraint_set_digest: constraintSet.constraint_set_digest
  };
}

function requirePolicyDecision(state: WorkState): PolicyDecision {
  const decision = state.policyDecisions.at(-1);
  if (decision === undefined) {
    throw new Error("Expected policy decision.");
  }
  return decision;
}

function requireExecutorSelection(state: WorkState): ExecutorSelection {
  const selection = state.executorSelections.at(-1);
  if (selection === undefined) {
    throw new Error("Expected executor selection.");
  }
  return selection;
}

function requireRunSelection(run: WalkingSkeletonRun): ExecutorSelectionEventRef {
  const selectedEvent = run.events.find((event) => event.event_type === "execution.executor.selected");
  if (selectedEvent?.selection_ref === undefined) {
    throw new Error("Expected executor selection event.");
  }
  return selectedEvent.selection_ref;
}

function requireRunRegistryLookup(run: WalkingSkeletonRun): RegistryLookup {
  const lookup = run.registry_lookups.at(-1);
  if (lookup === undefined) {
    throw new Error("Expected Registry lookup.");
  }
  return lookup;
}

function eventInputRefs(context: RuntimeContext, evidence: Evidence): readonly VersionedRef[] {
  if (evidence.kind === "registry") {
    return [
      ...context.input_refs,
      {
        kind: "registry_lookup",
        id: evidence.lookup.lookup_id,
        version: evidence.lookup.lookup_version
      },
      {
        kind: "registry_lookup_decision",
        id: evidence.lookup.decision_id,
        version: evidence.lookup.decision_version
      }
    ];
  }
  if (evidence.kind === "selection") {
    const constraintSetRef = evidence.selection.policy_constraint_results[0]?.constraint_set_ref;
    const constraintRefs = constraintSetRef === undefined
      ? []
      : [{ kind: "policy_constraint_set", id: constraintSetRef.constraint_set_id, version: constraintSetRef.constraint_set_version }];
    return [
      ...context.input_refs,
      ...constraintRefs,
      {
        kind: "executor_selection",
        id: evidence.selection.selection_id,
        version: evidence.selection.selection_version
      },
      {
        kind: "selection_rule",
        id: evidence.selection.selection_rule.selection_rule_id,
        version: evidence.selection.selection_rule.selection_rule_version
      },
      ...evidence.selection.considered.map((candidate) => ({
        kind: "executor_metadata",
        id: candidate.executor_id,
        version: candidate.metadata_version
      }))
    ];
  }
  if (evidence.kind !== "policy") {
    return context.input_refs;
  }
  const policyRefs: VersionedRef[] = [
    {
      kind: "policy_decision",
      id: evidence.decision.decision_id,
      version: evidence.decision.decision_version
    },
    {
      kind: "policy",
      id: evidence.decision.policy_id,
      version: evidence.decision.policy_version
    }
  ];
  if (evidence.decision.required_input !== null) {
    policyRefs.push(evidence.decision.required_input);
  }
  if (evidence.decision.constraint_set !== undefined) {
    policyRefs.push({
      kind: "policy_constraint_set",
      id: evidence.decision.constraint_set.constraint_set_id,
      version: evidence.decision.constraint_set.constraint_set_version
    });
  }
  return [...context.input_refs, ...policyRefs];
}

function registryRefFor(eventType: EventType, evidence: Evidence): RegistryEventRef | undefined {
  if (!eventType.startsWith("registry.") || evidence.kind !== "registry") {
    return undefined;
  }
  return {
    registry_snapshot_id: evidence.lookup.registry_snapshot_id,
    registry_snapshot_version: evidence.lookup.registry_snapshot_version,
    registry_snapshot_schema_version: evidence.lookup.registry_snapshot_schema_version,
    registry_source_ref: evidence.lookup.registry_source_ref,
    registry_snapshot_digest: evidence.lookup.registry_snapshot_digest,
    snapshot_scope: evidence.lookup.snapshot_scope,
    lookup_criteria: evidence.lookup.lookup_criteria,
    capability_id: evidence.lookup.capability_id,
    capability_version: evidence.lookup.capability_version,
    considered_candidates: evidence.lookup.considered_candidates.map(toCandidateRef),
    discarded_candidates: evidence.lookup.discarded_candidates,
    eligible_candidate_count: evidence.lookup.candidates.length
  };
}

function selectionRefFor(eventType: EventType, state: WorkState, evidence: Evidence): ExecutorSelectionEventRef | undefined {
  if (eventType !== "execution.executor.selected" || evidence.kind !== "selection") {
    return undefined;
  }
  const policyDecision = requirePolicyDecision(state);
  const registryLookup = lastRegistryLookup(state);
  const selectedCandidate = toCandidateRef(evidence.selection.selected);
  const constraintSetRef = policyDecision.constraint_set === undefined
    ? undefined
    : toPolicyConstraintSetRef(policyDecision.constraint_set);
  return {
    selection_id: evidence.selection.selection_id,
    selection_version: evidence.selection.selection_version,
    task_ref: {
      kind: "task",
      id: state.task.task_id,
      version: state.task.task_version
    },
    plan_ref: {
      kind: "capability_plan",
      id: state.plan.plan_id,
      version: state.plan.plan_version
    },
    capability_id: registryLookup.capability_id,
    capability_version: registryLookup.capability_version,
    registry_snapshot_id: registryLookup.registry_snapshot_id,
    registry_snapshot_version: registryLookup.registry_snapshot_version,
    registry_snapshot_schema_version: registryLookup.registry_snapshot_schema_version,
    registry_source_ref: registryLookup.registry_source_ref,
    registry_snapshot_digest: registryLookup.registry_snapshot_digest,
    snapshot_scope: registryLookup.snapshot_scope,
    lookup_criteria: registryLookup.lookup_criteria,
    policy_decision_id: policyDecision.decision_id,
    policy_decision_version: policyDecision.decision_version,
    policy_constraints: constraintSetRef === undefined ? [] : [constraintSetRef],
    ...(constraintSetRef === undefined ? {} : { constraint_set_ref: constraintSetRef }),
    selection_rule_id: evidence.selection.selection_rule.selection_rule_id,
    selection_rule_version: evidence.selection.selection_rule.selection_rule_version,
    considered_candidates: evidence.selection.considered.map(toCandidateRef),
    eligibility: evidence.selection.eligibility,
    ineligible_candidates: evidence.selection.ineligible,
    policy_constraint_results: evidence.selection.policy_constraint_results,
    constraint_discarded_candidates: evidence.selection.constraint_discarded_candidates,
    ranked_eligible_candidates: evidence.selection.ranked_eligible_candidates,
    selected_candidate: selectedCandidate,
    alternatives_not_selected: evidence.selection.alternatives_not_selected,
    tie_breaker_applied: evidence.selection.tie_breaker_applied,
    tie_breaker: evidence.selection.selection_rule.final_tie_breaker,
    ranking_key_equalities: evidence.selection.ranking_key_equalities,
    tie_breaker_values: evidence.selection.tie_breaker_values
  };
}

function toCandidateRef(candidate: ExecutorCandidate): CandidateRef {
  return {
    candidate_id: candidate.executor_id,
    candidate_metadata_version: candidate.metadata_version,
    registry_record_id: candidate.registry_record_id,
    registry_record_version: candidate.registry_record_version
  };
}

function previousEventId(events: readonly WorkflowEvent[], transitionEvents: readonly WorkflowEvent[]): string | null {
  if (transitionEvents.length > 0) {
    return transitionEvents[transitionEvents.length - 1].event_id;
  }
  return lastEventId(events);
}

function lastEventId(events: readonly WorkflowEvent[]): string | null {
  return events.length === 0 ? null : events[events.length - 1].event_id;
}

function lastCommandId(commands: readonly Command[]): string | null {
  return commands.length === 0 ? null : commands[commands.length - 1].command_id;
}

function lastRegistryLookup(state: WorkState): RegistryLookup {
  const lookup = state.registryLookups.at(-1);
  if (lookup === undefined) {
    return {
      lookup_id: "registry_lookup.pending",
      lookup_version: "0.1.0",
      decision_id: "registry_lookup_decision.pending",
      decision_version: "0.1.0",
      registry_snapshot_id: "registry_snapshot.pending",
      registry_snapshot_version: "0.1.0",
      registry_snapshot_schema_version: "0.1.0",
      registry_source_ref: registrySourceRefFor(),
      registry_snapshot_digest: "snapshot_digest.pending",
      snapshot_scope: {
        scope_type: "lookup_scoped",
        description: "Pending Registry lookup scope."
      },
      lookup_criteria: {
        capability_id: state.plan.capabilities[0].capability_id,
        capability_version: state.plan.capabilities[0].capability_version,
        include_inactive: false,
        candidate_types: ["execution_candidate"],
        required_permissions: ["workspace.read"],
        required_side_effects: ["read"],
        policy_constraint_refs: []
      },
      capability_id: state.plan.capabilities[0].capability_id,
      capability_version: state.plan.capabilities[0].capability_version,
      considered_candidates: [],
      candidates: [],
      discarded_candidates: []
    };
  }
  return lookup;
}

function logicalTime(sequence: number): string {
  return `2026-07-11T12:00:${String(sequence).padStart(2, "0")}.000Z`;
}

function stableId(prefix: string, parts: readonly string[]): string {
  const source = [prefix, ...parts].join("|");
  let hash = 2166136261;
  for (const char of source) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${prefix}_${hash.toString(16).padStart(8, "0")}`;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isPlainObject(value)) {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonicalize(value[key]);
    }
    return output;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
