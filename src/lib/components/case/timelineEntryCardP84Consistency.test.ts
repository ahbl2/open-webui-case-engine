/**
 * P84-05 — Timeline operational interaction consistency (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');
const surfacesPath = join(dirname(fileURLToPath(import.meta.url)), '../../styles/detectiveSurfaces.css');

describe('TimelineEntryCard P84-05 ops toolbar consistency (source contract)', () => {
	it('shares chrome + session-only titles for flag, relate, and follow-up', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('TIMELINE_OPS_BTN');
		expect(src).toContain('TIMELINE_OPS_FOCUS_FLAG');
		expect(src).toContain('TIMELINE_OPS_FOCUS_RELATE');
		expect(src).toContain('TIMELINE_OPS_FOCUS_FOLLOWUP');
		expect(src).toContain('TIMELINE_OPS_TITLE_FLAG');
		expect(src).toContain('TIMELINE_OPS_TITLE_RELATE');
		expect(src).toContain('TIMELINE_OPS_TITLE_FOLLOWUP');
	});

	it('orders operational controls flag → relate → follow-up before other top-actions controls', () => {
		const src = readFileSync(cardPath, 'utf8');
		let pos = 0;
		for (let i = 0; i < 2; i++) {
			pos = src.indexOf('data-testid="timeline-entry-flag-toggle"', pos);
			expect(pos).toBeGreaterThanOrEqual(0);
			const chunk = src.slice(pos, pos + 4000);
			const iRel = chunk.indexOf('data-testid="timeline-entry-relate-toggle"');
			const iFu = chunk.indexOf('data-testid="timeline-followup-toggle"');
			expect(iRel).toBeGreaterThan(0);
			expect(iFu).toBeGreaterThan(iRel);
			pos += 1;
		}
	});

	it('applies combined-state card classes for flag, relationship, and follow-up', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('ds-timeline-entry-card--review-flagged');
		expect(src).toContain('ds-timeline-entry-card--relationship-paired');
		expect(src).toContain('ds-timeline-entry-card--followup-marked');
	});

	it('documents P84 combined affordances in detectiveSurfaces.css', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toContain('P84-02');
		expect(css).toContain('P84-03');
		expect(css).toContain('P84-04');
		expect(css).toContain('.ds-timeline-entry-card--review-flagged');
		expect(css).toContain('.ds-timeline-entry-card--relationship-paired');
		expect(css).toContain('.ds-timeline-entry-card--followup-marked');
		expect(css).toMatch(/\.ds-timeline-entry-row__top-actions\s*\{[^}]*gap:\s*var\(--ds-space-2\)/s);
	});

	it('does not add persistence or fetch for operational affordances', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
		expect(src).not.toMatch(/indexedDB/i);
		expect(src).not.toMatch(/fetch\s*\(/);
	});
});
