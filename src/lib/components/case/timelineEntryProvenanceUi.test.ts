/**
 * P40-02 — Static checks for timeline provenance UI surfaces.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('P40-02 timeline provenance UI', () => {
	it('TimelineEntryProvenanceBlock + Body expose operator test ids and distinguish chat vs file copy', () => {
		const block = readFileSync(join(here, 'TimelineEntryProvenanceBlock.svelte'), 'utf8');
		const body = readFileSync(join(here, 'TimelineEntryProvenanceBody.svelte'), 'utf8');
		expect(block).toMatch(/data-testid="timeline-entry-provenance"/);
		expect(block).toMatch(/data-testid="timeline-entry-origin-badge"/);
		expect(body).toMatch(/data-testid="timeline-entry-provenance-source-file"/);
		expect(body).toMatch(/data-testid="timeline-entry-provenance-chat-context"/);
		expect(body).toMatch(/data-testid="timeline-entry-provenance-legacy-fallback"/);
		expect(body).toMatch(/data-testid="timeline-entry-provenance-payload-unreadable"/);
		expect(body).toMatch(/not from a document extract/);
		expect(body).not.toMatch(/normal chat/);
		expect(body).toContain('data-testid="timeline-entry-provenance-chronology"');
		expect(body).toMatch(/When confidence \(at commit\)/);
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
