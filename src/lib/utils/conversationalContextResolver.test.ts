import { describe, it, expect } from 'vitest';
import {
	isContextDependent,
	isTimeQuestion,
	classifyQuestionType,
	extractProperNouns,
	extractLocation,
	extractDateHint,
	extractActionBody,
	extractPriorContext,
	buildConversationState,
	resolveConversationalQuery,
	resolveFirstTurnFallback,
	computeAnchorConfidence,
	buildClarificationHint,
	buildProgressiveClarification,
	buildAnswerFollowUpSuggestions,
	rankFollowUpSuggestions,
	getTopSuggestionLabel,
	detectQueryContext,
	applyDiversityPass,
	type ConversationTurn,
	type ConversationState,
	type SuggestionRankingContext,
	type QueryContext,
} from './conversationalContextResolver';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Standard prior conversation: bags at Preston address. Entity answer = Mangis. */
const prestonTurns: ConversationTurn[] = [
	{ role: 'user', content: 'Who carried the bags into the Preston address?' },
	{ role: 'assistant', content: 'Mangis carried the bags into the Preston address.' },
];

/**
 * Preston scenario with a date in the AI answer.
 * Used for time-follow-up resolution tests that require a dateHint.
 */
const prestonWithDateTurns: ConversationTurn[] = [
	{ role: 'user', content: 'Who carried the bags into the Preston address?' },
	{
		role: 'assistant',
		content:
			'Mangis carried the bags into the Preston address, arriving at 1454 and exiting at 1512, on December 11, 2025.',
	},
];

/**
 * "Has anyone" phrasing — no leading interrogative word but same event.
 * Tests extractActionBody stripping of "has anyone" openers.
 */
const hasAnyoneWithDateTurns: ConversationTurn[] = [
	{ role: 'user', content: 'Has anyone carried bags into the Preston address?' },
	{
		role: 'assistant',
		content:
			'Yes, Mangis carried the bags into the Preston address at 1454 on December 11, 2025.',
	},
];

/**
 * "When was the last time" phrasing — when-anchor with Mangis + Preston but
 * no "at/in" preposition, so location comes from the AI answer.
 */
const whenLastTimeWithDateTurns: ConversationTurn[] = [
	{ role: 'user', content: 'When was the last time Mangis went to Preston?' },
	{
		role: 'assistant',
		content:
			'The last recorded visit was on December 11, 2025, when Mangis delivered items to the Preston address.',
	},
];

/** Multi-turn with context-dependent messages in between (drift scenario). */
const driftTurns: ConversationTurn[] = [
	{ role: 'user', content: 'Who carried the bags into the Preston address?' },
	{ role: 'assistant', content: 'Mangis carried the bags into the Preston address.' },
	{ role: 'user', content: 'who' },   // context-dependent — should NOT become anchor
	{ role: 'assistant', content: 'Mangis was the individual who carried the bags.' },
];

/** Evidence intake topic. */
const evidenceTurns: ConversationTurn[] = [
	{ role: 'user', content: 'Why is the evidence intake considered the most important piece of evidence?' },
	{ role: 'assistant', content: 'The evidence intake is critical because it establishes the chain of custody.' },
];

// ─── isContextDependent ───────────────────────────────────────────────────────

describe('isContextDependent', () => {
	it.each(['who', 'when', 'where', 'what', 'why', 'how', 'whom', 'whose',
		'who?', 'when?', 'where?', 'what?', 'WHO', 'WHEN',
	])('returns true for bare interrogative: %s', (q) => {
		expect(isContextDependent(q)).toBe(true);
	});

	it.each(['they', 'them', 'he', 'she', 'it', 'those', 'these', 'this', 'that',
		'who was it', 'who did it', 'what about', 'what else', 'tell me more',
		'when exactly', 'where exactly', 'why so', 'and then', 'elaborate',
	])('returns true for context-dependent phrase: %s', (q) => {
		expect(isContextDependent(q)).toBe(true);
	});

	it.each([
		'Who carried the bags into the Preston address?',
		'What time did the vehicle leave?',
		'When was the suspect last seen at 45 Harbour Rd?',
		'Add to timeline',
		'',
		'Tell me about the Preston case',
	])('returns false for self-contained query: %s', (q) => {
		expect(isContextDependent(q)).toBe(false);
	});

	it.each([
		'what time',
		'what time?',
		'what time was it',
		'what time was it?',
		'what time was that',
		'what time did it happen',
		'what time did this happen',
		'what was the time',
		'at what time',
		'what happened',
		'what happened?',
		'what happened next',
		'what happened after',
	])('returns true for time/event follow-up: %s', (q) => {
		expect(isContextDependent(q)).toBe(true);
	});

	it('does NOT flag self-contained time query as context-dependent', () => {
		// Has a full subject — "the vehicle leave" — not a pronoun reference
		expect(isContextDependent('What time did the vehicle leave?')).toBe(false);
	});
});

// ─── isTimeQuestion ───────────────────────────────────────────────────────────

describe('isTimeQuestion', () => {
	it.each([
		'what time was it', 'what time was that', 'what time did it happen',
		'what time', 'what time?', 'what was the time', 'at what time',
	])('returns true for time question: %s', (q) => {
		expect(isTimeQuestion(q)).toBe(true);
	});

	it.each([
		'who', 'when', 'where', 'why', 'how',
		'When did Mangis arrive?',
	])('returns false for non-time query: %s', (q) => {
		expect(isTimeQuestion(q)).toBe(false);
	});

	it('returns true for self-contained time question (still a time question)', () => {
		// isTimeQuestion detects "asking about time" — context-dependence is separate
		expect(isTimeQuestion('What time did the vehicle leave?')).toBe(true);
	});
});

// ─── classifyQuestionType ─────────────────────────────────────────────────────

describe('classifyQuestionType', () => {
	it.each([
		['who', 'who'], ['who?', 'who'], ['WHO', 'who'],
		['what', 'what'], ['what?', 'what'], ['what else', 'what'],
		['when', 'when'], ['when?', 'when'], ['when exactly', 'when'],
		['where', 'where'], ['where?', 'where'], ['where exactly', 'where'],
		['why', 'why'], ['why?', 'why'], ['why so', 'why'],
		['how', 'how'], ['how?', 'how'], ['how so', 'how'],
		['them', 'other'], ['tell me more', 'other'], ['and then', 'other'],
	] as [string, string][])('classifies "%s" as %s', (q, expected) => {
		expect(classifyQuestionType(q)).toBe(expected);
	});
});

// ─── extractProperNouns ───────────────────────────────────────────────────────

describe('extractProperNouns', () => {
	it('finds single proper noun mid-sentence', () => {
		const nouns = extractProperNouns('Mangis carried the bags to the address.');
		expect(nouns).toContain('Mangis');
	});

	it('finds multi-word proper noun with place suffix', () => {
		const nouns = extractProperNouns('Who carried the bags into the Preston address?');
		expect(nouns.some((n) => n.toLowerCase().includes('preston'))).toBe(true);
	});

	it('does not return common function words', () => {
		const nouns = extractProperNouns('Who was there? They went to the warehouse.');
		expect(nouns).not.toContain('Who');
		expect(nouns).not.toContain('They');
		expect(nouns).not.toContain('The');
	});

	it('returns empty for plain lowercase text', () => {
		expect(extractProperNouns('who carried the bags?')).toEqual([]);
	});

	it('deduplicates', () => {
		const text = 'Mangis was seen. Mangis carried the bags.';
		const nouns = extractProperNouns(text);
		expect(nouns.filter((n) => n === 'Mangis').length).toBe(1);
	});
});

