/**
 * P82-04 — Recent Activity on Overview: timeline-backed list only; bounded count; no mock rows.
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

	it('uses listCaseTimelineEntriesPage only (timeline-backed reads)', () => {
		expect(componentSource).toContain('listCaseTimelineEntriesPage');
		expect(componentSource).not.toContain('listCaseFiles');
		expect(componentSource).not.toContain('listProposals');
	});

	it('enforces a bounded recent window (no pagination UI)', () => {
		expect(componentSource).toContain('const RECENT_LIMIT = 10');
		expect(componentSource).toContain('Math.max(0, total - RECENT_LIMIT)');
	});

	it('exposes stable test ids and View timeline route', () => {
		expect(componentSource).toContain('data-testid="case-overview-recent-activity"');
		expect(componentSource).toContain('data-testid="case-overview-recent-activity-view-timeline"');
		expect(componentSource).toContain('href="/case/{caseId}/timeline"');
		expect(componentSource).toContain('id="summary-module-recent-activity"');
	});

	it('in-page nav links to the Recent activity section', () => {
		expect(summaryPageSource).toContain('href="#summary-module-recent-activity"');
		expect(summaryPageSource).toContain('Recent activity');
	});
});
