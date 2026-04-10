/**
 * P38-07 — Lock operator clarity strings (direct log vs Proposals).
 * P40-05G / P41-10: timezone label reflects operational America/New_York, not UTC.
 */
import { describe, it, expect } from 'vitest';
import {
	TIMELINE_OFFICIAL_RECORD_BADGE_TITLE,
	TIMELINE_HEADER_RULES_LINE,
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

	it('header rules line states committed timeline vs Notes drafts (P41-48)', () => {
		expect(TIMELINE_HEADER_RULES_LINE.toLowerCase()).toContain('committed');
		expect(TIMELINE_HEADER_RULES_LINE.toLowerCase()).toContain('drafts');
		expect(TIMELINE_HEADER_RULES_LINE.toLowerCase()).toContain('notes');
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

describe('timelineOperatorMicrocopy — timezone label (P41-10 operational)', () => {
	it('TIMELINE_TIME_ZONE_LABEL names America/New_York, not UTC', () => {
		expect(TIMELINE_TIME_ZONE_LABEL.toLowerCase()).toContain('america/new_york');
		expect(TIMELINE_TIME_ZONE_LABEL.toUpperCase()).not.toContain('UTC');
	});

	it('TIMELINE_TIME_ZONE_LABEL is a non-empty string', () => {
		expect(typeof TIMELINE_TIME_ZONE_LABEL).toBe('string');
		expect(TIMELINE_TIME_ZONE_LABEL.length).toBeGreaterThan(0);
	});

	it('TIMELINE_TIME_ZONE_TOOLTIP references operational New York time, not UTC', () => {
		expect(TIMELINE_TIME_ZONE_TOOLTIP.toLowerCase()).toContain('america/new_york');
		expect(TIMELINE_TIME_ZONE_TOOLTIP.toUpperCase()).not.toContain('UTC');
	});

	it('TIMELINE_TIME_ZONE_TOOLTIP describes required time context', () => {
		expect(TIMELINE_TIME_ZONE_TOOLTIP.toLowerCase()).toContain('time');
	});
});
