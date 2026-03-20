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
];

export function isContextDependent(query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return false;
	if (BARE_INTERROGATIVES.has(q)) return true;
	return CONTEXT_DEPENDENT_PHRASES.some((re) => re.test(q));
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
		.replace(
			/^(?:who|what|when|where|why|how)\s+(?:did|was|were|has|have|had|is|are|would|could|should|does|do)?\s*/i,
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

	return {
		topic: anchorUserQ,
		anchorAnswer: anchorAssistantA,
		entities: allEntities,
		entity,
		actionBody,
		location,
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

function resolveWithState(currentQuery: string, state: ConversationState): string {
	const type = classifyQuestionType(currentQuery);
	const { entity, entities, actionBody, location, lastQuestionType, topic, anchorAnswer } = state;

	// Same interrogative as the prior question → return the anchor as-is.
	if (type === lastQuestionType) {
		return topic.endsWith('?') ? topic : topic + '?';
	}

	const suffix = buildContextSuffix(entities, location);
	const bodyNorm = actionBody ? normaliseBodyVerb(actionBody) : null;

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
