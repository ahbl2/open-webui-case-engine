/**
 * P84-04 — Follow-up marker: source contracts (mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');
const surfacesPath = join(dirname(fileURLToPath(import.meta.url)), '../../styles/detectiveSurfaces.css');

describe('TimelineEntryCard P84-04 follow-up (source contract)', () => {
	it('exposes parent-driven follow-up props and two toggle controls', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/export let entryNeedsFollowUp/);
		expect(src).toMatch(/export let onFollowUpClick/);
		const toggles = src.match(/data-testid="timeline-followup-toggle"/g);
		expect(toggles?.length).toBe(2);
		expect(src).toMatch(/data-timeline-followup-toggle=/);
		expect(src).toMatch(/data-timeline-row-followup=/);
	});

	it('uses required aria labels and session-only title', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('TIMELINE_OPS_TITLE_FOLLOWUP');
		expect(src).toContain('Mark for follow-up');
		expect(src).toContain('Remove follow-up marker');
		expect(src).toContain('Not saved (session only)');
		expect(src).toMatch(/aria-pressed=\{entryNeedsFollowUp\}/);
	});

	it('documents follow-up visuals in detectiveSurfaces.css', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toContain('P84-04');
		expect(css).toContain('.ds-timeline-entry-card--followup-marked');
		expect(css).toContain('.ds-timeline-entry-followup-toggle--active');
	});

	it('does not add persistence or fetch', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
		expect(src).not.toMatch(/fetch\s*\(/);
	});
});
