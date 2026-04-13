import { describe, expect, it } from 'vitest';
import { p106LiteralAttributeRows } from './p106CaseEntityLiteralAttributes';

describe('p106LiteralAttributeRows (P106-03)', () => {
	it('returns only primitive values as strings, sorted by key', () => {
		const rows = p106LiteralAttributeRows({
			z: 'last',
			a: 1,
			nested: { x: 1 },
			flag: true,
			empty: null
		});
		expect(rows.map((r) => r.key)).toEqual(['a', 'flag', 'z']);
		expect(rows.find((r) => r.key === 'a')?.value).toBe('1');
	});
});
