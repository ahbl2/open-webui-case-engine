import { describe, it, expect } from 'vitest';
import {
	isContextDependent,
	classifyQuestionType,
	extractProperNouns,
	extractLocation,
	extractActionBody,
	extractPriorContext,
	buildConversationState,
	resolveConversationalQuery,
	type ConversationTurn,
} from './conversationalContextResolver';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Standard prior conversation: bags at Preston address. Entity answer = Mangis. */
const prestonTurns: ConversationTurn[] = [
	{ role: 'user', content: 'Who carried the bags into the Preston address?' },
	{ role: 'assistant', content: 'Mangis carried the bags into the Preston address.' },
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
			{ role: 'user', content: 'What happened?' },
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
			{ role: 'user', content: 'What happened?' },
			{ role: 'assistant', content: 'something occurred at some point' },
		]);
		expect(state!.confidence).toBe('low');
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
