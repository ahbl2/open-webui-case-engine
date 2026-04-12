/**
 * P85-01 — TimelineEntryCard density & isolation (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard P85-01 density & row isolation (source contract)', () => {
	it('keeps P84 review flag as per-instance component state (not shared across rows)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/let entryFlagged = false/);
		expect(src).toMatch(/function toggleEntryFlag/);
		expect(src).not.toMatch(/export let entryFlagged/);
	});

	it('keys P83-04 body clamp remeasure to entry id + content so rows do not share expand state', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/bodyClampMeasureKey/);
		expect(src).toMatch(/`del:\$\{entry\.id\}/);
		expect(src).toMatch(/`act:\$\{entry\.id\}/);
		expect(src).toMatch(/bodyExpanded = false/);
	});

	it('exposes row identity on list items for dense-list debugging and test selectors', () => {
		const src = readFileSync(cardPath, 'utf8');
		const activeLi = src.match(/data-entry-id=\{entry\.id\}/g);
		expect(activeLi).not.toBeNull();
		expect(activeLi!.length).toBeGreaterThanOrEqual(2);
	});

	it('allows combined P84 visual states on one card (flag + relate + follow-up)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(
			/ds-timeline-entry-card--review-flagged[\s\S]*?ds-timeline-entry-card--relationship-paired[\s\S]*?ds-timeline-entry-card--followup-marked/
		);
	});
});
