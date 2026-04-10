import { describe, it, expect } from 'vitest';
import { coreAttributesEntries, humanizeAttributeKey, associationKindLabel } from './caseIntelligenceEntityDetailDisplay';

describe('caseIntelligenceEntityDetailDisplay (P67-06)', () => {
	it('humanizeAttributeKey title-cases snake_case', () => {
		expect(humanizeAttributeKey('license_plate')).toBe('License Plate');
	});

	it('coreAttributesEntries sorts keys and drops empty values', () => {
		const rows = coreAttributesEntries({ b: 1, a: 'x', z: '', n: null as unknown as string });
		expect(rows.map((r) => r.key)).toEqual(['a', 'b']);
		expect(rows.find((r) => r.key === 'a')?.value).toBe('x');
	});

	it('associationKindLabel maps known kinds', () => {
		expect(associationKindLabel('OPERATES_VEHICLE')).toBe('Operates vehicle');
	});
});
