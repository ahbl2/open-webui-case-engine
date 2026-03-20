/**
 * Conversational context resolution for Case Engine chat.
 *
 * Short follow-up queries ("who", "when", "where", etc.) carry no useful search terms
 * on their own — the RAG tokenizer strips them as stopwords and the LLM receives no
 * context. This utility builds a ConversationState from the turn history and uses it to
 * expand follow-up queries into fully self-contained questions.
 *
 * Key guarantees:
 *  - Drift prevention: context-dependent messages ("who", "them", …) are never used as
 *    the anchor; the resolver walks back to the last full, standalone user question.
 *  - Entity continuity: proper nouns found in AI answers (which name the "who" answer)
 *    are preferred over entities extracted from the question alone.
 *  - Same-interrogative: "who" after a "who" question returns the anchor as-is, not a
 *    recursive expansion.
 *  - Pure: no network call, no Svelte store dependency. Fully testable.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ConversationTurn {
	role: 'user' | 'assistant';
	content: string;
}

export type QuestionType = 'who' | 'what' | 'when' | 'where' | 'why' | 'how' | 'other';

export interface ConversationState {
	/** Full text of the anchor user question (the last non-context-dependent one). */
	topic: string;
	/** Excerpt of the assistant answer to the anchor question (≤ 300 chars). */
	anchorAnswer: string | null;
	/** All proper nouns found across the last 8 turns. */
	entities: string[];
	/**
	 * Primary entity: first proper noun found in the AI answer to the anchor question.
	 * AI answers name the entity the prior question was asking about (e.g. "Mangis
	 * carried the bags…" names the "who" answer).
	 */
	entity: string | null;
	/** Predicate body of the anchor question (stripped of the interrogative + auxiliary). */
	actionBody: string | null;
	/** Location phrase extracted from the anchor turn. */
	location: string | null;
	/**
	 * Date of the event being discussed, extracted from recent AI answers.
	 * Used by time-follow-up resolution to anchor "what time was it?" to the
	 * specific event rather than drifting to unrelated timestamps.
	 */
	dateHint: string | null;
	/** Question type of the anchor user question. */
	lastQuestionType: QuestionType;
	/** High when at least one entity or location was extracted; Low otherwise. */
	confidence: 'high' | 'low';
}

export interface ResolvedQuery {
	/** The query to send to the AI (may be expanded). */
	resolved: string;
	/** What the user actually typed (stored for audit/display). */
	original: string;
	/** True when the query was rewritten using conversation context. */
	contextDependent: boolean;
	/** State used for the resolution (for debug logging). */
	state: ConversationState | null;
}

/**
 * The specific event the conversation is currently anchored to, derived from
 * the conversation state. Used for anchor confidence scoring and clarification hints.
 */
export interface EventAnchor {
	entity: string | null;
	actionBody: string | null;
	location: string | null;
	dateHint: string | null;
	/** Excerpt of the AI answer that established this anchor (≤ 150 chars). */
	sourceExcerpt: string | null;
}

/** Result of `computeAnchorConfidence`. */
export interface AnchorResult {
	level: 'high' | 'medium' | 'low';
	/** Human-readable factors that contributed to the score (for logging). */
	factors: string[];
	anchor: EventAnchor;
}

/**
 * Result of `buildProgressiveClarification`.
 * Used to inject a conversational assistant message when a query cannot be
 * safely resolved, replacing the previous hard-block toast.
 */
export interface ClarificationResult {
	/** The clarification message to show the user as an assistant reply. */
	message: string;
	/** Whether context was entirely absent or just insufficiently anchored. */
	type: 'no_context' | 'low_confidence';
	/** Ranked follow-up suggestion strings to render as clickable chips. */
	suggestions?: string[];
}

/**
 * Context passed to `rankFollowUpSuggestions`.
 * Keep this minimal — scoring is deterministic and does not call external services.
 */
export interface SuggestionRankingContext {
	/** Question type of the current query (drives progression preferences). */
	questionType: QuestionType;
	/** Current conversation state, if any (enables entity/location boosting). */
	state: ConversationState | null;
	/** The raw current query string (enables redundancy detection and time-question override). */
	currentQuery: string;
	/**
	 * High-level query context derived by `detectQueryContext`.
	 * When supplied, enables targeted context-specific score boosts in the scorer.
	 */
	queryContext?: QueryContext;
}

/**
 * High-level investigative context for the current turn.
 * Used to select context-appropriate base suggestions and apply targeted scoring boosts.
 */
export type QueryContext = 'person' | 'timeline' | 'location' | 'evidence' | 'general';

/**
 * Classify the current turn into a high-level investigative context so
 * suggestion generation and ranking can make context-appropriate choices.
 *
 * Priority order (first match wins):
 *   1. Evidence keywords in the query
 *   2. Entity + who/what → person focus
 *   3. Location + where → location focus
 *   4. Rich event state (actionBody/dateHint) → timeline focus
 *   5. Entity present (weak signal) → person focus
 *   6. Fallback → general
 */
export function detectQueryContext(
	state: ConversationState | null,
	questionType: QuestionType,
	currentQuery: string
): QueryContext {
	const q = currentQuery.toLowerCase();

	if (/\b(evidence|important|significant|supports?|proves?|key finding|critical)\b/.test(q)) {
		return 'evidence';
	}
	if (state?.entity && (questionType === 'who' || questionType === 'what')) {
		return 'person';
	}
	if (state?.location && questionType === 'where') {
		return 'location';
	}
	if (state?.actionBody || state?.dateHint) {
		return 'timeline';
	}
	if (state?.entity) {
		return 'person';
	}
	return 'general';
}

// ─── Context-dependency detection ────────────────────────────────────────────

const BARE_INTERROGATIVES = new Set([
	'who', 'when', 'where', 'what', 'why', 'how', 'whom', 'whose',
	'who?', 'when?', 'where?', 'what?', 'why?', 'how?',
]);

