import { describe, expect, it } from 'vitest';
import { formatEvidenceSetSavedAt } from './p109EvidenceSetsFormat';

describe('p109EvidenceSetsFormat', () => {
	it('formatEvidenceSetSavedAt returns a non-empty string for ISO input', () => {
		const s = formatEvidenceSetSavedAt('2020-06-15T12:00:00.000Z');
		expect(s.length).toBeGreaterThan(0);
	});
});
