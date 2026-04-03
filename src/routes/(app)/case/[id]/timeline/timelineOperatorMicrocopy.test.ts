/**
 * P38-07 — Lock operator clarity strings (direct log vs Proposals).
 */
import { describe, it, expect } from 'vitest';
import {
	TIMELINE_OFFICIAL_RECORD_BADGE_TITLE,
	TIMELINE_HEADER_SUBLINE,
	TIMELINE_LOG_ENTRY_BUTTON_TITLE,
	TIMELINE_EMPTY_STATE_DESCRIPTION
} from './timelineOperatorMicrocopy';

describe('timelineOperatorMicrocopy (P38-07)', () => {
	it('badge title names both direct log and Proposals (not pipeline-only)', () => {
		expect(TIMELINE_OFFICIAL_RECORD_BADGE_TITLE.toLowerCase()).toContain('log entry');
		expect(TIMELINE_OFFICIAL_RECORD_BADGE_TITLE.toLowerCase()).toContain('proposals');
	});

	it('header subline mentions both entry paths and Notes drafts', () => {
		expect(TIMELINE_HEADER_SUBLINE).toContain('+ Log entry');
		expect(TIMELINE_HEADER_SUBLINE.toLowerCase()).toContain('proposals');
		expect(TIMELINE_HEADER_SUBLINE.toLowerCase()).toContain('notes tab');
	});

	it('log button title contrasts immediate save vs Proposals path', () => {
		expect(TIMELINE_LOG_ENTRY_BUTTON_TITLE.toLowerCase()).toContain('official timeline');
		expect(TIMELINE_LOG_ENTRY_BUTTON_TITLE.toLowerCase()).toContain('proposals');
	});

	it('empty state describes direct save vs approve/commit path', () => {
		expect(TIMELINE_EMPTY_STATE_DESCRIPTION).toContain('+ Log entry');
		expect(TIMELINE_EMPTY_STATE_DESCRIPTION.toLowerCase()).toContain('proposals');
		expect(TIMELINE_EMPTY_STATE_DESCRIPTION.toLowerCase()).toContain('commit');
	});
});
