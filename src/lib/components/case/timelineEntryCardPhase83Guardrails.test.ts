/**
 * P83-06 — Source-level guardrails for Timeline entry card (Phase 83 convergence).
 * Complements behavioral tests; fails if P83-02 / P83-04 / P83-05 strings drift without intent.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard Phase 83 guardrails (source contract)', () => {
	it('preserves P83-02 time semantics and creator wording', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('TIMELINE_TIME_TOOLTIP_OCCURRED');
		expect(src).toContain('TIMELINE_TIME_TOOLTIP_RECORDED');
		expect(src).toContain('When the event happened.');
		expect(src).toContain('When this entry was added to the system.');
		expect(src).toMatch(/Entered by/);
		expect(src).not.toMatch(/Recorded by/);
	});

	it('preserves P83-04 expand/collapse affordance', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/timeline-entry-body-toggle/);
		expect(src).toContain("'Show more'");
		expect(src).toContain("'Show less'");
		expect(src).toMatch(/line-clamp-4/);
	});

	it('preserves P83-05 metadata line and ordering cues', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/timeline-entry-metadata-line/);
		expect(src).toMatch(/hasMetadataLocation && hasMetadataCreator/);
		expect(src).toContain('·');
	});

	it('does not reference Ask or cross-case timeline APIs in this component', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/askCase|askCross|cross-case/i);
	});
});