const CONTEXT_DEPENDENT_PHRASES = [
	/^(they|them|he|she|it|those|these|that|this)\??$/i,
	/^(who was it|who did it|who did that)\??$/i,
	/^(how so|how come|how long|how many|how much)\??$/i,
	/^(what about|what else|what next|what then|and then|tell me more|more detail|elaborate)\??$/i,
	/^(when exactly|when did this|when was that|when did they)\??$/i,
	/^(where exactly|where did this|where was that|where did they)\??$/i,
	/^(why did they|why did he|why did she|why so)\??$/i,
	// Time follow-ups — "it" / "that" makes them context-dependent; bare "what time" too.
	/^what\s+time\??\s*$/i,
	/^what\s+time\s+(was\s+it|did\s+it|was\s+that|did\s+that|did\s+this|was\s+this)\b/i,
	/^what\s+was\s+the\s+time\??\s*$/i,
	/^at\s+what\s+time\??\s*$/i,
	// Pronoun-referencing "where/when/what was this/it" forms
	/^(where\s+was\s+(this|it)|where\s+is\s+(this|it))\??\s*$/i,
	/^(when\s+was\s+(this|it)|when\s+did\s+(this|it))\??\s*$/i,
	/^(what\s+was\s+(this|it)|what\s+is\s+(this|it))\??\s*$/i,
	// Generic event follow-ups
	/^what\s+happened\??\s*$/i,
	/^what\s+happened\s+(next|after|then|afterwards)\??\s*$/i,
	/^what\s+was\s+(the\s+)?(outcome|result|conclusion|finding)\??\s*$/i,
];

export function isContextDependent(query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return false;
	if (BARE_INTERROGATIVES.has(q)) return true;
	return CONTEXT_DEPENDENT_PHRASES.some((re) => re.test(q));
}

/**
 * True when the query is specifically asking about the time of a prior event.
 * Called from `resolveWithState` to select the event-anchored time resolution path.
 */
export function isTimeQuestion(query: string): boolean {
	const q = query.trim().toLowerCase();
	return (
		/^what\s+time\b/.test(q) ||
		/^at\s+what\s+time\b/.test(q) ||
		/^what\s+was\s+the\s+time\b/.test(q)
	);
}

// ─── Question type classification ─────────────────────────────────────────────

export function classifyQuestionType(query: string): QuestionType {
	const q = query.trim().toLowerCase().replace(/\?+$/, '').trim();
	if (/^who\b/.test(q)) return 'who';
	if (/^what\b/.test(q)) return 'what';
	if (/^when\b/.test(q)) return 'when';
	if (/^where\b/.test(q)) return 'where';
	if (/^why\b/.test(q)) return 'why';
	if (/^how\b/.test(q)) return 'how';
	return 'other';
}

// ─── Proper noun extraction ───────────────────────────────────────────────────

/**
 * Capitalised words that commonly appear at sentence starts or as pronoun/article forms
 * and should NOT be treated as named entities.
 */
const COMMON_CAPS = new Set([
	'Who', 'What', 'When', 'Where', 'Why', 'How', 'Which', 'Whose', 'Whom',
	'Is', 'Are', 'Was', 'Were', 'Has', 'Have', 'Had', 'Do', 'Does', 'Did',
	'Will', 'Would', 'Could', 'Should', 'May', 'Might', 'Shall', 'Can',
	'The', 'This', 'That', 'These', 'Those', 'A', 'An',
	'He', 'She', 'It', 'They', 'We', 'I', 'You',
	'My', 'Your', 'His', 'Her', 'Its', 'Our', 'Their',
	'Based', 'According', 'Given', 'However', 'Therefore', 'Note', 'Please',
	'Yes', 'No', 'Not', 'Also', 'But', 'And', 'Or', 'If',
	'In', 'On', 'At', 'To', 'Of', 'By', 'For', 'From', 'With', 'About', 'Into',
	'New', 'Same', 'First', 'Last', 'Next', 'Other', 'Some', 'Most', 'Any', 'All',
	'Case', 'Evidence', 'Timeline',
]);

/**
 * Extract proper nouns from text. Captures both single-word names (e.g. "Mangis") and
 * multi-word place names that end with a location noun (e.g. "Preston address").
 */
