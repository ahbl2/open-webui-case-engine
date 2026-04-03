/**
 * P38-08 — Timeline type `note` vs Notes tab wording.
 */
import { describe, it, expect } from 'vitest';
import {
	TIMELINE_TYPE_NOTE_DISPLAY_LABEL,
	TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP
} from './timelineTypeNoteClarity';

describe('timelineTypeNoteClarity (P38-08)', () => {
	it('display label signals timeline, not renaming stored value', () => {
		expect(TIMELINE_TYPE_NOTE_DISPLAY_LABEL.toLowerCase()).toContain('note');
		expect(TIMELINE_TYPE_NOTE_DISPLAY_LABEL.toLowerCase()).toContain('timeline');
	});

	it('tooltip contrasts official timeline vs Notes tab', () => {
		expect(TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP.toLowerCase()).toContain('timeline');
		expect(TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP.toLowerCase()).toContain('notes tab');
	});
});