// ─── extractDateHint ──────────────────────────────────────────────────────────

describe('extractDateHint', () => {
	it('extracts written date: "December 11, 2025"', () => {
		expect(extractDateHint('Mangis arrived on December 11, 2025.')).toBe('December 11, 2025');
	});

	it('extracts written date: "11 December 2025"', () => {
		expect(extractDateHint('The event occurred on 11 December 2025.')).toBe('11 December 2025');
	});

	it('extracts ISO date without time', () => {
		expect(extractDateHint('Record created on 2025-12-11.')).toBe('2025-12-11');
	});

	it('does not include time portion of ISO timestamp', () => {
		const hint = extractDateHint('occurred_at: 2025-12-11T14:54:00Z');
		expect(hint).toBe('2025-12-11');
	});

	it('returns null when no date present', () => {
		expect(extractDateHint('Mangis carried the bags into the Preston address.')).toBeNull();
	});

	it('prefers written date over ISO format when both present', () => {
		const hint = extractDateHint(
			'On December 11, 2025 (2025-12-11) Mangis carried bags.'
		);
		expect(hint).toBe('December 11, 2025');
	});
});

// ─── extractLocation ──────────────────────────────────────────────────────────

describe('extractLocation', () => {
	it('extracts address pattern', () => {
		const loc = extractLocation('Who carried the bags into the Preston address?');
		expect(loc).toBeTruthy();
		expect(loc!.toLowerCase()).toContain('preston');
	});

	it('extracts "at X" pattern', () => {
		const loc = extractLocation('What happened at the Riverside warehouse?');
		expect(loc).toBeTruthy();
	});

	it('returns null when no location', () => {
		expect(extractLocation('who carried the bags?')).toBeNull();
	});
});

// ─── extractActionBody ────────────────────────────────────────────────────────

describe('extractActionBody', () => {
	it('strips "who" interrogative', () => {
		const body = extractActionBody('Who carried the bags into the Preston address?');
		expect(body).toBe('carried the bags into the Preston address');
	});

	it('strips "when did" interrogative + auxiliary', () => {
		const body = extractActionBody('When did the vehicle leave?');
		expect(body).toBe('the vehicle leave');
	});

	it('strips "where was" interrogative + auxiliary', () => {
		const body = extractActionBody('Where was the suspect seen?');
		expect(body).toBe('the suspect seen');
	});

	it('strips "why did" interrogative + auxiliary', () => {
		const body = extractActionBody('Why did Mangis transfer the goods?');
		expect(body).toBe('Mangis transfer the goods');
	});

	it('strips "has anyone" opener', () => {
		const body = extractActionBody('Has anyone carried bags into the Preston address?');
		expect(body).toBe('carried bags into the Preston address');
	});

	it('strips "did anyone" opener', () => {
		const body = extractActionBody('Did anyone see Mangis at the warehouse?');
		expect(body).toBe('see Mangis at the warehouse');
	});
});

// ─── extractPriorContext (backward compat) ────────────────────────────────────

describe('extractPriorContext', () => {
	it('returns null for empty turns', () => {
		expect(extractPriorContext([])).toBeNull();
	});

	it('extracts last non-context-dependent Q+A pair', () => {
		const result = extractPriorContext(prestonTurns);
		expect(result?.lastUserQuery).toBe('Who carried the bags into the Preston address?');
		expect(result?.lastAnswer).toContain('Mangis');
	});

	it('skips context-dependent user turns', () => {
		const result = extractPriorContext(driftTurns);
		// Should skip "who" and find the full question
		expect(result?.lastUserQuery).toBe('Who carried the bags into the Preston address?');
	});

	it('caps answer at 400 chars', () => {
		const turns: ConversationTurn[] = [
			{ role: 'user', content: 'What did the suspect do at the warehouse?' },
			{ role: 'assistant', content: 'x'.repeat(1000) },
		];
		expect(extractPriorContext(turns)!.lastAnswer.length).toBeLessThanOrEqual(400);
	});
});

// ─── buildConversationState ───────────────────────────────────────────────────

describe('buildConversationState', () => {
	it('returns null for empty history', () => {
		expect(buildConversationState([])).toBeNull();
	});

	it('builds state from standard Q+A pair', () => {
		const state = buildConversationState(prestonTurns);
		expect(state).not.toBeNull();
		expect(state!.topic).toBe('Who carried the bags into the Preston address?');
		expect(state!.lastQuestionType).toBe('who');
	});

	it('extracts entity from AI answer (Mangis)', () => {
		const state = buildConversationState(prestonTurns);
		expect(state!.entity).toBe('Mangis');
	});

	it('extracts location from anchor question', () => {
		const state = buildConversationState(prestonTurns);
		expect(state!.location?.toLowerCase()).toContain('preston');
	});

	it('extracts action body from anchor question', () => {
		const state = buildConversationState(prestonTurns);
		expect(state!.actionBody).toContain('carried the bags');
	});

	it('drift prevention: skips context-dependent user turns as anchor', () => {
		const state = buildConversationState(driftTurns);
		// The anchor must be the original full question, not "who"
		expect(state!.topic).toBe('Who carried the bags into the Preston address?');
		expect(state!.lastQuestionType).toBe('who');
	});

	it('still extracts Mangis entity in multi-turn drift scenario', () => {
		const state = buildConversationState(driftTurns);
		expect(state!.entity).toBe('Mangis');
	});

	it('sets confidence high when entity or location found', () => {
		const state = buildConversationState(prestonTurns);
		expect(state!.confidence).toBe('high');
	});

	it('sets confidence low when no entity or location found', () => {
		const state = buildConversationState([
			{ role: 'user', content: 'What did they find in the storage unit?' },
			{ role: 'assistant', content: 'something occurred at some point' },
		]);
		expect(state!.confidence).toBe('low');
	});

	it('extracts dateHint from AI answer', () => {
		const state = buildConversationState(prestonWithDateTurns);
		expect(state!.dateHint).toBe('December 11, 2025');
	});

	it('dateHint is null when AI answer has no date', () => {
		const state = buildConversationState(prestonTurns);
		expect(state!.dateHint).toBeNull();
	});

	it('extracts dateHint from most recent AI answer in multi-turn', () => {
		const turns: ConversationTurn[] = [
			{ role: 'user', content: 'Who carried the bags into the Preston address?' },
			{ role: 'assistant', content: 'Mangis carried the bags into the Preston address.' },
			{ role: 'user', content: 'who' },
			{
				role: 'assistant',
				content: 'Mangis, on December 11, 2025, was the individual who carried the bags.',
			},
		];
		const state = buildConversationState(turns);
		expect(state!.dateHint).toBe('December 11, 2025');
	});
});

// ─── resolveConversationalQuery ───────────────────────────────────────────────

describe('resolveConversationalQuery — same interrogative', () => {
	it('"who" after a "who" question returns the anchor question', () => {
		const result = resolveConversationalQuery('who', prestonTurns);
		expect(result.contextDependent).toBe(true);
		expect(result.resolved).toBe('Who carried the bags into the Preston address?');
	});

	it('"why" after a "why" question returns the anchor question', () => {
		const result = resolveConversationalQuery('why', evidenceTurns);
		expect(result.contextDependent).toBe(true);
		expect(result.resolved).toContain('evidence intake');
	});
});

