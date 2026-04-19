/**
 * P82-04 / P129 — Recent Activity on Overview: P129 activity-events list; bounded count; no mock rows.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentPath = join(__dirname, 'CaseOverviewRecentActivity.svelte');
const summaryPagePath = join(__dirname, '../../../routes/(app)/case/[id]/summary/+page.svelte');
const componentSource = readFileSync(componentPath, 'utf8');
const summaryPageSource = readFileSync(summaryPagePath, 'utf8');

describe('CaseOverviewRecentActivity (P82-04)', () => {
	it('is mounted on the Overview (summary) route below summary cards', () => {
		expect(summaryPageSource).toContain('CaseOverviewRecentActivity');
		expect(summaryPageSource.indexOf('CaseOverviewSummaryCards')).toBeLessThan(
			summaryPageSource.indexOf('CaseOverviewRecentActivity')
		);
	});

	it('uses listCaseActivityEvents only (same audit stream as Activity tab)', () => {
		expect(componentSource).toContain('listCaseActivityEvents');
		expect(componentSource).toContain('caseP129ActivityEventsApi');
		expect(componentSource).not.toContain('listCaseTimelineEntriesPage');
		expect(componentSource).not.toContain('listCaseFiles');
		expect(componentSource).not.toContain('listProposals');
	});

	it('uses paged activity API (limit + offset) with overview Load more', () => {
		expect(componentSource).toContain('entryLimit = 20');
		expect(componentSource).toMatch(/limit:\s*entryLimit/);
		expect(componentSource).toContain('P129_ACTIVITY_LIST_LOAD_MORE');
		expect(componentSource).toContain('data-testid="case-overview-recent-activity-load-more"');
	});

	it('exposes stable test ids and View all activity route', () => {
		expect(componentSource).toContain("testId = 'case-overview-recent-activity'");
		expect(componentSource).toContain('data-testid={testId}');
		expect(componentSource).toContain('data-testid="case-overview-recent-activity-view-all"');
		expect(componentSource).toContain('href="/case/{caseId}/activity"');
		expect(componentSource).toContain('View all activity →');
		expect(componentSource).toContain("sectionId = 'summary-module-recent-activity'");
	});

	it('uses Activity tab card styling (ds-case-activity-feed-card)', () => {
		expect(componentSource).toContain('ds-case-activity-feed-card');
		expect(componentSource).toContain('CaseActivityDomainIcon');
	});

	it('uses default anchor id summary-module-recent-activity (no in-page nav on trimmed overview)', () => {
		expect(componentSource).toContain("sectionId = 'summary-module-recent-activity'");
	});
});
