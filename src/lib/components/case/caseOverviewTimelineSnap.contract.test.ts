/**
 * Overview center column — five most recent timeline entries via paginated API.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentPath = join(__dirname, 'CaseOverviewTimelineSnap.svelte');
const summaryPagePath = join(__dirname, '../../../routes/(app)/case/[id]/summary/+page.svelte');
const componentSource = readFileSync(componentPath, 'utf8');
const summaryPageSource = readFileSync(summaryPagePath, 'utf8');

describe('CaseOverviewTimelineSnap', () => {
	it('is mounted on the Overview (summary) route in the center column', () => {
		expect(summaryPageSource).toContain('CaseOverviewTimelineSnap');
		expect(summaryPageSource.indexOf('CaseOverviewSummaryCards')).toBeLessThan(
			summaryPageSource.indexOf('CaseOverviewTimelineSnap')
		);
	});

	it('loads the latest entries (20) via listCaseTimelineEntriesPage (newest-first display)', () => {
		expect(componentSource).toContain('listCaseTimelineEntriesPage');
		expect(componentSource).toContain('SNAPSHOT_LIMIT = 20');
		expect(componentSource).toContain('sortNewestFirst');
	});

	it('exposes stable anchors, test ids, timeline deep links, and Load more', () => {
		expect(componentSource).toContain("sectionId = 'summary-module-timeline-snapshot'");
		expect(componentSource).toContain("testId = 'case-overview-timeline-snapshot'");
		expect(componentSource).toContain('data-testid="case-overview-timeline-snap-view-all"');
		expect(componentSource).toContain('data-testid="case-overview-timeline-snap-load-more"');
		expect(componentSource).toContain('P129_ACTIVITY_LIST_LOAD_MORE');
		expect(componentSource).toContain('`/case/${caseId}/timeline`');
		expect(componentSource).toContain('timeline?highlight=');
	});

	it('defaults the panel title to Timeline Snapshot', () => {
		expect(componentSource).toContain("heading = 'Timeline Snapshot'");
		expect(componentSource).toContain("sectionId = 'summary-module-timeline-snapshot'");
	});
});