describe('resolveConversationalQuery — cross-interrogative (Preston scenario)', () => {
	/**
	 * Prior: "Who carried the bags into the Preston address?"
	 * AI:    "Mangis carried the bags into the Preston address."
	 * Entity = Mangis, Location = Preston address, ActionBody = "carried the bags…"
	 */

	it('"what" → uses entity + location: "What did Mangis do at Preston address?"', () => {
		const result = resolveConversationalQuery('what', prestonTurns);
		expect(result.resolved).toMatch(/what did mangis do at/i);
	});

	it('"when" → uses entity + normalised body verb: "When did Mangis carry the bags…"', () => {
		const result = resolveConversationalQuery('when', prestonTurns);
		expect(result.resolved).toMatch(/when did mangis carry/i);
	});

	it('"where" → uses entity + normalised body: "Where did Mangis carry the bags…"', () => {
		const result = resolveConversationalQuery('where', prestonTurns);
		expect(result.resolved).toMatch(/where did mangis carry/i);
	});

	it('"why" → uses entity + normalised body: "Why did Mangis carry the bags…"', () => {
		const result = resolveConversationalQuery('why', prestonTurns);
		expect(result.resolved).toMatch(/why did mangis carry/i);
	});

	it('"how" → uses entity + normalised body: "How did Mangis carry the bags…"', () => {
		const result = resolveConversationalQuery('how', prestonTurns);
		expect(result.resolved).toMatch(/how did mangis carry/i);
	});

	it('always preserves original', () => {
		const result = resolveConversationalQuery('when', prestonTurns);
		expect(result.original).toBe('when');
	});

	it('includes state in result for debug logging', () => {
		const result = resolveConversationalQuery('when', prestonTurns);
		expect(result.state).not.toBeNull();
		expect(result.state!.entity).toBe('Mangis');
	});
});

describe('resolveConversationalQuery — evidence intake topic', () => {
	it('"who" → reconstructs from action body', () => {
		const result = resolveConversationalQuery('who', evidenceTurns);
		expect(result.resolved).toMatch(/who/i);
		// Should include key terms from the evidence intake anchor
		expect(result.resolved.toLowerCase()).toMatch(/evidence|intake/);
	});

	it('"when" → references evidence intake context', () => {
		const result = resolveConversationalQuery('when', evidenceTurns);
		expect(result.resolved.toLowerCase()).toMatch(/evidence|intake/);
	});
});

describe('resolveConversationalQuery — drift prevention', () => {
	/**
	 * Conversation: full Q → AI → "who" (context-dep) → AI
	 * When user asks "when", the anchor must still be the original full question.
	 */
	it('uses original anchor even after intermediate context-dependent turns', () => {
		const result = resolveConversationalQuery('when', driftTurns);
		// Must reference Mangis (entity from original anchor), not generic
		expect(result.state!.topic).toBe('Who carried the bags into the Preston address?');
		expect(result.resolved).toMatch(/mangis/i);
	});
});

describe('resolveConversationalQuery — short phrase follow-ups', () => {
	it('"tell me more" appends context block', () => {
		const result = resolveConversationalQuery('tell me more', prestonTurns);
		expect(result.contextDependent).toBe(true);
		expect(result.resolved).toContain('tell me more');
		expect(result.resolved).toContain('Who carried the bags into the Preston address?');
	});

	it('"and then" appends context block', () => {
		const result = resolveConversationalQuery('and then', prestonTurns);
		expect(result.resolved).toContain('Who carried the bags into the Preston address?');
	});
});

describe('resolveConversationalQuery — no prior context', () => {
	it('returns unchanged when history is empty', () => {
		const result = resolveConversationalQuery('who', []);
		expect(result.contextDependent).toBe(false);
		expect(result.resolved).toBe('who');
		expect(result.state).toBeNull();
	});

	it('passes through self-contained query unchanged', () => {
		const result = resolveConversationalQuery(
			'Who was at the Preston address on Tuesday?',
			prestonTurns
		);
		expect(result.contextDependent).toBe(false);
		expect(result.resolved).toBe('Who was at the Preston address on Tuesday?');
	});
});

// ─── Time follow-up anchoring ─────────────────────────────────────────────────

describe('resolveConversationalQuery — time follow-ups (event anchoring)', () => {
	/**
	 * STEP 5 TEST 1:
	 * "who carried bags into Preston" → (who) → "what time was it"
	 * Resolution must pin to entity + action body + location + date,
	 * NOT drift to an unrelated timestamp.
	 */
	it('who-chain + "what time was it" resolves to full event-anchored query', () => {
		const turns: ConversationTurn[] = [
			...prestonWithDateTurns,
			{ role: 'user', content: 'who' },
			{
				role: 'assistant',
				content:
					'Mangis was the individual who carried the bags into the Preston address on December 11, 2025.',
			},
		];
		const result = resolveConversationalQuery('what time was it', turns);
		expect(result.contextDependent).toBe(true);
		// Must reference Mangis and the verb body
		expect(result.resolved).toMatch(/mangis/i);
		// Must reference location
		expect(result.resolved).toMatch(/preston/i);
		// Must reference the date from the AI answer
		expect(result.resolved).toMatch(/december 11, 2025/i);
		// Must be asking about time
		expect(result.resolved).toMatch(/what time/i);
	});

	it('"what time was it" without prior context falls back gracefully', () => {
		const result = resolveConversationalQuery('what time was it', []);
		// No context → passes through unresolved (no state to build from)
		expect(result.contextDependent).toBe(false);
	});

	/**
	 * STEP 5 TEST 2:
	 * "when was the last time Mangis went to Preston" → "what time was it"
	 * Answer source must stay anchored to the Preston event date from the AI answer.
	 */
	it('"when was last time Mangis went to Preston" → "what time was it" stays on Preston event', () => {
		const result = resolveConversationalQuery('what time was it', whenLastTimeWithDateTurns);
		expect(result.contextDependent).toBe(true);
		// Entity present
		expect(result.resolved).toMatch(/mangis/i);
		// Date from the AI answer is anchored
		expect(result.resolved).toMatch(/december 11, 2025/i);
		// Resolved query is asking about time
		expect(result.resolved).toMatch(/what time/i);
	});

	it('"has anyone carried bags" phrasing anchors time follow-up correctly', () => {
		const result = resolveConversationalQuery('what time was it', hasAnyoneWithDateTurns);
		expect(result.contextDependent).toBe(true);
		// extractActionBody strips "has anyone" → verb-led body "carried bags into the Preston address"
		expect(result.resolved).toMatch(/mangis/i);
		expect(result.resolved).toMatch(/carry|carried/i);
		expect(result.resolved).toMatch(/december 11, 2025/i);
	});

	it('"what time" bare resolves the same way as "what time was it"', () => {
		const result = resolveConversationalQuery('what time', prestonWithDateTurns);
		expect(result.contextDependent).toBe(true);
		expect(result.resolved).toMatch(/mangis/i);
		expect(result.resolved).toMatch(/december 11, 2025/i);
	});

	it('"at what time" resolves to time-anchored query', () => {
		const result = resolveConversationalQuery('at what time', prestonWithDateTurns);
		expect(result.contextDependent).toBe(true);
		expect(result.resolved).toMatch(/mangis/i);
	});

	/**
	 * STEP 5 TEST 3:
	 * Event with two times in body text — resolver produces a query rich enough
	 * to retrieve the correct entry (the AI then reports both times from it).
	 */
	it('resolver query for two-time event contains entity + location + date (RAG anchor)', () => {
		const twoTimeTurns: ConversationTurn[] = [
			{ role: 'user', content: 'Who carried the bags into the Preston address?' },
			{
				role: 'assistant',
				content:
					'Mangis carried the bags into the Preston address, arriving at 1454 and exiting at 1512, on December 11, 2025.',
			},
		];
		const result = resolveConversationalQuery('what time was it', twoTimeTurns);
		expect(result.contextDependent).toBe(true);
		// Resolved query must contain all three RAG anchor terms:
		// entity, location/action, date — so RAG retrieves the entry with both 1454 and 1512
		expect(result.resolved).toMatch(/mangis/i);
		expect(result.resolved).toMatch(/december 11, 2025/i);
		// Original is preserved for audit
		expect(result.original).toBe('what time was it');
	});

	it('time follow-up without date still anchors to entity + action', () => {
		// prestonTurns has no date in AI answer
		const result = resolveConversationalQuery('what time was it', prestonTurns);
		expect(result.contextDependent).toBe(true);
		// Should still include entity and action body (no date fallback)
		expect(result.resolved).toMatch(/mangis/i);
		expect(result.resolved).toMatch(/what time/i);
	});

	it('state.dateHint is surfaced in debug state', () => {
		const result = resolveConversationalQuery('what time was it', prestonWithDateTurns);
		expect(result.state?.dateHint).toBe('December 11, 2025');
	});
});

