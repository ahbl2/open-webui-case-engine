/**
 * P84-01 / P84-02 — Timeline entry review flag: local-only; no persistence; scan affordance (CSS).
 * Source contract tests (mount-free); complements manual QA.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');
const surfacesPath = join(dirname(fileURLToPath(import.meta.url)), '../../styles/detectiveSurfaces.css');

describe('TimelineEntryCard P84-01 review flag (source contract)', () => {
	it('exposes local-only flag toggle with accessibility hooks', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/timeline-entry-flag-toggle/);
		expect(src).toMatch(/data-timeline-review-flag/);
		expect(src).toMatch(/aria-pressed=\{entryFlagged\}/);
		expect(src).toMatch(/aria-label=\{entryFlagged \? 'Unflag entry' : 'Flag entry'\}/);
		expect(src).toContain('TIMELINE_OPS_TITLE_FLAG');
		expect(src).toContain('Attention during review');
		expect(src).toContain('Not saved (session only)');
	});

	it('keeps flag state in component memory only (no persistence layers)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/let entryFlagged = false/);
		expect(src).toMatch(/function toggleEntryFlag/);
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
		expect(src).not.toMatch(/indexedDB/i);
	});

	it('keeps toggleEntryFlag synchronous (no async / await in flag handler)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(
			/function toggleEntryFlag\(\): void \{\s*entryFlagged = !entryFlagged;\s*\}/
		);
		expect(src).not.toMatch(/fetch\s*\(/);
	});

	it('preserves P83-04 body toggle contract (flag must not remove expand/collapse)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/timeline-entry-body-toggle/);
		expect(src).toContain("'Show more'");
	});

	it('duplicates flag control for active and removed rows (both branches)', () => {
		const src = readFileSync(cardPath, 'utf8');
		const matches = src.match(/data-testid="timeline-entry-flag-toggle"/g);
		expect(matches?.length).toBe(2);
	});
});

describe('TimelineEntryCard P84-02 flagged scan affordance (source contract)', () => {
	it('ties flagged visuals to DS classes + row/card data attributes (no new controls)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('ds-timeline-entry-card--review-flagged');
		expect(src).toContain('ds-timeline-entry-flag-toggle--active');
		expect(src).toMatch(/data-timeline-card-flagged=\{entryFlagged \? '1' : '0'\}/);
		expect(src).toMatch(/data-timeline-row-flagged=\{entryFlagged \? '1' : '0'\}/);
		const toggleTestIds = src.match(/data-testid="timeline-entry-flag-toggle"/g);
		expect(toggleTestIds?.length).toBe(2);
	});

	it('documents P84-02 styling in detectiveSurfaces.css (inset accent + flag toggle active)', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toContain('P84-02');
		expect(css).toContain('.ds-timeline-entry-card--review-flagged');
		expect(css).toContain('.ds-timeline-entry-flag-toggle--active');
		expect(css).toContain('.ds-timeline-entry-row--removed .ds-card.ds-timeline-entry-card--review-flagged');
	});

	it('does not add persistence for flagged state (regression)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
	});
});
