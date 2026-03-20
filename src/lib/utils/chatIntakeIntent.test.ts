import { describe, it, expect } from 'vitest';
import { detectCaseChatIntakeIntent, isIsoOccurredAtWithTimezone } from './chatIntakeIntent';

describe('detectCaseChatIntakeIntent', () => {
	it('returns timeline for add to timeline', () => {
		expect(detectCaseChatIntakeIntent('add to timeline that x')).toEqual({ kind: 'timeline' });
	});
	it('returns note for create note', () => {
		expect(detectCaseChatIntakeIntent('Create note: witness statement')).toEqual({ kind: 'note' });
	});
	it('returns null for normal questions', () => {
		expect(detectCaseChatIntakeIntent('What are the open tasks?')).toBeNull();
	});
});

describe('isIsoOccurredAtWithTimezone', () => {
	it('accepts Zulu', () => {
		expect(isIsoOccurredAtWithTimezone('2026-12-17T14:40:00Z')).toBe(true);
	});
	it('rejects date-only', () => {
		expect(isIsoOccurredAtWithTimezone('2026-12-17')).toBe(false);
	});
});