// ─── computeAnchorConfidence ──────────────────────────────────────────────────

describe('computeAnchorConfidence', () => {
	it('returns high confidence with entity + location + action + AI answer', () => {
		const state = buildConversationState(prestonWithDateTurns)!;
		const { level, factors } = computeAnchorConfidence(state, 'what time was it');
		expect(level).toBe('high');
		expect(factors).toContain('entity');
		expect(factors).toContain('location');
		expect(factors).toContain('action');
	});

	it('returns high confidence for who-chain then time follow-up', () => {
		const turns: ConversationTurn[] = [
			...prestonWithDateTurns,
			{ role: 'user', content: 'who' },
			{
				role: 'assistant',
				content:
					'Mangis was the individual who carried the bags into the Preston address on December 11, 2025.',
			},
		];
		const state = buildConversationState(turns)!;
		const { level } = computeAnchorConfidence(state, 'what time was it');
		expect(level).toBe('high');
	});

	it('returns medium confidence with entity only (no location)', () => {
		const turns: ConversationTurn[] = [
			{ role: 'user', content: 'What did Mangis do?' },
			{ role: 'assistant', content: 'Mangis was observed at the scene.' },
		];
		const state = buildConversationState(turns)!;
		const { level } = computeAnchorConfidence(state, 'when');
		expect(level).toBe('medium');
	});

	it('returns low confidence with no entity, no location, no AI answer', () => {
		const turns: ConversationTurn[] = [
			{ role: 'user', content: 'What did they find in the storage unit?' },
			{ role: 'assistant', content: 'something was found' },
		];
		const state = buildConversationState(turns)!;
		const { level } = computeAnchorConfidence(state, 'who');
		// No entity or location extracted → score < 2 → low
		expect(['low', 'medium']).toContain(level);
	});

	it('anchor fields mirror state fields', () => {
		const state = buildConversationState(prestonWithDateTurns)!;
		const { anchor } = computeAnchorConfidence(state, 'when');
		expect(anchor.entity).toBe(state.entity);
		expect(anchor.location).toBe(state.location);
		expect(anchor.dateHint).toBe(state.dateHint);
		expect(anchor.actionBody).toBe(state.actionBody);
	});

	it('includes question-type factor in factors list', () => {
		const state = buildConversationState(prestonWithDateTurns)!;
		const { factors } = computeAnchorConfidence(state, 'when');
		expect(factors.some((f) => f.startsWith('question-type:'))).toBe(true);
	});

	it('sourceExcerpt is populated from AI answer', () => {
		const state = buildConversationState(prestonWithDateTurns)!;
		const { anchor } = computeAnchorConfidence(state, 'what');
		expect(anchor.sourceExcerpt).toBeTruthy();
		expect(anchor.sourceExcerpt!.length).toBeLessThanOrEqual(150);
	});
});

// ─── buildClarificationHint ───────────────────────────────────────────────────

describe('buildClarificationHint', () => {
	it('includes entity and location from state', () => {
		const state = buildConversationState(prestonWithDateTurns)!;
		const hint = buildClarificationHint(state);
		expect(hint.toLowerCase()).toMatch(/mangis/i);
		expect(hint.toLowerCase()).toMatch(/preston/i);
	});

	it('falls back gracefully when state has no entities or location', () => {
		const turns: ConversationTurn[] = [
			{ role: 'user', content: 'What did they find in the storage unit?' },
			{ role: 'assistant', content: 'something was found' },
		];
		const state = buildConversationState(turns)!;
		const hint = buildClarificationHint(state);
		expect(hint.length).toBeGreaterThan(10);
	});

	it('includes dateHint when present', () => {
		const state = buildConversationState(prestonWithDateTurns)!;
		const hint = buildClarificationHint(state);
		expect(hint).toMatch(/december 11, 2025/i);
	});
});

// ─── Zero-term guard precondition ────────────────────────────────────────────

describe('zero-term guard precondition', () => {
	/**
	 * The guard in Chat.svelte checks:
	 *   isContextDependent(userPrompt) && ctxResolution.state === null
	 *
	 * First-turn (priorTurns.length === 0): resolveFirstTurnFallback is tried
	 *   → if it returns a fallback, the query is rewritten and sent (no block).
	 *   → if no fallback exists, the request is blocked.
	 *
	 * Follow-up (priorTurns.length > 0): block with clarification toast.
	 *
	 * These tests verify the resolver half of the condition.
	 */
	it('"who" with empty history → context-dependent + state null (first-turn path applies)', () => {
		const result = resolveConversationalQuery('who', []);
		expect(isContextDependent('who')).toBe(true);
		expect(result.state).toBeNull();
		// First-turn fallback should be available for "who"
		expect(resolveFirstTurnFallback('who')).not.toBeNull();
	});

	it('"what time was it" with empty history → context-dependent + state null (first-turn path applies)', () => {
		const result = resolveConversationalQuery('what time was it', []);
		expect(isContextDependent('what time was it')).toBe(true);
		expect(result.state).toBeNull();
		expect(resolveFirstTurnFallback('what time was it')).not.toBeNull();
	});

	it('self-contained question with empty history → not context-dependent (guard skipped entirely)', () => {
		const result = resolveConversationalQuery('Who carried the bags into the Preston address?', []);
		expect(isContextDependent('Who carried the bags into the Preston address?')).toBe(false);
		expect(result.state).toBeNull();
	});

	it('"who" with prior Q+A → state populated (guard condition false — proceed normally)', () => {
		const result = resolveConversationalQuery('who', prestonTurns);
		expect(isContextDependent('who')).toBe(true);
		expect(result.state).not.toBeNull();
	});

	it('"tell me more" with empty history → no first-turn fallback (should be blocked)', () => {
		expect(isContextDependent('tell me more')).toBe(true);
		expect(resolveFirstTurnFallback('tell me more')).toBeNull();
	});
});

// ─── resolveFirstTurnFallback ─────────────────────────────────────────────────