export function extractProperNouns(text: string): string[] {
	const words = text.split(/\s+/);
	const found: string[] = [];
	const seen = new Set<string>();
	const PLACE_SUFFIXES = /^(?:address|street|road|lane|avenue|ave|drive|place|yard|warehouse|estate|park|st\.|rd\.)$/i;

	for (let i = 0; i < words.length; i++) {
		const raw = words[i].replace(/[^a-zA-Z'-]/g, '');
		if (raw.length < 2 || !/^[A-Z]/.test(raw) || COMMON_CAPS.has(raw)) continue;

		// Try to extend into a multi-word proper noun phrase (e.g. "Preston address")
		let phrase = raw;
		let consumed = i;
		for (let j = i + 1; j < words.length && j < i + 5; j++) {
			const next = words[j].replace(/[^a-zA-Z'.-]/g, '');
			if (!next) break;
			if (PLACE_SUFFIXES.test(next)) {
				phrase += ' ' + next;
				consumed = j;
				break;
			}
			if (/^[A-Z]/.test(next) && !COMMON_CAPS.has(next)) {
				phrase += ' ' + next;
				consumed = j;
			} else {
				break;
			}
		}
		i = consumed;

		if (!seen.has(phrase.toLowerCase())) {
			seen.add(phrase.toLowerCase());
			found.push(phrase);
		}
	}
	return found;
}

// ─── Location extraction ──────────────────────────────────────────────────────

export function extractLocation(text: string): string | null {
	const patterns = [
		// "the Preston address", "the warehouse on Dock St"
		/\b(?:the\s+)?([A-Z][a-zA-Z'-]+(?:\s+[A-Za-z'-]+)*\s+(?:address|street|road|lane|avenue|ave|drive|place|warehouse|yard|estate))/,
		// "at the Preston address" / "at the warehouse"
		/\bat\s+(?:the\s+)?([A-Z][a-zA-Z'-]+(?:\s+[a-zA-Z'-]+){0,3})/,
		// "in [Place Name]"
		/\bin\s+(?:the\s+)?([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)/,
	];
	for (const re of patterns) {
		const m = text.match(re);
		if (m?.[1]?.trim()) return m[1].trim();
	}
	return null;
}

// ─── Date hint extraction ─────────────────────────────────────────────────────

/**
 * Extract a human-readable date reference from AI answer text.
 * Prefers written dates ("December 11, 2025") over ISO strings.
 * Used to anchor time follow-up questions to the correct event.
 */
export function extractDateHint(text: string): string | null {
	const patterns = [
		// "December 11, 2025" / "Dec 11, 2025" / "December 11 2025"
		/\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/i,
		// "11 December 2025" / "11th December 2025"
		/\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov)\s+\d{4})\b/i,
		// ISO date (including ISO timestamps): extracts "2025-12-11" from "2025-12-11T14:54:00Z"
		/\b(\d{4}-\d{2}-\d{2})(?!\d)/,
		// Numeric: "12/11/2025"
		/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
	];
	for (const re of patterns) {
		const m = text.match(re);
		if (m?.[1]?.trim()) return m[1].trim();
	}
	return null;
}

// ─── Action body extraction ───────────────────────────────────────────────────

/**
 * Strip the leading interrogative word and optional auxiliary from a question to
 * produce the predicate body. Preserves key nouns and verbs that carry meaning
 * for RAG retrieval.
 *
 * "Who carried the bags into the Preston address?" → "carried the bags into the Preston address"
 * "What did Mangis do at the warehouse?" → "Mangis do at the warehouse"
 * "When did the vehicle leave?" → "the vehicle leave"
 */
export function extractActionBody(question: string): string {
	return question
		.replace(/\?+$/, '')
		.trim()
		// Strip leading interrogative + optional auxiliary ("Who did", "When was", etc.)
		.replace(
			/^(?:who|what|when|where|why|how)\s+(?:did|was|were|has|have|had|is|are|would|could|should|does|do)?\s*/i,
			''
		)
		// Strip "has/did/does/is/are anyone/someone" openers ("Has anyone carried…")
		.replace(
			/^(?:has|have|did|does|do|is|are|was|were|would|could|should)\s+(?:anyone|someone|somebody|everybody|nobody|no\s+one)\s+/i,
			''
		)
		.trim();
}

// ─── Verb normalisation ───────────────────────────────────────────────────────

const PAST_TO_BASE: Record<string, string> = {
	carried: 'carry', brought: 'bring', took: 'take', went: 'go',
	gave: 'give', saw: 'see', said: 'say', told: 'tell',
	arrived: 'arrive', left: 'leave', found: 'find', made: 'make',
	came: 'come', moved: 'move', drove: 'drive', met: 'meet',
	called: 'call', received: 'receive', entered: 'enter', exited: 'exit',
	delivered: 'deliver', placed: 'place', dropped: 'drop', picked: 'pick',
	stored: 'store', handed: 'hand', passed: 'pass', showed: 'show',
	used: 'use', had: 'have', was: 'be', were: 'be', did: 'do', ran: 'run',
	transferred: 'transfer', transported: 'transport', disposed: 'dispose',
};

function verbToBase(verb: string): string {
	const v = verb.toLowerCase().replace(/[^a-z]/g, '');
	if (PAST_TO_BASE[v]) return PAST_TO_BASE[v];
	// "-ied" → "-y": carried → carry (but "carried" is in the map above)
	if (v.endsWith('ied') && v.length > 4) return v.slice(0, -3) + 'y';
	// "-ed" regular: moved → move, dropped → drop (double consonant)
	if (v.endsWith('ed') && v.length > 4) {
		const stem = v.slice(0, -2);
		if (stem.length > 2 && stem.at(-1) === stem.at(-2)) return stem.slice(0, -1);
		return stem;
	}
	return v;
}

/**
 * Normalise the first (past-tense) verb in an action body to base form so it
 * works grammatically with the "did X [verb]..." construction.
 * "carried the bags into the Preston address" → "carry the bags into the Preston address"
 */
function normaliseBodyVerb(body: string): string {
	const words = body.trim().split(/\s+/);
	if (words.length === 0) return body;
	return [verbToBase(words[0]), ...words.slice(1)].join(' ');
}

// ─── Backward-compatible extractPriorContext ──────────────────────────────────

/**
 * @deprecated Prefer `buildConversationState`. Kept for backward compatibility.
 * Returns the last non-context-dependent user query and the AI answer that followed it.
 */
export function extractPriorContext(turns: ConversationTurn[]): {
	lastUserQuery: string;
	lastAnswer: string;
} | null {
	for (let i = turns.length - 1; i >= 1; i--) {
		if (turns[i].role === 'assistant' && turns[i - 1].role === 'user' && !isContextDependent(turns[i - 1].content)) {
			const lastUserQuery = turns[i - 1].content.trim();
			const lastAnswer = turns[i].content.trim().slice(0, 400);
			if (lastUserQuery) return { lastUserQuery, lastAnswer };
		}
	}
	return null;
}

// ─── Conversation state builder ───────────────────────────────────────────────

/**
 * Build conversation state from the turn history.
 *
 * Drift prevention: context-dependent user messages are skipped when searching for
 * the anchor, so "who" → "when" → "where" chains all resolve from the same original
 * full question.
 *
 * Entity preference: proper nouns in assistant answers are weighted first, because
 * the AI names the entity the prior question was asking about
 * (e.g. "Mangis carried the bags…" → entity = "Mangis").
 */
export function buildConversationState(turns: ConversationTurn[]): ConversationState | null {
	// Find anchor: last non-context-dependent user question + its following assistant answer.
	let anchorUserQ: string | null = null;
	let anchorAssistantA: string | null = null;

	for (let i = turns.length - 1; i >= 0; i--) {
		if (turns[i].role === 'user' && !isContextDependent(turns[i].content)) {
			anchorUserQ = turns[i].content.trim();
			if (i + 1 < turns.length && turns[i + 1].role === 'assistant') {
				anchorAssistantA = turns[i + 1].content.trim().slice(0, 300);
			}
			break;
		}
	}

	if (!anchorUserQ) return null;

	// Scan last 8 turns for entities (broader than just the anchor pair).
	const recentText = turns.slice(-8).map((t) => t.content).join(' ');
	const allEntities = extractProperNouns(recentText);

	// Prefer entities from AI answers — they name the "who" answer.
	const aiText = turns.slice(-8).filter((t) => t.role === 'assistant').map((t) => t.content).join(' ');
	const aiEntities = extractProperNouns(aiText);
	const entity = aiEntities[0] ?? allEntities[0] ?? null;

	const actionBody = extractActionBody(anchorUserQ) || null;
	const location =
		extractLocation(anchorUserQ) ?? (anchorAssistantA ? extractLocation(anchorAssistantA) : null);

	// Extract date hint from all recent AI answers (most recent wins).
	let dateHint: string | null = null;
	const recentAiTurns = turns.slice(-8).filter((t) => t.role === 'assistant');
	for (let i = recentAiTurns.length - 1; i >= 0; i--) {
		const hint = extractDateHint(recentAiTurns[i].content);
		if (hint) {
			dateHint = hint;
			break;
		}
	}

	return {
		topic: anchorUserQ,
		anchorAnswer: anchorAssistantA,
		entities: allEntities,
		entity,
		actionBody,
		location,
		dateHint,
		lastQuestionType: classifyQuestionType(anchorUserQ),
		confidence: allEntities.length > 0 || location !== null ? 'high' : 'low',
	};
}

// ─── State-based resolution ───────────────────────────────────────────────────

function buildContextSuffix(entities: string[], location: string | null): string {
	const parts: string[] = entities.slice(0, 3).filter(Boolean);
	if (location && !parts.some((p) => p.toLowerCase().includes(location.toLowerCase()))) {
		parts.push(location);
	}
	return parts.length > 0 ? ` [Context: ${parts.join(', ')}]` : '';
}

/**
 * True when the first word of the action body is a verb (or at least not a
 * determiner/pronoun/article), so the "What time did [entity] [body]?" template
 * is grammatically valid.
 */
function bodyIsVerbLed(body: string): boolean {
	const firstWord = body.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
	const NON_VERB_STARTERS = new Set([
		'the', 'a', 'an', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
		'this', 'that', 'these', 'those', 'last', 'most', 'every', 'each',
		'some', 'any', 'all', 'no',
	]);
	return firstWord.length > 0 && !NON_VERB_STARTERS.has(firstWord);
}

function resolveWithState(currentQuery: string, state: ConversationState): string {
	const type = classifyQuestionType(currentQuery);
	const { entity, entities, actionBody, location, dateHint, lastQuestionType, topic, anchorAnswer } = state;

	// Same interrogative as the prior question → return the anchor as-is.
	if (type === lastQuestionType) {
		return topic.endsWith('?') ? topic : topic + '?';
	}

	const suffix = buildContextSuffix(entities, location);
	const bodyNorm = actionBody ? normaliseBodyVerb(actionBody) : null;

	// ── Time-specific resolution ──────────────────────────────────────────────
	// Handles: "what time was it", "what time", "at what time", "what was the time".
	// Builds a query rich enough for RAG to retrieve the correct event entry
	// (entity + action + location + date) rather than any entry containing a timestamp.
	if (isTimeQuestion(currentQuery)) {
		const verbBody = bodyNorm && bodyIsVerbLed(bodyNorm) ? bodyNorm : null;
		if (entity && verbBody && dateHint) {
			return `What time did ${entity} ${verbBody} on ${dateHint}?`;
		}
		if (entity && verbBody) {
			return `What time did ${entity} ${verbBody}?`;
		}
		if (entity && location && dateHint) {
			return `What time was ${entity} at ${location} on ${dateHint}?`;
		}
		if (entity && location) {
			return `What time was ${entity} at ${location}?`;
		}
		if (entity && dateHint) {
			return `What time did this event involving ${entity} occur on ${dateHint}?${suffix}`;
		}
		// Last resort: use a second entity as a location hint if present
		const locHint = entities.find((e) => e !== entity) ?? null;
		if (entity && locHint) {
			return `What time was ${entity} at ${locHint}?${suffix}`;
		}
		if (location) {
			return `What time did this occur at ${location}?${suffix}`;
		}
		return `What time exactly?${suffix}`;
	}

	switch (type) {
		case 'who':
			if (actionBody) return `Who ${actionBody}?`;
			if (location) return `Who was involved at ${location}?${suffix}`;
			return `Who specifically?${suffix}`;

		case 'when':
			if (entity && bodyNorm) return `When did ${entity} ${bodyNorm}?`;
			if (bodyNorm) return `When did ${bodyNorm} occur?`;
			if (entity) return `When was ${entity} involved?${suffix}`;
			return `When exactly?${suffix}`;

		case 'where':
			if (entity && bodyNorm) return `Where did ${entity} ${bodyNorm}?`;
			if (bodyNorm) return `Where did ${bodyNorm} occur?`;
			return `Where specifically?${suffix}`;

		case 'what':
			if (entity && location) return `What did ${entity} do at ${location}?`;
			if (entity && bodyNorm) return `What was ${entity}'s involvement in ${bodyNorm}?`;
			if (location) return `What happened at ${location}?${suffix}`;
			return `What specifically?${suffix}`;

		case 'why':
			if (entity && bodyNorm) return `Why did ${entity} ${bodyNorm}?`;
			if (bodyNorm) return `Why ${bodyNorm}?`;
			return `Why?${suffix}`;

		case 'how':
			if (entity && bodyNorm) return `How did ${entity} ${bodyNorm}?`;
			if (bodyNorm) return `How ${bodyNorm}?`;
			return `How?${suffix}`;

		default: {
			// Short phrase follow-up — append context block.
			const ctxLines = [
				`Previous question: "${topic}"`,
				anchorAnswer ? `Previous answer: "${anchorAnswer.slice(0, 200)}"` : '',
			].filter(Boolean);
			return `${currentQuery.trim()}\n\n[${ctxLines.join('\n')}]`;
		}
	}
}

// ─── Anchor confidence scoring ────────────────────────────────────────────────

/**
 * Compute how confident we are that a context-dependent follow-up question is
 * referring to the same specific event tracked by the conversation state.
 *
 * Scoring:
 *  HIGH  (≥4 pts, entity + location or action) — resolved query can be trusted
 *  MEDIUM (≥2 pts)                              — enrich resolved query with context block
 *  LOW   (<2 pts)                               — insufficient anchor; ask for clarification
 *
 * Callers should only invoke this when `state` is non-null (i.e. after a
 * successful `buildConversationState` call).
 */
export function computeAnchorConfidence(state: ConversationState, currentQuery: string): AnchorResult {
	const anchor: EventAnchor = {
		entity: state.entity,
		actionBody: state.actionBody,
		location: state.location,
		dateHint: state.dateHint,
		sourceExcerpt: state.anchorAnswer ? state.anchorAnswer.slice(0, 150) : null,
	};

	const factors: string[] = [];
	let score = 0;

	if (state.entity) { score += 2; factors.push('entity'); }
	if (state.location) { score += 2; factors.push('location'); }
	if (state.actionBody) { score += 1; factors.push('action'); }
	if (state.dateHint) { score += 1; factors.push('date'); }
	if (state.anchorAnswer) { score += 1; factors.push('ai-answer'); }

	const qt = classifyQuestionType(currentQuery);
	if (qt !== 'other') factors.push(`question-type:${qt}`);

	// HIGH requires entity + a spatial/temporal anchor (location or date) + action body.
	// Entity alone, even with a high score from AI-answer, is not enough to safely
	// pin a follow-up to a specific event.
	let level: 'high' | 'medium' | 'low';
	if (score >= 4 && state.entity && (state.location || state.dateHint) && state.actionBody) {
		level = 'high';
	} else if (score >= 2) {
		level = 'medium';
	} else {
		level = 'low';
	}

	return { level, factors, anchor };
}

/**
 * Build a plain-language clarification hint for display when anchor confidence
 * is too low to safely send a follow-up to the AI.
 * @deprecated Prefer `buildProgressiveClarification` for new call sites.
 */
export function buildClarificationHint(state: ConversationState): string {
	const parts: string[] = [];
	if (state.entity) parts.push(state.entity);
	if (state.location) parts.push(`the ${state.location}`);
	if (state.dateHint) parts.push(state.dateHint);

	if (parts.length === 0) {
		return "Could you give me a bit more context about which event you mean?";
	}
	return `Are you asking about the event involving ${parts.join(', ')}? Could you be more specific?`;
}

// ─── Top-suggestion label ─────────────────────────────────────────────────────

/**
 * Derive a short dynamic label for the top-ranked follow-up suggestion chip.
 *
 * The label helps the user understand WHY this suggestion is first without
 * making them read the text before deciding to engage.
 *
 * Rules are deterministic and text-pattern based — no LLM involved.
 *
 * @param topSuggestion  The text of the first (top-ranked) suggestion.
 * @param clarificationType  When present, the caller is in the progressive
 *   clarification flow (not a normal answer), so the label is always "Clarify event".
 */
export function getTopSuggestionLabel(
	topSuggestion: string,
	clarificationType?: 'no_context' | 'low_confidence'
): string {
	if (clarificationType !== undefined) {
		return 'Clarify event';
	}

	const s = topSuggestion.toLowerCase();

	// Evidence/support reasoning: the suggestion pushes into evidence analysis.
	if (/\b(supports?|evidence|important|significant|why\b)/.test(s)) {
		return 'Follow evidence';
	}

	// Timeline/event continuation: the suggestion advances the narrative thread.
	if (/\bhappened\b/.test(s) || /^what did\b/.test(s) || /\b(next|after|then|timeline)\b/.test(s)) {
		return 'Continue timeline';
	}

	// State-grounded deep-dive: the suggestion references known context fields
	// (entity or location), making it the most contextually anchored option.
	if (/\b(documented about|occurred at|else\b.*\bat|further)\b/.test(s)) {
		return 'Most relevant';
	}

	return 'Best next step';
}

// ─── Suggestion ranking ───────────────────────────────────────────────────────

/**
 * Natural investigative progressions for each question type.
 * The position in the array determines the boost: earlier = higher score.
 */
const PROGRESSION_PATTERNS: Record<QuestionType, RegExp[]> = {
	who:   [/^what did\b/, /^what happened\b/, /^when\b/, /^where\b/],
	what:  [/^who\b/, /^what happened\b/, /^when\b/, /^where\b/],
	when:  [/^what happened\b/, /^what did\b/, /^who\b/, /^where\b/],
	where: [/^who\b/, /^what happened\b/, /^what did\b/, /^when\b/],
	why:   [/^what supports\b/, /^what was the outcome\b/, /^who\b/],
	how:   [/^who carried\b/, /^what was the result\b/, /^when\b/],
	other: [/^who\b/, /^what\b/, /^when\b/, /^where\b/],
};

/** Semantic bucket for a suggestion string — used in diversity enforcement. */
export type SuggestionBucket = 'person' | 'action' | 'time' | 'location' | 'evidence' | 'reasoning' | 'general';

export function getSuggestionBucket(s: string): SuggestionBucket {
	const lower = s.toLowerCase();
	if (/\b(evidence|supports?|important|significant|tied to)\b/.test(lower)) return 'evidence';
	if (/^why\b/.test(lower)) return 'reasoning';
	if (/^who\b/.test(lower)) return 'person';
	if (/^when\b|^what time\b/.test(lower)) return 'time';
	if (/^where\b/.test(lower)) return 'location';
	if (/^what (did|happened|occurred|was done|happened next|happened before)\b/.test(lower)) return 'action';
	return 'general';
}

/**
 * Light diversity enforcement: prevent one semantic bucket from dominating the
 * final suggestion set. At most `maxPerBucket` suggestions from the same bucket
 * are kept in their ranked position; remaining same-bucket suggestions are
 * deferred and only appended if other buckets cannot fill the remaining slots.
 *
 * This runs AFTER ranking so intra-bucket order is always preserved.
 */
export function applyDiversityPass(suggestions: string[], maxPerBucket = 2): string[] {
	const bucketCount: Record<string, number> = {};
	const kept: string[] = [];
	const deferred: string[] = [];

	for (const s of suggestions) {
		const bucket = getSuggestionBucket(s);
		const count = bucketCount[bucket] ?? 0;
		if (count < maxPerBucket) {
			kept.push(s);
			bucketCount[bucket] = count + 1;
		} else {
			deferred.push(s);
		}
	}

	// Fill remaining slots with deferred when no other-bucket candidates were available.
	for (const s of deferred) {
		if (kept.length >= 4) break;
		kept.push(s);
	}

	return kept;
}

export function scoreFollowUpSuggestion(suggestion: string, ctx: SuggestionRankingContext): number {
	const s = suggestion.toLowerCase();
	let score = 0;

	// A. Context richness: suggestions grounded in known state are more investigatively
	//    valuable because they are immediately actionable and cannot fabricate facts.
	if (ctx.state?.entity && s.includes(ctx.state.entity.toLowerCase())) score += 2;
	if (ctx.state?.location && s.includes(ctx.state.location.toLowerCase())) score += 1;

	// B. Investigative progression: prefer the natural next-step sequence for the
	//    current question type. Time questions always use the 'when' progression.
	//    Skipped in evidence context — the dedicated F-block below handles ordering there.
	const queryCtxEarly = ctx.queryContext ?? 'general';
	if (queryCtxEarly !== 'evidence') {
		const effectiveType: QuestionType = isTimeQuestion(ctx.currentQuery) ? 'when' : ctx.questionType;
		const progression = PROGRESSION_PATTERNS[effectiveType] ?? PROGRESSION_PATTERNS.other;
		for (let i = 0; i < progression.length; i++) {
			if (progression[i].test(s)) {
				score += (progression.length - i) * 2;
				break;
			}
		}
	}

	// C. Actionability: suggestions that explicitly advance the investigation.
	if (/what (did|happened|supports|should|was the)/.test(s)) score += 1;
	if (/\b(next|else|further|involved)\b/.test(s)) score += 1;

	// D. Time-question override: after a time query, event/action follow-ups are
	//    the most useful continuation and receive an extra boost.
	if (isTimeQuestion(ctx.currentQuery) && /^what (happened|did|occurred)\b/.test(s)) score += 4;

	// E. Redundancy: penalise suggestions that repeat the user's own question type
	//    unless the suggestion is grounded in a known entity or location (making it
	//    meaningfully distinct from the original query).
	const currentFirstWord = ctx.currentQuery.trim().toLowerCase().split(/\s+/)[0] ?? '';
	const suggestionFirstWord = s.split(/\s+/)[0] ?? '';
	const isGrounded = !!(ctx.state?.entity || ctx.state?.location);
	if (currentFirstWord === suggestionFirstWord && !isGrounded) score -= 2;

	// F. Context-specific boosts: strong targeted lifts when the active investigative
	//    context makes a particular suggestion type clearly the best next step.
	const queryCtx = queryCtxEarly;
	if (queryCtx === 'evidence') {
		if (/\b(why\b|important|significant)/.test(s)) score += 5;
		if (/\bsupports?\b/.test(s)) score += 5;
		if (/\btied to\b/.test(s)) score += 3;
		if (/\bshould be done\b/.test(s)) score += 2;
	}
	if (queryCtx === 'person') {
		if (/^what did\b/.test(s)) score += 4;
		if (ctx.state?.entity && s.includes(ctx.state.entity.toLowerCase()) && /^what did\b/.test(s)) score += 3;
	}
	if (queryCtx === 'location') {
		if (/^what (happened|occurred)\b/.test(s) || /\bhappened (there|at)\b/.test(s)) score += 4;
		if (ctx.state?.location && s.includes(ctx.state.location.toLowerCase())) score += 3;
	}
	if (queryCtx === 'timeline') {
		if (/\bnext\b/.test(s)) score += 4;
		if (/\bbefore\b/.test(s)) score += 3;
		if (/who else\b/.test(s)) score += 2;
	}

	return score;
}

/**
 * Deduplicate and rank a list of follow-up suggestion strings.
 *
 * Scoring factors (deterministic, no LLM):
 *   - entity/location mention from conversation state → grounded context boost
 *   - natural investigative progression for the question type
 *   - actionability keywords (what happened, what supports, etc.)
 *   - time-question override (event/action suggestions float to the top)
 *   - redundancy penalty when the suggestion mirrors the user's current question type
 *
 * Ties preserve original insertion order (stable sort).
 * The result is capped at 4 items by the callers.
 */
export function rankFollowUpSuggestions(
	suggestions: string[],
	ctx: SuggestionRankingContext
): string[] {
	// Deduplicate (case-insensitive exact match).
	const seen = new Set<string>();
	const deduped = suggestions.filter((s) => {
		const key = s.toLowerCase().trim();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	// Score, then stable-sort (ties keep original order via secondary idx comparison).
	const scored = deduped.map((s, idx) => ({ s, score: scoreFollowUpSuggestion(s, ctx), idx }));
	scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

	return scored.map((x) => x.s);
}

/**
 * Generate a progressive clarification message for display as an inline
 * assistant reply when a query cannot be safely resolved.
 *
 * Returns a structured `ClarificationResult` so callers can distinguish the
 * reason (no_context vs low_confidence) for logging and future UI rendering.
 *
 * No backend call should be made when this function returns a result —
 * its entire purpose is to replace the unsafe query with a conversational
 * clarifying turn.
 */
export function buildProgressiveClarification(
	state: ConversationState | null,
	query: string
): ClarificationResult {
	// Compute effective question type once. Time questions use 'when' for ranking
	// purposes so event/action follow-ups bubble correctly.
	const qt: QuestionType = isTimeQuestion(query) ? 'when' : classifyQuestionType(query);
	const queryContext = detectQueryContext(state, qt, query);
	const rankCtx: SuggestionRankingContext = { questionType: qt, state, currentQuery: query, queryContext };

	if (state === null) {
		// No conversation context — provide query-type-specific investigative guidance.
		if (isTimeQuestion(query)) {
			return {
				type: 'no_context',
				message:
					"What event are you asking about? For example, you can ask about when someone arrived, left, or performed an action in this case.",
				suggestions: rankFollowUpSuggestions([
					"What time did the most recent event in this case occur?",
					"What time is documented in the narrative?",
					"When did the key activity take place?",
				], rankCtx),
			};
		}

		const GUIDANCE: Record<QuestionType, string> = {
			who:   "Who are you referring to? You can ask about a specific person, event, or location in this case.",
			what:  "What event are you referring to? You can ask about what happened, what was found, or what was documented.",
			when:  "When are you asking about? Try specifying an event, action, or person you want the timing for.",
			where: "What event or activity are you asking about? I can look up locations once I know the specific event.",
			why:   "What are you asking about? I can look for documented explanations once I know the specific event or activity.",
			how:   "What event or action are you asking about? I can describe how it occurred once I know the specific activity.",
			other: "I'm not sure what you're referring to. Could you tell me a bit more about what you'd like to know?",
		};
		const NO_CONTEXT_SUGGESTIONS: Record<QuestionType, string[]> = {
			who:   [
				"Who is involved in the most recent case activity?",
				"Who were the key persons documented?",
				"Who was most recently recorded in this case?",
			],
			what:  [
				"What happened in the most recent documented activity?",
				"What evidence is recorded in this case?",
				"What was the most significant action taken?",
			],
			when:  [
				"When did the most recent event in this case occur?",
				"When was the last significant activity documented?",
				"When were the key events recorded?",
			],
			where: [
				"Where did the most recent activity take place?",
				"Where was the evidence collected?",
				"Where is the investigation currently focused?",
			],
			why:   [
				"Why is the most recent activity significant?",
				"What documentation explains the reason for the activity?",
				"What was the stated purpose or motive in the record?",
			],
			how:   [
				"How was the most recent activity carried out?",
				"How were the events connected in the record?",
				"How was evidence documented?",
			],
			other: [
				"Who is involved in this case?",
				"What happened most recently?",
				"When did the key events occur?",
			],
		};
		return {
			type: 'no_context',
			message: GUIDANCE[qt],
			suggestions: rankFollowUpSuggestions(NO_CONTEXT_SUGGESTIONS[qt] ?? [], rankCtx),
		};
	}

	// Low anchor confidence — use available state to make the clarification specific.
	const parts: string[] = [];
	if (state.entity) parts.push(state.entity);
	if (state.location) parts.push(`the ${state.location}`);
	if (state.dateHint) parts.push(state.dateHint);

	if (parts.length === 0) {
		return {
			type: 'low_confidence',
			message: "I want to make sure I understand — which specific event or activity are you referring to?",
			suggestions: rankFollowUpSuggestions([
				"Who is involved in the most recent activity?",
				"What happened most recently in this case?",
				"When did the last documented event occur?",
			], rankCtx),
		};
	}

	// Build targeted suggestions from state fields.
	const stateSuggestions: string[] = [];
	if (state.entity && state.location) {
		stateSuggestions.push(`What did ${state.entity} do at the ${state.location}?`);
		stateSuggestions.push(`When did ${state.entity} arrive at the ${state.location}?`);
		stateSuggestions.push(`Who else was present at the ${state.location}?`);
	} else if (state.entity) {
		stateSuggestions.push(`What did ${state.entity} do?`);
		stateSuggestions.push(`When was ${state.entity} last documented?`);
		stateSuggestions.push(`Where was ${state.entity} observed?`);
	} else if (state.location) {
		stateSuggestions.push(`What occurred at the ${state.location}?`);
		stateSuggestions.push(`Who was at the ${state.location}?`);
		stateSuggestions.push(`When did the activity at the ${state.location} occur?`);
	}

	return {
		type: 'low_confidence',
		message: `Are you asking about the activity involving ${parts.join(', ')}? If so, could you be more specific about what you'd like to know?`,
		suggestions: rankFollowUpSuggestions(stateSuggestions, rankCtx).slice(0, 4),
	};
}

/**
 * Context-specific base suggestion pools.
 * Each pool is tailored to the detected investigative context and may include
 * state-grounded text (entity/location) when available.
 */
function getContextBaseSuggestions(
	state: ConversationState | null,
	questionType: QuestionType,
	currentQuery: string,
	context: QueryContext
): string[] {
	const entity = state?.entity;
	const location = state?.location;

	switch (context) {
		case 'evidence':
			return [
				"Why is that important?",
				"What supports that?",
				"Who is tied to that evidence?",
				"What should be done next?",
			];

		case 'person':
			return [
				entity ? `What did ${entity} do?` : "What did they do?",
				"When did that happen?",
				entity ? `Where was ${entity} observed?` : "Where did it occur?",
				entity ? `What else is documented about ${entity}?` : "What else is on record?",
			];

		case 'location':
			return [
				location ? `What happened at the ${location}?` : "What happened there?",
				"Who was involved there?",
				"When did that occur?",
				location ? `Has the ${location} appeared in other events?` : "Where else did this occur?",
			];

		case 'timeline':
			return [
				"What happened next?",
				"Who else was involved?",
				"What time did that occur?",
				"What happened before this?",
			];

		case 'general':
		default: {
			const BASE_BY_TYPE: Record<QuestionType, string[]> = {
				who:   ["What did they do?", "When did that happen?", "Where did it occur?"],
				what:  ["Who was involved?", "When did that occur?", "Where did it take place?"],
				when:  ["Who was involved?", "What happened?", "Where did it occur?"],
				where: ["Who was there?", "What happened?", "When did it occur?"],
				why:   ["What supports that?", "What was the outcome?", "Who was involved?"],
				how:   ["Who carried it out?", "When did it occur?", "What was the result?"],
				other: ["Who is involved?", "What happened?", "When did it occur?"],
			};
			// Time questions classified as 'what' use the 'when' pool for better continuations.
			const effectiveType: QuestionType = isTimeQuestion(currentQuery) ? 'when' : questionType;
			const base = [...(BASE_BY_TYPE[effectiveType] ?? BASE_BY_TYPE.other)];
			// Append one state-aware suggestion when context is general and state has fields.
			if (entity && base.length < 4) {
				base.push(`What else is documented about ${entity}?`);
			} else if (location && base.length < 4) {
				base.push(`What else occurred at the ${location}?`);
			}
			return base;
		}
	}
}

/**
 * Generate 2–4 deterministic follow-up suggestion strings after a successful
 * case answer, based on the question type and any available conversation state.
 *
 * Suggestions go through the normal chat submit flow when clicked — they are
 * NOT pre-computed answers and all guards still apply.
 */
export function buildAnswerFollowUpSuggestions(
	state: ConversationState | null,
	questionType: QuestionType,
	currentQuery: string = ''
): string[] {
	const context = detectQueryContext(state, questionType, currentQuery);
	const raw = getContextBaseSuggestions(state, questionType, currentQuery, context);
	const rankCtx: SuggestionRankingContext = { questionType, state, currentQuery, queryContext: context };
	const ranked = rankFollowUpSuggestions(raw, rankCtx);
	return applyDiversityPass(ranked).slice(0, 4);
}

// ─── First-turn safe default rewrites ────────────────────────────────────────

/**
 * Bare interrogative → safe, generic, case-scoped question.
 * Used ONLY for the very first message in a chat (no prior turns) when the
 * query is context-dependent but there is no anchor to resolve against.
 * These queries produce zero RAG terms if sent unmodified; the rewrites give
 * retrieval a meaningful signal without fabricating specificity.
 */
const FIRST_TURN_BARE: Record<string, string> = {
	who:   'Who are the primary individuals involved based on the most recent case activity?',
	what:  'What activity is documented in the most recent case entries?',
	when:  'When did the most recent relevant activity in this case occur?',
	where: 'Where did the most recent relevant activity in this case take place?',
	why:   'Is there any documented explanation or stated reason for the most recent activity in this case?',
	how:   'How is the most recent activity in this case described in the record?',
};

const FIRST_TURN_PHRASE: Array<[RegExp, string]> = [
	[/^what\s+time\b/,          'What time is documented for the most recent relevant activity in this case?'],
	[/^where\s+was\s+this\b/,   'Where did the most recent relevant activity in this case take place?'],
	[/^where\s+was\s+it\b/,     'Where did the most recent relevant activity in this case take place?'],
	[/^when\s+was\s+this\b/,    'When did the most recent relevant activity in this case occur?'],
	[/^when\s+was\s+it\b/,      'When did the most recent relevant activity in this case occur?'],
	[/^what\s+was\s+this\b/,    'What activity is documented in the most recent case entries?'],
	[/^what\s+was\s+it\b/,      'What activity is documented in the most recent case entries?'],
	[/^who\s+was\s+it\b/,       'Who are the primary individuals involved based on the most recent case activity?'],
	[/^what\s+happened\b/,      'What activity is documented in the most recent case entries?'],
];

/**
 * Return a safe generic case-scoped rewrite for a first-turn context-dependent
 * query, or `null` if no mapping applies (in which case the query should be
 * blocked and the user asked for more context).
 */
export function resolveFirstTurnFallback(query: string): string | null {
	const q = query.trim().toLowerCase().replace(/\?+$/, '').trim();
	if (FIRST_TURN_BARE[q]) return FIRST_TURN_BARE[q];
	for (const [re, fallback] of FIRST_TURN_PHRASE) {
		if (re.test(q)) return fallback;
	}
	return null;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Resolve a context-dependent follow-up query into a fully self-contained question.
 *
 * - Detects bare interrogatives and pronoun follow-ups.
 * - Builds ConversationState from history (drift-safe).
 * - Uses state to reconstruct a meaningful question with entity/action/location.
 * - Falls through unchanged when no prior context is available.
 */
export function resolveConversationalQuery(
	currentQuery: string,
	priorTurns: ConversationTurn[]
): ResolvedQuery {
	const original = currentQuery;

	if (!isContextDependent(currentQuery)) {
		return { resolved: original, original, contextDependent: false, state: null };
	}

	const state = buildConversationState(priorTurns);

	if (!state) {
		return { resolved: original, original, contextDependent: false, state: null };
	}

	const resolved = resolveWithState(currentQuery, state);
	return { resolved, original, contextDependent: true, state };
}
