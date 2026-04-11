/**
 * P82-06 — Overview (summary) route: Phase 82 section order, anchors, and sentence-case View links.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const summaryPagePath = join(__dirname, '../../routes/(app)/case/[id]/summary/+page.svelte');
const summaryCardsPath = join(__dirname, '../components/case/CaseOverviewSummaryCards.svelte');
const summaryPageSource = readFileSync(summaryPagePath, 'utf8');
const summaryCardsSource = readFileSync(summaryCardsPath, 'utf8');

describe('case Overview Phase 82 composition (P82-06)', () => {
	it('mounts summary → recent activity → linked panels in template order', () => {
		const iSummary = summaryPageSource.indexOf('<CaseOverviewSummaryCards');
		const iRecent = summaryPageSource.indexOf('<CaseOverviewRecentActivity');
		const iLinked = summaryPageSource.indexOf('<CaseOverviewLinkedPanels');
		expect(iSummary).toBeGreaterThan(-1);
		expect(iRecent).toBeGreaterThan(-1);
		expect(iLinked).toBeGreaterThan(-1);
		expect(iSummary).toBeLessThan(iRecent);
		expect(iRecent).toBeLessThan(iLinked);
	});

	it('exposes stable section ids for in-page anchors', () => {
		expect(summaryPageSource).toContain('href="#summary-module-case-summary"');
		expect(summaryPageSource).toContain('href="#summary-module-recent-activity"');
		expect(summaryPageSource).toContain('href="#summary-module-linked-panels"');
		expect(summaryPageSource).toContain('href="#summary-module-timeline-summary"');
		expect(summaryPageSource).toContain('href="#summary-module-case-brief"');
	});

	it('uses sentence-case View links on summary metric cards', () => {
		expect(summaryCardsSource).toContain('>View timeline</a');
		expect(summaryCardsSource).toContain('>View files</a');
		expect(summaryCardsSource).toContain('>View notes</a');
		expect(summaryCardsSource).toContain('>View entities</a');
		expect(summaryCardsSource).toContain('>View proposals</a');
	});

	it('uses DS status surface for card-level load errors (consistent with Summary tab)', () => {
		expect(summaryCardsSource).toContain('DS_STATUS_SURFACE_CLASSES.error');
		expect(summaryCardsSource).toContain('ds-status-copy');
	});
});
