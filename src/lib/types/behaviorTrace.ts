import type { SuggestionBucket } from '$lib/utils/conversationalContextResolver';

/**
 * Per-suggestion ranking metadata for the DEV trace panel.
 *
 * Populated by re-running `scoreFollowUpSuggestion` and `getSuggestionBucket`
 * on the final suggestion list (post-diversity-pass) using the same
 * SuggestionRankingContext that `buildAnswerFollowUpSuggestions` used.
 *
 * Scores are deterministic — same inputs always produce the same value.
 * The diversity pass may reorder suggestions relative to raw score order;
 * `finalPosition` reflects the post-diversity index, not the raw-score rank.
 */
export interface SuggestionTraceEntry {
	/** The suggestion text as displayed in the UI. */
	text: string;

	/**
	 * 0-based index in the final suggestion list after
	 * `buildAnswerFollowUpSuggestions` → `applyDiversityPass` → `.slice(0, 4)`.
	 */
	finalPosition: number;

	/**
	 * Score from `scoreFollowUpSuggestion` — the same value used during real ranking.
	 * Higher is better. Ties in the ranked pool preserve original insertion order.
	 */
	score: number;

	/**
	 * Semantic bucket assigned by `getSuggestionBucket`.
	 * One of: 'person' | 'action' | 'time' | 'location' | 'evidence' | 'reasoning' | 'general'
	 */
	bucket: SuggestionBucket;

	/** True for the top-ranked final suggestion (finalPosition === 0). */
	isTopChip: boolean;
}

/**
 * Structured summary of how the conversational context resolver processed
 * the current turn.
 *
 * All fields are derived from values already produced by `resolveConversationalQuery`,
 * `computeAnchorConfidence`, and the guard sequence in `Chat.svelte`.
 * No resolver logic is re-run to produce this object.
 */
export interface ContextResolutionTrace {
	/**
	 * Raw text the user submitted. Mirrors `BehaviorTrace.inputQuery`; included
	 * here so this object is self-contained for inspection purposes.
	 */
	originalQuery: string;

	/**
	 * Final query after all rewrites (context expansion and/or first-turn fallback).
	 * Mirrors `BehaviorTrace.resolvedQuery`.
	 */
	resolvedQuery: string;

	/** Whether `isContextDependent` classified the query as a follow-up. */
	contextDependent: boolean;

	/** Number of prior turns (user + assistant messages) when resolution ran. */
	priorTurnsCount: number;

	/** True when `buildConversationState` returned a non-null state object. */
	usedPriorState: boolean;

	/**
	 * Key signals from `ConversationState` that were available for query expansion.
	 * Present only when `usedPriorState` is true. Surfaces the most diagnostic
	 * fields without exposing the full state object.
	 */
	stateSignals?: {
		/** Full text of the anchor question (the last self-contained user query). */
		topic: string;
		/** Primary named entity extracted from the AI answer to the anchor question. */
		entity: string | null;
		/** Predicate body from the anchor question (stripped of interrogative + auxiliary). */
		actionBody: string | null;
		/** Location phrase extracted from the anchor turn. */
		location: string | null;
		/** Date hint from recent AI answers, used to anchor time follow-ups. */
		dateHint: string | null;
		/** Question type of the anchor question (who / what / when / where / why / how). */
		lastQuestionType: string;
		/**
		 * ConversationState's own confidence signal.
		 * `'high'` when at least one entity or location was extracted; `'low'` otherwise.
		 */
		stateConfidence: 'high' | 'low';
	};

	/**
	 * True when Guard 2 (`computeAnchorConfidence`) was evaluated for this turn.
	 * Equivalent to `anchorConfidence !== undefined` on the parent trace.
	 */
	anchorDetected: boolean;

	/** Confidence level from `computeAnchorConfidence`. Present when `anchorDetected` is true. */
	anchorConfidenceLevel?: 'low' | 'medium' | 'high';

	/** Scoring factors from `computeAnchorConfidence`. Present when `anchorDetected` is true. */
	anchorConfidenceFactors?: string[];

	/**
	 * Which resolution strategy was applied for this turn. Derived deterministically
	 * from the guard decision and context signals after guards complete.
	 *
	 * - `'self_contained'`              — query not context-dependent; sent as-is
	 * - `'first_turn_fallback'`         — first turn, safe investigative rewrite applied
	 * - `'state_resolved'`              — context-dependent; ConversationState used to expand
	 * - `'clarification_no_context'`    — no state; clarification injected, no backend call
	 * - `'clarification_low_confidence'`— low anchor confidence; clarification injected
	 * - `'intake_bypassed'`             — intake intent detected; Q&A path skipped entirely
	 */
	resolutionStrategy:
		| 'self_contained'
		| 'first_turn_fallback'
		| 'state_resolved'
		| 'clarification_no_context'
		| 'clarification_low_confidence'
		| 'intake_bypassed';
}

/**
 * Machine-stable reason codes for guard outcomes.
 *
 * Each code corresponds to one observable fact about the guard path taken
 * for a given turn. Multiple codes may be emitted per turn — they are ordered
 * from cause to effect, mirroring the `reasons` narrative array.
 *
 * These codes are stable identifiers for testing, comparison, and future
 * tooling. The `reasons` string array remains the human-readable counterpart.
 */