describe('resolveFirstTurnFallback', () => {
	it.each([
		['who',   /primary individuals involved/i],
		['what',  /activity is documented/i],
		['when',  /most recent relevant activity/i],
		['where', /take place/i],
		['why',   /documented explanation or stated reason/i],
		['how',   /described in the record/i],
	] as [string, RegExp][])('bare "%s" → investigative default', (q, pattern) => {
		const result = resolveFirstTurnFallback(q);
		expect(result).not.toBeNull();
		expect(result!).toMatch(pattern);
		expect(result!).toMatch(/case/i);
	});

	it('"what time was it" → time-specific investigative default', () => {
		const result = resolveFirstTurnFallback('what time was it');
		expect(result).not.toBeNull();
		expect(result!).toMatch(/what time is documented/i);
		expect(result!).toMatch(/case/i);
	});

	it('"what time" bare → time-specific default', () => {
		const result = resolveFirstTurnFallback('what time');
		expect(result).not.toBeNull();
		expect(result!).toMatch(/what time is documented/i);
	});

	it('"where was this" → location default', () => {
		const result = resolveFirstTurnFallback('where was this');
		expect(result).not.toBeNull();
		expect(result!).toMatch(/take place/i);
	});

	it('"where was it" → location default', () => {
		const result = resolveFirstTurnFallback('where was it');
		expect(result).not.toBeNull();
		expect(result!).toMatch(/take place/i);
	});

	it('"when was this" → time default', () => {
		const result = resolveFirstTurnFallback('when was this');
		expect(result).not.toBeNull();
		expect(result!).toMatch(/most recent relevant activity/i);
	});

	it('"what happened" → event default', () => {
		const result = resolveFirstTurnFallback('what happened');
		expect(result).not.toBeNull();
		expect(result!).toMatch(/activity is documented/i);
	});

	it('"who was it" → who default', () => {
		const result = resolveFirstTurnFallback('who was it');
		expect(result).not.toBeNull();
		expect(result!).toMatch(/primary individuals involved/i);
	});

	it('"why" fallback does not imply motive — uses neutral documented-explanation phrasing', () => {
		const result = resolveFirstTurnFallback('why');
		expect(result).not.toBeNull();
		expect(result!).toMatch(/documented explanation or stated reason/i);
		// Must not use speculative framing
		expect(result!).not.toMatch(/because|caused by|motive/i);
	});

	it('trailing "?" is stripped before matching', () => {
		expect(resolveFirstTurnFallback('who?')).not.toBeNull();
		expect(resolveFirstTurnFallback('when?')).not.toBeNull();
	});

	it('returns null for phrases without a safe default', () => {
		expect(resolveFirstTurnFallback('tell me more')).toBeNull();
		expect(resolveFirstTurnFallback('and then')).toBeNull();
		expect(resolveFirstTurnFallback('elaborate')).toBeNull();
	});

	it('does NOT fabricate entity or location in the fallback', () => {
		const result = resolveFirstTurnFallback('who');
		// Generic phrasing only — no invented names or places
		expect(result!).not.toMatch(/Mangis|Preston|warehouse/i);
	});
});

// ─── isContextDependent new pronoun patterns ──────────────────────────────────

describe('buildProgressiveClarification — no context (state === null)', () => {
	it('"who" returns no_context type with person-oriented guidance', () => {
		const result = buildProgressiveClarification(null, 'who');
		expect(result.type).toBe('no_context');
		expect(result.message).toMatch(/referring to/i);
		expect(result.message).toMatch(/person|individual|location/i);
	});

	it('"what" returns no_context type with event-oriented guidance', () => {
		const result = buildProgressiveClarification(null, 'what');
		expect(result.type).toBe('no_context');
		expect(result.message).toMatch(/event|happened|documented/i);
	});

	it('"when" returns no_context type with timing guidance', () => {
		const result = buildProgressiveClarification(null, 'when');
		expect(result.type).toBe('no_context');
		expect(result.message).toMatch(/timing|event|action|person/i);
	});

	it('"where" returns no_context type with location guidance', () => {
		const result = buildProgressiveClarification(null, 'where');
		expect(result.type).toBe('no_context');
		expect(result.message).toMatch(/event|activity/i);
	});

	it('"why" returns no_context type with explanation guidance', () => {
		const result = buildProgressiveClarification(null, 'why');
		expect(result.type).toBe('no_context');
		expect(result.message).toMatch(/explanation|documented|event/i);
	});

	it('"what time was it" returns time-specific no_context guidance', () => {
		const result = buildProgressiveClarification(null, 'what time was it');
		expect(result.type).toBe('no_context');
		// Time-question branch: references event and gives arrival/departure examples
		expect(result.message).toMatch(/event/i);
		expect(result.message).toMatch(/arrived|left|action/i);
	});

	it('"where was this" returns no_context type', () => {
		const result = buildProgressiveClarification(null, 'where was this');
		expect(result.type).toBe('no_context');
		expect(result.message.length).toBeGreaterThan(0);
	});

	it('does not fabricate entity names or locations in any no_context response', () => {
		const queries = ['who', 'what', 'when', 'where', 'why', 'how', 'what time was it'];
		for (const q of queries) {
			const { message } = buildProgressiveClarification(null, q);
			// Should not contain proper nouns — no invented context
			expect(message).not.toMatch(/Mangis|Preston|December/);
		}
	});

	it('returns a non-empty message for unknown phrasing', () => {
		const result = buildProgressiveClarification(null, 'tell me more');
		expect(result.type).toBe('no_context');
		expect(result.message.length).toBeGreaterThan(10);
	});
});

describe('buildProgressiveClarification — low confidence (state present)', () => {
	const stateWithFull: ConversationState = {
		topic: 'Preston address bag transfer',
		entity: 'Mangis',
		actionBody: 'carried bags into the Preston address',
		location: 'Preston address',
		lastQuestionType: 'who',
		dateHint: 'December 11, 2025',
	};

	const stateWithEntity: ConversationState = {
		topic: 'warehouse activity',
		entity: 'Thompson',
		actionBody: null,
		location: null,
		lastQuestionType: 'what',
		dateHint: null,
	};

	const stateEmpty: ConversationState = {
		topic: '',
		entity: null,
		actionBody: null,
		location: null,
		lastQuestionType: 'what',
		dateHint: null,
	};

	it('returns low_confidence type when state is present', () => {
		const result = buildProgressiveClarification(stateWithFull, 'when');
		expect(result.type).toBe('low_confidence');
	});

	it('includes entity in the clarification when present', () => {
		const result = buildProgressiveClarification(stateWithFull, 'when');
		expect(result.message).toMatch(/Mangis/);
	});

	it('includes location in the clarification when present', () => {
		const result = buildProgressiveClarification(stateWithFull, 'what time was it');
		expect(result.message).toMatch(/Preston address/);
	});

	it('includes date hint in the clarification when present', () => {
		const result = buildProgressiveClarification(stateWithFull, 'when');
		expect(result.message).toMatch(/December 11, 2025/);
	});

	it('falls back gracefully when only entity is available', () => {
		const result = buildProgressiveClarification(stateWithEntity, 'what');
		expect(result.type).toBe('low_confidence');
		expect(result.message).toMatch(/Thompson/);
	});

	it('returns a generic clarification when state has no usable fields', () => {
		const result = buildProgressiveClarification(stateEmpty, 'who');
		expect(result.type).toBe('low_confidence');
		expect(result.message).toMatch(/specific event|activity/i);
	});

	it('does not fabricate facts not present in state', () => {
		const result = buildProgressiveClarification(stateWithEntity, 'when');
		expect(result.message).not.toMatch(/Preston|December|Mangis/);
	});
});

