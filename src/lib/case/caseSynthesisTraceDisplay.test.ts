import { describe, it, expect } from 'vitest';
import { formatTraceIdLine } from './caseSynthesisTraceDisplay';

describe('formatTraceIdLine (P96-03)', () => {
	it('returns empty string for empty ids', () => {
		expect(formatTraceIdLine([])).toBe('');
	});

	it('joins all ids when under max', () => {
		expect(formatTraceIdLine(['a', 'b'])).toBe('a, b');
	});

	it('truncates with (+N more) deterministically', () => {
		const ids = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
		expect(formatTraceIdLine(ids, 8)).toBe('1, 2, 3, 4, 5, 6, 7, 8 (+2 more)');
	});
});
