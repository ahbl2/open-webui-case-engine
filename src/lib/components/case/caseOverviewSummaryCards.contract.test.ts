/**
 * P82-03 — Overview summary cards: real Case Engine reads only; seven KPI tiles.
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

	it('exposes stable test ids for the summary card region and metric hooks', () => {
		expect(componentSource).toContain('data-testid="case-overview-summary-cards"');
		expect(componentSource).toContain('data-testid="case-overview-summary-cards-grid"');
		expect(componentSource).toContain('data-metric="timeline-total"');
		expect(componentSource).toContain('data-metric="notes-total"');
		expect(componentSource).toContain('data-metric="files-total"');
		expect(componentSource).toContain('data-metric="entities-total"');
		expect(componentSource).toContain('data-metric="workflow-total"');
		expect(componentSource).toContain('data-metric="proposals-pending"');
		expect(componentSource).toContain('data-metric="warrants-total"');
	});

	it('uses existing list endpoints for counts (no mock totals)', () => {
		expect(componentSource).toContain('listCaseTimelineEntriesPage');
		expect(componentSource).toContain('listCaseNotebookNotes');
		expect(componentSource).toContain('listCaseFilesPage');
		expect(componentSource).toContain('listProposalsPaginated');
		expect(componentSource).toContain('listCaseIntelligenceCommittedEntities');
		expect(componentSource).toContain('listCaseWorkflowItems');
		expect(componentSource).toContain('listWarrantDrafts');
		expect(componentSource).toContain('Promise.allSettled');
	});

	it('reuses home OCC KPI tile classes for colored rectangles (ds-occ-kpi-card + case overview tile)', () => {
		expect(componentSource).toContain('ds-occ-kpi-card');
		expect(componentSource).toContain('ds-case-overview-kpi-tile');
		expect(componentSource).toContain('ds-occ-kpi-card--blue');
		expect(componentSource).toContain('ds-occ-kpi-card--cyan');
	});
});
