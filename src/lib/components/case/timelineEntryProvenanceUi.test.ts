/**
 * P40-02 — Static checks for timeline provenance UI surfaces.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('P40-02 timeline provenance UI', () => {
	it('TimelineEntryProvenanceBlock exposes operator test ids and distinguishes chat vs file copy', () => {
		const src = readFileSync(join(here, 'TimelineEntryProvenanceBlock.svelte'), 'utf8');
		expect(src).toMatch(/data-testid="timeline-entry-provenance"/);
		expect(src).toMatch(/data-testid="timeline-entry-origin-badge"/);
		expect(src).toMatch(/data-testid="timeline-entry-provenance-source-file"/);
		expect(src).toMatch(/data-testid="timeline-entry-provenance-chat-context"/);
		expect(src).toMatch(/data-testid="timeline-entry-provenance-legacy-fallback"/);
		expect(src).toMatch(/data-testid="timeline-entry-provenance-payload-unreadable"/);
		expect(src).toMatch(/not from a document extract/);
		expect(src).not.toMatch(/normal chat/);
	});

	it('TimelineEntryCard shows provenance only when not manual', () => {
		const src = readFileSync(join(here, 'TimelineEntryCard.svelte'), 'utf8');
		expect(src).toMatch(/showProvenanceBlock/);
		expect(src).toMatch(/origin_kind !== 'manual'/);
		expect(src).toMatch(/TimelineEntryProvenanceBlock/);
	});

	it('CaseIntegrityTab uses lineage column and supplemental hint', () => {
		const src = readFileSync(join(here, 'CaseIntegrityTab.svelte'), 'utf8');
		expect(src).toMatch(/data-testid="case-audit-timeline-provenance-hint"/);
		expect(src).toMatch(/data-testid="case-audit-lineage-cell"/);
		expect(src).toMatch(/auditTimelineLineageSummary/);
	});
});
