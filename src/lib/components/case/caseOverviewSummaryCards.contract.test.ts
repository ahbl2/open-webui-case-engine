/**
 * P82-03 — Overview summary cards: real Case Engine reads only; honest notebook scope labeling.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentPath = join(__dirname, 'CaseOverviewSummaryCards.svelte');
const summaryPagePath = join(__dirname, '../../../routes/(app)/case/[id]/summary/+page.svelte');
const componentSource = readFileSync(componentPath, 'utf8');
const summaryPageSource = readFileSync(summaryPagePath, 'utf8');

describe('CaseOverviewSummaryCards (P82-03)', () => {
	it('mounts from the case Overview (summary) route', () => {
		expect(summaryPageSource).toContain('CaseOverviewSummaryCards');
		expect(summaryPageSource).toContain('caseId={caseId}');
	});

	it('exposes stable test ids for the summary card region and links', () => {
		expect(componentSource).toContain('data-testid="case-overview-summary-cards"');
		expect(componentSource).toContain('data-testid="case-overview-summary-cards-grid"');
		expect(componentSource).toContain('data-testid="case-overview-summary-link-timeline"');
		expect(componentSource).toContain('data-testid="case-overview-summary-link-files"');
		expect(componentSource).toContain('data-testid="case-overview-summary-link-notes"');
		expect(componentSource).toContain('data-testid="case-overview-summary-link-entities"');
		expect(componentSource).toContain('data-testid="case-overview-summary-link-proposals"');
	});

	it('uses existing list endpoints for counts (no mock totals)', () => {
		expect(componentSource).toContain('listCaseTimelineEntriesPage');
		expect(componentSource).toContain('listCaseFilesPage');
		expect(componentSource).toContain('listCaseNotebookNotes');
		expect(componentSource).toContain('listProposalsPaginated');
		expect(componentSource).toContain('listCaseIntelligenceCommittedEntities');
		expect(componentSource).toContain('Promise.allSettled');
		expect(componentSource).toContain('activeCaseMeta');
	});

	it('labels notebook scope honestly (owner-scoped list, not a case-wide total)', () => {
		expect(componentSource).toContain('Your notebook notes');
		expect(componentSource).toContain('owner-scoped');
	});
});
