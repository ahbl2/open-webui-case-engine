/**
 * P95-02 — Timeline entry metadata labeling & hierarchy (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard P95-02 metadata readability (source contract)', () => {
	it('keeps occurred_at visually primary with explicit label and stable test id', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/data-testid="timeline-entry-occurred-at"/);
		expect(src).toMatch(/ds-timeline-entry-metadata-primary/);
		expect(src).toMatch(/>Occurred</);
	});

	it('surfaces recorded (created_at) and authorship with stable test ids', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/data-testid="timeline-entry-recorded-at"/);
		expect(src).toMatch(/data-testid="timeline-entry-entered-by"/);
		expect(src).toMatch(/Recorded\b/);
		expect(src).toMatch(/Entered by/);
	});

	it('labels type, tags, and location explicitly without workflow/task wording', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('TIMELINE_META_LABEL_TYPE');
		expect(src).toContain('TIMELINE_META_LABEL_TAGS');
		expect(src).toContain('TIMELINE_META_LABEL_LOCATION');
		expect(src).not.toMatch(/\bworkflow\b|\bowner\b|\bdue date\b|\bstatus\b.*task/i);
	});

	it('groups secondary metadata (tags + location/author) under a shared block', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/data-testid="timeline-entry-metadata-secondary"/);
		expect(src).toMatch(/data-testid="timeline-entry-tags-block"/);
		expect(src).toMatch(/data-testid="timeline-entry-location"/);
		expect(src).toMatch(/ds-timeline-entry-metadata-secondary/);
	});

	it('does not prefix location with plain “at" (explicit Location label instead)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/\bat\s+\{#each splitTextForSearchHighlight\(metadataLocationRaw/);
	});

	it('preserves Phase 83 metadata line contract (separator + conditional)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/timeline-entry-metadata-line/);
		expect(src).toMatch(/hasMetadataLocation && hasMetadataCreator/);
		expect(src).toContain('·');
	});
});
