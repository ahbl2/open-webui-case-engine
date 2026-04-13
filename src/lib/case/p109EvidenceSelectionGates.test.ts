import { describe, it, expect } from 'vitest';
import { isTimelineEntrySelectableForEvidence, isCaseFileSelectableForEvidence } from './p109EvidenceSelectionGates';

describe('p109EvidenceSelectionGates', () => {
	it('gates timeline rows to active (non-deleted) only', () => {
		expect(isTimelineEntrySelectableForEvidence({ deleted_at: null })).toBe(true);
		expect(isTimelineEntrySelectableForEvidence({ deleted_at: '2020-01-01T00:00:00.000Z' })).toBe(false);
	});

	it('gates file rows to non-deleted only', () => {
		expect(isCaseFileSelectableForEvidence({ id: 'a', deleted_at: undefined } as any)).toBe(true);
		expect(isCaseFileSelectableForEvidence({ id: 'a', deleted_at: '2020-01-01T00:00:00.000Z' } as any)).toBe(
			false
		);
	});
});
