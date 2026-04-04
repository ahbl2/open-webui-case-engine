/**
 * P38-07 — Lock operator clarity strings (direct log vs Proposals).
 * P40-05G: timezone label reflects browser-local datetime-local semantics, not UTC.
 */
import { describe, it, expect } from 'vitest';
import {
	TIMELINE_OFFICIAL_RECORD_BADGE_TITLE,
	TIMELINE_HEADER_SUBLINE,
	TIMELINE_LOG_ENTRY_BUTTON_TITLE,
	TIMELINE_EMPTY_STATE_DESCRIPTION,
	TIMELINE_TIME_ZONE_LABEL,
	TIMELINE_TIME_ZONE_TOOLTIP
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

describe('timelineOperatorMicrocopy — timezone label (P40-05G local)', () => {
	it('TIMELINE_TIME_ZONE_LABEL signals local time, not UTC', () => {
		expect(TIMELINE_TIME_ZONE_LABEL.toLowerCase()).toContain('local');
		expect(TIMELINE_TIME_ZONE_LABEL.toUpperCase()).not.toContain('UTC');
	});

	it('TIMELINE_TIME_ZONE_LABEL is a non-empty string', () => {
		expect(typeof TIMELINE_TIME_ZONE_LABEL).toBe('string');
		expect(TIMELINE_TIME_ZONE_LABEL.length).toBeGreaterThan(0);
	});

	it('TIMELINE_TIME_ZONE_TOOLTIP references local time, not UTC', () => {
		expect(TIMELINE_TIME_ZONE_TOOLTIP.toLowerCase()).toContain('local');
		expect(TIMELINE_TIME_ZONE_TOOLTIP.toUpperCase()).not.toContain('UTC');
	});

	it('TIMELINE_TIME_ZONE_TOOLTIP describes required time context', () => {
		expect(TIMELINE_TIME_ZONE_TOOLTIP.toLowerCase()).toContain('time');
	});
});
