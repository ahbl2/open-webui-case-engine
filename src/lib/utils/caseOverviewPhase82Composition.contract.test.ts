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
	it('mounts KPI summary → recent activity → timeline snapshot → case summary → assets band in template order', () => {
		const iSummary = summaryPageSource.indexOf('<CaseOverviewSummaryCards');
		const iRecent = summaryPageSource.indexOf('<CaseOverviewRecentActivity');
		const iSnap = summaryPageSource.indexOf('<CaseOverviewTimelineSnap');
		const iCaseSummary = summaryPageSource.indexOf('id="summary-module-case-summary"');
		const iAssets = summaryPageSource.indexOf('<CaseOverviewAssets');
		expect(iSummary).toBeGreaterThan(-1);
		expect(iRecent).toBeGreaterThan(-1);
		expect(iSnap).toBeGreaterThan(-1);
		expect(iCaseSummary).toBeGreaterThan(-1);
		expect(iAssets).toBeGreaterThan(-1);
		expect(iSummary).toBeLessThan(iRecent);
		expect(iRecent).toBeLessThan(iSnap);
		expect(iSnap).toBeLessThan(iCaseSummary);
		expect(iCaseSummary).toBeLessThan(iAssets);
	});

	it('exposes stable section ids for the case summary block (column section ids live on child components)', () => {
		expect(summaryPageSource).toContain('id="summary-module-case-summary"');
		expect(summaryPageSource).toContain('<CaseOverviewRecentActivity');
		expect(summaryPageSource).toContain('<CaseOverviewTimelineSnap');
		expect(summaryPageSource).toContain('slot="afterColumns"');
		expect(summaryPageSource).toContain('<CaseOverviewAssets');
	});

	it('uses seven KPI tiles with metric hooks (counts link out via workspace routes, not inline View links)', () => {
		expect(summaryCardsSource).toContain('data-testid="case-overview-summary-cards-grid"');
		expect(summaryCardsSource).toContain('data-metric="timeline-total"');
		expect(summaryCardsSource).toContain('data-metric="warrants-total"');
		expect(summaryCardsSource).toContain('xl:grid-cols-7');
	});

	it('uses DS status surface for card-level load errors (consistent with Summary tab)', () => {
		expect(summaryCardsSource).toContain('DS_STATUS_SURFACE_CLASSES.error');
		expect(summaryCardsSource).toContain('ds-status-copy');
	});
});