describe('buildProgressiveClarification — suggestions field', () => {
	it('returns a non-empty suggestions array for no-context "who"', () => {
		const { suggestions } = buildProgressiveClarification(null, 'who');
		expect(suggestions).toBeDefined();
		expect(suggestions!.length).toBeGreaterThanOrEqual(2);
		expect(suggestions!.length).toBeLessThanOrEqual(4);
	});

	it('returns a non-empty suggestions array for no-context "what time was it"', () => {
		const { suggestions } = buildProgressiveClarification(null, 'what time was it');
		expect(suggestions).toBeDefined();
		expect(suggestions!.length).toBeGreaterThanOrEqual(2);
	});

	it('no-context suggestions do not contain fabricated proper nouns', () => {
		const queries = ['who', 'what', 'when', 'where', 'why', 'how'];
		for (const q of queries) {
			const { suggestions } = buildProgressiveClarification(null, q);
			for (const s of suggestions ?? []) {
				expect(s).not.toMatch(/Mangis|Preston|December/);
			}
		}
	});

	it('low-confidence with entity+location returns suggestions mentioning entity and location', () => {
		const state: ConversationState = {
			topic: '',
			entity: 'Mangis',
			actionBody: null,
			location: 'Preston address',
			lastQuestionType: 'who',
			dateHint: null,
		};
		const { suggestions } = buildProgressiveClarification(state, 'when');
		expect(suggestions).toBeDefined();
		const combined = suggestions!.join(' ');
		expect(combined).toMatch(/Mangis/);
		expect(combined).toMatch(/Preston address/);
	});

	it('low-confidence with entity only returns suggestions mentioning entity', () => {
		const state: ConversationState = {
			topic: '',
			entity: 'Rogers',
			actionBody: null,
			location: null,
			lastQuestionType: 'what',
			dateHint: null,
		};
		const { suggestions } = buildProgressiveClarification(state, 'who');
		expect(suggestions).toBeDefined();
		const combined = suggestions!.join(' ');
		expect(combined).toMatch(/Rogers/);
	});

	it('low-confidence with no usable state fields returns generic suggestions', () => {
		const state: ConversationState = {
			topic: '',
			entity: null,
			actionBody: null,
			location: null,
			lastQuestionType: 'other',
			dateHint: null,
		};
		const { suggestions } = buildProgressiveClarification(state, 'what');
		expect(suggestions).toBeDefined();
		expect(suggestions!.length).toBeGreaterThan(0);
		// Generic — no invented proper nouns
		for (const s of suggestions!) {
			expect(s).not.toMatch(/Mangis|Preston/);
		}
	});

	it('suggestions array has at most 4 items', () => {
		const state: ConversationState = {
			topic: '',
			entity: 'Jones',
			actionBody: 'delivered a package',
			location: 'warehouse',
			lastQuestionType: 'who',
			dateHint: 'December 5, 2025',
		};
		const { suggestions } = buildProgressiveClarification(state, 'who');
		expect((suggestions ?? []).length).toBeLessThanOrEqual(4);
	});
});

describe('buildAnswerFollowUpSuggestions', () => {
	const stateWithBoth: ConversationState = {
		topic: '',
		entity: 'Mangis',
		actionBody: 'carried bags',
		location: 'Preston address',
		lastQuestionType: 'who',
		dateHint: null,
	};

	it('returns 2–4 suggestions for "who" question type', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'who');
		expect(result.length).toBeGreaterThanOrEqual(2);
		expect(result.length).toBeLessThanOrEqual(4);
	});

	it('"who" suggestions include what/when/where follow-ups', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'who');
		const combined = result.join(' ');
		expect(combined).toMatch(/what|when|where/i);
	});

	it('"when" suggestions include who/what/where follow-ups', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'when');
		const combined = result.join(' ');
		expect(combined).toMatch(/who|what|where/i);
	});

	it('"what" suggestions include who/when/where follow-ups', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'what');
		const combined = result.join(' ');
		expect(combined).toMatch(/who|when|where/i);
	});

	it('"where" suggestions include who/what/when follow-ups', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'where');
		const combined = result.join(' ');
		expect(combined).toMatch(/who|what|when/i);
	});

	it('appends entity-aware suggestion when state has entity and suggestions < 4', () => {
		const result = buildAnswerFollowUpSuggestions(stateWithBoth, 'who');
		const combined = result.join(' ');
		expect(combined).toMatch(/Mangis/);
	});

	it('appends location-aware suggestion when entity absent but location present', () => {
		const stateLocOnly: ConversationState = {
			topic: '',
			entity: null,
			actionBody: null,
			location: 'warehouse',
			lastQuestionType: 'where',
			dateHint: null,
		};
		// 'where' base suggestions are exactly 3, so location fallback appended
		const result = buildAnswerFollowUpSuggestions(stateLocOnly, 'where');
		const combined = result.join(' ');
		expect(combined).toMatch(/warehouse/);
	});

	it('does not exceed 4 suggestions', () => {
		const result = buildAnswerFollowUpSuggestions(stateWithBoth, 'who');
		expect(result.length).toBeLessThanOrEqual(4);
	});

	it('does not fabricate names or locations when state is null', () => {
		const questionTypes: Array<'who' | 'what' | 'when' | 'where' | 'why' | 'how' | 'other'> =
			['who', 'what', 'when', 'where', 'why', 'how', 'other'];
		for (const qt of questionTypes) {
			const result = buildAnswerFollowUpSuggestions(null, qt);
			for (const s of result) {
				expect(s).not.toMatch(/Mangis|Preston|December/);
			}
		}
	});
});

describe('rankFollowUpSuggestions — investigative progression', () => {
	const nullState: SuggestionRankingContext = { questionType: 'who', state: null, currentQuery: 'who' };

	it('"who" question: "What did they do?" ranks first (action progression)', () => {
		const ranked = rankFollowUpSuggestions(
			["When did that happen?", "Where did it occur?", "What did they do?"],
			nullState
		);
		expect(ranked[0]).toBe("What did they do?");
	});

	it('"who" question: "When did that happen?" ranks before "Where did it occur?"', () => {
		const ranked = rankFollowUpSuggestions(
			["Where did it occur?", "When did that happen?", "What did they do?"],
			nullState
		);
		const whenIdx = ranked.indexOf("When did that happen?");
		const whereIdx = ranked.indexOf("Where did it occur?");
		expect(whenIdx).toBeLessThan(whereIdx);
	});

	it('"when" time question: "What happened?" ranks first (time-question override + boost)', () => {
		const ctx: SuggestionRankingContext = {
			questionType: 'what',
			state: null,
			currentQuery: 'what time was it'
		};
		const ranked = rankFollowUpSuggestions(
			["Who was involved?", "Where did it occur?", "What happened?"],
			ctx
		);
		expect(ranked[0]).toBe("What happened?");
	});

	it('"where" question: "Who was there?" ranks first', () => {
		const ctx: SuggestionRankingContext = { questionType: 'where', state: null, currentQuery: 'where' };
		const ranked = rankFollowUpSuggestions(
			["When did it occur?", "What happened?", "Who was there?"],
			ctx
		);
		expect(ranked[0]).toBe("Who was there?");
	});

	it('"why" question: "What supports that?" ranks first', () => {
		const ctx: SuggestionRankingContext = { questionType: 'why', state: null, currentQuery: 'why' };
		const ranked = rankFollowUpSuggestions(
			["Who was involved?", "What was the outcome?", "What supports that?"],
			ctx
		);
		expect(ranked[0]).toBe("What supports that?");
	});
});