export type GuardReasonCode =
	| 'INTAKE_BYPASSED'
	| 'SELF_CONTAINED_QUERY'
	| 'FIRST_TURN_NO_STATE'
	| 'FIRST_TURN_FALLBACK_MATCHED'
	| 'FIRST_TURN_NO_PATTERN_MATCH'
	| 'MULTI_TURN_NO_STABLE_ANCHOR'
	| 'ANCHOR_CONFIDENCE_LOW'
	| 'ANCHOR_CONFIDENCE_MEDIUM'
	| 'ANCHOR_CONFIDENCE_HIGH'
	| 'CLARIFICATION_INJECTED'
	| 'PROCEEDED_TO_RETRIEVAL';

/**
 * Structured explanation of why the guard layer chose a given outcome.
 *
 * Every field is derived from variables that already existed in the guard
 * sequence — no new logic runs and no new decisions are made to produce this.
 * Assembly happens after all guards have completed, using only read-only
 * snapshots of their outputs.
 */
export interface GuardExplanation {
	/**
	 * True when `priorTurns.length === 0` at guard evaluation time.
	 * Distinguishes first-turn clarification from multi-turn clarification.
	 */
	isFirstTurn: boolean;

	/** True when `ctxResolution.state !== null` — a stable anchor was built. */
	statePresent: boolean;

	/**
	 * True when the Guard 1 first-turn sub-path was entered:
	 * context-dependent && no state && first turn && no intake intent.
	 */
	firstTurnFallbackAttempted: boolean;

	/**
	 * True when `resolveFirstTurnFallback` returned a non-null rewrite.
	 * Only meaningful when `firstTurnFallbackAttempted` is true.
	 */
	firstTurnFallbackMatched: boolean;

	/**
	 * True when Guard 2 (`computeAnchorConfidence`) was evaluated.
	 * Equivalent to `anchorConfidence !== undefined` on the parent trace.
	 */
	anchorConfidenceChecked: boolean;

	/**
	 * Human-readable explanation of the guard outcome derived from the signals
	 * above. Each entry is a single sentence. Order is decision-narrative order.
	 * Accurate because it is generated from the same variables the real guards used.
	 */
	reasons: string[];

	/**
	 * Machine-stable codes corresponding to the `reasons` entries above.
	 * Same length and order as `reasons`. Use these for testing and comparison;
	 * use `reasons` for human display.
	 */
	codes: GuardReasonCode[];
}

/**
 * Ephemeral observability record for a single case-chat turn.
 *
 * Captured passively inside Chat.svelte during the submit flow and attached
 * to the assistant message object for in-session inspection. Never sent to
 * any backend, never persisted to localStorage or IndexedDB.
 *
 * All data is derived from existing function outputs — no new logic runs to
 * produce a BehaviorTrace.
 */
export interface BehaviorTrace {
	/** The raw text the user submitted. */
	inputQuery: string;

	/**
	 * The query sent to retrieval after context resolution and/or first-turn
	 * fallback rewriting. Identical to inputQuery when no rewriting occurred.
	 */
	resolvedQuery: string;

	/** True when the query was classified as a context-dependent follow-up. */
	contextDependent: boolean;

	/**
	 * ConversationState built from turn history, or null when no stable
	 * anchor was found. Typed as `any` to avoid coupling this type to the
	 * resolver's internal ConversationState interface.
	 */
	state: any | null;

	/**
	 * Structured summary of how the context resolver processed this turn.
	 * Present on all paths where BehaviorTrace is assembled (clarification + success).
	 * See `ContextResolutionTrace` for field semantics.
	 */
	contextResolution?: ContextResolutionTrace;

	/**
	 * Result of `computeAnchorConfidence`, populated only when Guard 2 ran
	 * (i.e. the query was context-dependent and state was non-null).
	 */
	anchorConfidence?: {
		level: 'low' | 'medium' | 'high';
		/** Human-readable scoring factors (entity, location, action, date, ai-answer). */
		factors: string[];
	};

	/**
	 * Which path the guard layer chose for this turn.
	 *
	 * - `first_turn_fallback`       — context-dependent first turn; safe generic rewrite applied.
	 * - `clarification_no_context`  — no usable state; clarification injected, no backend call.
	 * - `clarification_low_confidence` — state present but anchor too weak; clarification injected.
	 * - `proceed`                   — guards passed; query sent to retrieval normally.
	 */
	guardDecision:
		| 'first_turn_fallback'
		| 'clarification_no_context'
		| 'clarification_low_confidence'
		| 'proceed';

	/**
	 * Structured explanation of the guard outcome. Present on all paths (clarification
	 * and success) where BehaviorTrace is assembled. Absent only for intake-intent turns.
	 * See `GuardExplanation` for field semantics.
	 */
	guardExplanation?: GuardExplanation;

	/**
	 * Investigative context classified by `detectQueryContext` for the suggestion
	 * pipeline. Only present on the `proceed` path after a successful answer.
	 */
	queryContext?: 'person' | 'timeline' | 'location' | 'evidence' | 'general';

	/**
	 * Follow-up suggestions with ranking breakdown. Only present on the `proceed`
	 * path after a successful answer. Each entry carries the final position, score,
	 * semantic bucket, and top-chip flag from the real ranking pipeline.
	 * See `SuggestionTraceEntry` for field semantics.
	 */
	suggestions?: SuggestionTraceEntry[];
}
