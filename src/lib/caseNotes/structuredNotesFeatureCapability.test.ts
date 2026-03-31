import { describe, expect, it } from 'vitest';
import {
	computeStructuredNotesUiOffered,
	readStructuredNotesServerEnabledFromHealth
} from './structuredNotesFeatureCapability';

describe('structuredNotesFeatureCapability (P34-21)', () => {
	it('readStructuredNotesServerEnabledFromHealth is true only when flag is boolean true', () => {
		expect(readStructuredNotesServerEnabledFromHealth(null)).toBe(false);
		expect(readStructuredNotesServerEnabledFromHealth({})).toBe(false);
		expect(readStructuredNotesServerEnabledFromHealth({ structured_notes_enabled: false })).toBe(false);
		expect(
			readStructuredNotesServerEnabledFromHealth({ structured_notes_enabled: 'true' } as Record<string, unknown>)
		).toBe(false);
		expect(readStructuredNotesServerEnabledFromHealth({ structured_notes_enabled: true })).toBe(true);
	});

	it('computeStructuredNotesUiOffered respects loading, server, and PUBLIC suppress', () => {
		expect(computeStructuredNotesUiOffered(false, true, false)).toBe(false);
		expect(computeStructuredNotesUiOffered(true, false, false)).toBe(false);
		expect(computeStructuredNotesUiOffered(true, true, true)).toBe(false);
		expect(computeStructuredNotesUiOffered(true, true, false)).toBe(true);
	});
});