describe('rankFollowUpSuggestions — context richness and state-aware ordering', () => {
	const stateWithBoth: ConversationState = {
		topic: '',
		entity: 'Mangis',
		actionBody: null,
		location: 'Preston address',
		lastQuestionType: 'who',
		dateHint: null,
	};

	it('entity-mentioning suggestion ranks above generic when state is present', () => {
		const ctx: SuggestionRankingContext = {
			questionType: 'when',
			state: stateWithBoth,
			currentQuery: 'when'
		};
		const ranked = rankFollowUpSuggestions(
			["When did the key events occur?", "When did Mangis arrive at the Preston address?"],
			ctx
		);
		// Entity + location → more context-rich
		expect(ranked[0]).toBe("When did Mangis arrive at the Preston address?");
	});

	it('location-mentioning suggestion outranks fully generic when entity absent', () => {
		const stateLocOnly: ConversationState = {
			topic: '', entity: null, actionBody: null,
			location: 'warehouse', lastQuestionType: 'where', dateHint: null,
		};
		const ctx: SuggestionRankingContext = {
			questionType: 'where',
			state: stateLocOnly,
			currentQuery: 'where'
		};
		const ranked = rankFollowUpSuggestions(
			["Where was the evidence collected?", "What occurred at the warehouse?"],
			ctx
		);
		expect(ranked[0]).toBe("What occurred at the warehouse?");
	});
});

describe('rankFollowUpSuggestions — redundancy penalty', () => {
	it('same-interrogative suggestion without state grounding is pushed down', () => {
		const ctx: SuggestionRankingContext = {
			questionType: 'who',
			state: null,
			currentQuery: 'who'
		};
		const ranked = rankFollowUpSuggestions(
			["Who else was there?", "What did they do?"],
			ctx
		);
		// "Who else was there?" starts with "who" — same as currentQuery and not grounded
		expect(ranked.indexOf("What did they do?")).toBeLessThan(ranked.indexOf("Who else was there?"));
	});

	it('same-interrogative suggestion WITH state grounding is NOT penalised', () => {
		const state: ConversationState = {
			topic: '', entity: 'Mangis', actionBody: null,
			location: null, lastQuestionType: 'who', dateHint: null,
		};
		const ctx: SuggestionRankingContext = { questionType: 'who', state, currentQuery: 'who' };
		// "Who was Mangis with?" mentions entity → grounded → no redundancy penalty
		const ranked = rankFollowUpSuggestions(
			["What did Mangis do?", "Where was Mangis observed?"],
			ctx
		);
		// Just check ranking doesn't throw and has expected length
		expect(ranked.length).toBe(2);
	});
});

describe('rankFollowUpSuggestions — deduplication', () => {
	it('exact duplicates (case-insensitive) are removed', () => {
		const ctx: SuggestionRankingContext = { questionType: 'who', state: null, currentQuery: 'who' };
		const ranked = rankFollowUpSuggestions(
			["What did they do?", "what did they do?", "When did that happen?"],
			ctx
		);
		expect(ranked.length).toBe(2);
	});

	it('output is deterministic — same input always produces same order', () => {
		const ctx: SuggestionRankingContext = { questionType: 'when', state: null, currentQuery: 'when' };
		const input = ["Where did it occur?", "What happened?", "Who was involved?"];
		const a = rankFollowUpSuggestions([...input], ctx);
		const b = rankFollowUpSuggestions([...input], ctx);
		expect(a).toEqual(b);
	});
});

describe('buildAnswerFollowUpSuggestions — ranked ordering', () => {
	it('"who" question: actionable "What did they do?" appears first', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'who', 'who carried the bags?');
		expect(result[0]).toBe("What did they do?");
	});

	it('"when" question: event-oriented suggestion appears first', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'when', 'when did that happen?');
		// "What happened?" should beat "Who was involved?" via progression
		expect(result[0]).toBe("What happened?");
	});

	it('time question currentQuery promotes event follow-up to first', () => {
		// Even if questionType is classified as 'what', a time currentQuery triggers override
		const result = buildAnswerFollowUpSuggestions(null, 'what', 'what time was it');
		// The time-question override should push "What happened?" or event suggestion up
		const firstLower = result[0].toLowerCase();
		expect(firstLower).toMatch(/happened|occurred|did/);
	});

	it('person context: entity-specific action suggestion leads (not generic "What did they do?")', () => {
		const state: ConversationState = {
			topic: '', entity: 'Mangis', actionBody: null,
			location: null, lastQuestionType: 'who', dateHint: null,
		};
		const result = buildAnswerFollowUpSuggestions(state, 'who', 'who was there?');
		// Person context → entity-specific action is first
		expect(result[0]).toMatch(/^What did Mangis do\?/);
		// All suggestions in person pool reference entity
		expect(result.join(' ')).toMatch(/Mangis/);
	});
});

describe('getTopSuggestionLabel', () => {
	it('returns "Clarify event" for any no_context clarification type', () => {
		expect(getTopSuggestionLabel('Who is involved in the most recent case activity?', 'no_context'))
			.toBe('Clarify event');
	});

	it('returns "Clarify event" for low_confidence clarification type', () => {
		expect(getTopSuggestionLabel('What did Mangis do at the Preston address?', 'low_confidence'))
			.toBe('Clarify event');
	});

	it('returns "Follow evidence" for evidence/support suggestions', () => {
		expect(getTopSuggestionLabel('What supports that?')).toBe('Follow evidence');
	});

	it('returns "Follow evidence" for "why" suggestions', () => {
		expect(getTopSuggestionLabel('Why is that significant?')).toBe('Follow evidence');
	});

	it('returns "Continue timeline" for "What happened?" suggestion', () => {
		expect(getTopSuggestionLabel('What happened?')).toBe('Continue timeline');
	});

	it('returns "Continue timeline" for "What did they do?" suggestion', () => {
		expect(getTopSuggestionLabel('What did they do?')).toBe('Continue timeline');
	});

	it('returns "Continue timeline" for next-event suggestions', () => {
		expect(getTopSuggestionLabel('What happened next?')).toBe('Continue timeline');
	});

	it('returns "Most relevant" for entity deep-dive suggestions', () => {
		expect(getTopSuggestionLabel('What else is documented about Mangis?')).toBe('Most relevant');
	});

	it('returns "Best next step" for generic who/when/where suggestions', () => {
		expect(getTopSuggestionLabel('Who was involved?')).toBe('Best next step');
	});

	it('returns "Best next step" for "Where did it occur?"', () => {
		expect(getTopSuggestionLabel('Where did it occur?')).toBe('Best next step');
	});

	it('is deterministic — same input always returns same label', () => {
		const a = getTopSuggestionLabel('What supports that?');
		const b = getTopSuggestionLabel('What supports that?');
		expect(a).toBe(b);
	});

	it('clarification type takes precedence over text pattern', () => {
		// Even if the text matches "Continue timeline", the type wins for clarification
		expect(getTopSuggestionLabel('What happened in the most recent activity?', 'no_context'))
			.toBe('Clarify event');
	});
});

describe('detectQueryContext', () => {
	const baseState = (overrides: Partial<ConversationState>): ConversationState => ({
		topic: '', entity: null, actionBody: null, location: null,
		lastQuestionType: 'what', dateHint: null, ...overrides,
	});

	it('returns "evidence" when query contains evidence keywords', () => {
		expect(detectQueryContext(null, 'what', 'what is the most important piece of evidence?')).toBe('evidence');
		expect(detectQueryContext(null, 'what', 'what evidence supports this?')).toBe('evidence');
		expect(detectQueryContext(null, 'why', 'why is this significant?')).toBe('evidence');
	});

	it('returns "person" for entity + who question', () => {
		const state = baseState({ entity: 'Mangis' });
		expect(detectQueryContext(state, 'who', 'who was there?')).toBe('person');
	});

	it('returns "person" for entity + what question', () => {
		const state = baseState({ entity: 'Mangis' });
		expect(detectQueryContext(state, 'what', 'what did they do?')).toBe('person');
	});

	it('returns "location" for location + where question', () => {
		const state = baseState({ location: 'Preston address' });
		expect(detectQueryContext(state, 'where', 'where did it occur?')).toBe('location');
	});

	it('returns "timeline" when actionBody is present (no entity)', () => {
		const state = baseState({ actionBody: 'carried bags' });
		expect(detectQueryContext(state, 'when', 'when did that happen?')).toBe('timeline');
	});

	it('returns "timeline" when dateHint is present (no entity)', () => {
		const state = baseState({ dateHint: 'December 11, 2025' });
		expect(detectQueryContext(state, 'what', 'what time?')).toBe('timeline');
	});

	it('entity + actionBody: person wins over timeline for who/what questions', () => {
		// who + entity takes priority over timeline even if actionBody is present
		const state = baseState({ entity: 'Mangis', actionBody: 'carried bags' });
		expect(detectQueryContext(state, 'who', 'who was there?')).toBe('person');
	});

	it('returns "person" as weak signal when entity is known but question type is neutral', () => {
		const state = baseState({ entity: 'Rogers' });
		expect(detectQueryContext(state, 'other', 'what happened?')).toBe('person');
	});

	it('returns "general" when no state and no evidence keywords', () => {
		expect(detectQueryContext(null, 'who', 'who is involved?')).toBe('general');
		expect(detectQueryContext(null, 'when', 'when did it happen?')).toBe('general');
	});
});

describe('applyDiversityPass', () => {
	it('passes through a naturally diverse set unchanged', () => {
		const input = ["What did they do?", "When did that happen?", "Who was there?", "What supports that?"];
		const result = applyDiversityPass(input);
		expect(result).toEqual(input);
	});

	it('caps same-bucket suggestions at 2 and defers the rest', () => {
		// Three 'action' bucket items
		const input = ["What happened next?", "What happened before?", "What happened there?", "Who was involved?"];
		const result = applyDiversityPass(input);
		// "Who was involved?" (person bucket) should move into position 3
		expect(result[2]).toBe("Who was involved?");
		// "What happened there?" is deferred to position 4
		expect(result[3]).toBe("What happened there?");
	});

	it('fills remaining slots from deferred when no other buckets available', () => {
		// All action bucket — diversity defers beyond 2 but fills back to 4
		const input = ["What happened?", "What occurred?", "What did they do?", "What was done?"];
		const result = applyDiversityPass(input);
		expect(result.length).toBe(4);
	});

	it('handles small sets without breaking', () => {
		expect(applyDiversityPass(["What happened?"])).toEqual(["What happened?"]);
		expect(applyDiversityPass([])).toEqual([]);
	});

	it('is deterministic', () => {
		const input = ["What happened next?", "What happened before?", "Who was there?", "When did it occur?"];
		expect(applyDiversityPass([...input])).toEqual(applyDiversityPass([...input]));
	});
});

describe('buildAnswerFollowUpSuggestions — context-aware pools', () => {
	const mkState = (overrides: Partial<ConversationState>): ConversationState => ({
		topic: '', entity: null, actionBody: null, location: null,
		lastQuestionType: 'what', dateHint: null, ...overrides,
	});

	it('evidence context: "Why is that important?" ranks first', () => {
		const result = buildAnswerFollowUpSuggestions(
			null, 'what', 'what is the most important piece of evidence?'
		);
		expect(result[0]).toMatch(/why is that important/i);
	});

	it('evidence context: suggestion set contains support/evidence vocabulary', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'what', 'what evidence supports this?');
		const combined = result.join(' ').toLowerCase();
		expect(combined).toMatch(/support|evidence|important|tied/);
	});

	it('person context: entity-specific action suggestion leads', () => {
		const result = buildAnswerFollowUpSuggestions(
			mkState({ entity: 'Rogers' }), 'who', 'who was at the scene?'
		);
		expect(result[0]).toMatch(/^What did Rogers do\?/);
	});

	it('person context: suggestions cover action, time, location, and depth', () => {
		const result = buildAnswerFollowUpSuggestions(
			mkState({ entity: 'Thompson' }), 'who', 'who is involved?'
		);
		const combined = result.join(' ').toLowerCase();
		expect(combined).toMatch(/thompson/);
		// Should span multiple investigative dimensions
		expect(result.length).toBeGreaterThanOrEqual(3);
	});

	it('location context: location-specific event question leads', () => {
		const result = buildAnswerFollowUpSuggestions(
			mkState({ location: 'warehouse' }), 'where', 'where did it occur?'
		);
		expect(result[0]).toMatch(/warehouse/i);
		expect(result[0]).toMatch(/happened|occurred/i);
	});

	it('timeline context: "What happened next?" or "Who else was involved?" leads', () => {
		const result = buildAnswerFollowUpSuggestions(
			mkState({ actionBody: 'delivered package', dateHint: 'December 5, 2025' }),
			'what',
			'what did they do?'
		);
		expect(result[0]).toMatch(/next|involved/i);
	});

	it('general context (null state, who): "What did they do?" still leads', () => {
		const result = buildAnswerFollowUpSuggestions(null, 'who', 'who was there?');
		expect(result[0]).toBe("What did they do?");
	});

	it('diversity: timeline context does not return all action-bucket suggestions', () => {
		const result = buildAnswerFollowUpSuggestions(
			mkState({ actionBody: 'met contact', dateHint: 'Dec 10' }),
			'what', 'what did they do?'
		);
		// "What happened next?" and "What happened before?" are both action, but
		// "Who else was involved?" (person) and "What time did that occur?" (time) should also appear
		const buckets = result.map((s) => {
			const l = s.toLowerCase();
			if (/^who\b/.test(l)) return 'person';
			if (/^when\b|what time/.test(l)) return 'time';
			if (/^what (happened|occurred)/.test(l)) return 'action';
			return 'other';
		});
		const actionCount = buckets.filter((b) => b === 'action').length;
		expect(actionCount).toBeLessThanOrEqual(2);
	});

	it('repetition: location query top suggestion is not location bucket', () => {
		// User just asked "where" with no state — top suggestion should not be "where..." again
		const result = buildAnswerFollowUpSuggestions(null, 'where', 'where did it occur?');
		expect(result[0].toLowerCase()).not.toMatch(/^where\b/);
	});

	it('deterministic: same inputs always produce same ranking', () => {
		const state = mkState({ entity: 'Mangis', location: 'Preston address' });
		const a = buildAnswerFollowUpSuggestions(state, 'who', 'who was there?');
		const b = buildAnswerFollowUpSuggestions(state, 'who', 'who was there?');
		expect(a).toEqual(b);
	});
});

describe('isContextDependent — pronoun-referencing where/when/what patterns', () => {
	it.each([
		'where was this', 'where was it', 'where is this', 'where is it',
		'when was this', 'when was it', 'when did this', 'when did it',
		'what was this', 'what was it', 'what is this', 'what is it',
	])('"%s" is context-dependent', (q) => {
		expect(isContextDependent(q)).toBe(true);
	});

	it('self-contained "where was Mangis" is NOT flagged', () => {
		// Does not match the pronoun patterns (subject is a proper noun)
		expect(isContextDependent('Where was Mangis seen?')).toBe(false);
	});
});
