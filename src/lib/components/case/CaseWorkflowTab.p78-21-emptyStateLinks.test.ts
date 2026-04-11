/**
 * P78-21 — Workflow item list empty state: same-case actionable links (Proposals, Timeline, Notes).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P78-21 workflow items empty state links', () => {
	it('adds next-step links only in the workflow item list empty branch', () => {
		const emptyBranch = tabSource.indexOf("workflowListViewState === 'empty'");
		expect(emptyBranch).toBeGreaterThan(-1);
		const afterEmpty = tabSource.slice(emptyBranch, emptyBranch + 4500);
		expect(afterEmpty).toContain('data-testid="workflow-items-empty-next-steps"');
		expect(afterEmpty).toContain('data-testid="workflow-items-empty-link-proposals"');
		expect(afterEmpty).toContain('data-testid="workflow-items-empty-link-timeline"');
		expect(afterEmpty).toContain('data-testid="workflow-items-empty-link-notes"');
		expect(afterEmpty).toContain('href="/case/{caseId}/proposals"');
		expect(afterEmpty).toContain('href="/case/{caseId}/timeline"');
		expect(afterEmpty).toContain('href="/case/{caseId}/notes"');
	});

	it('uses P78-16 labels and distinguishes case Proposals from the workflow proposal queue', () => {
		expect(tabSource).toContain('{CASE_DESTINATION_LABELS.caseProposals}');
		expect(tabSource).toContain('{CASE_DESTINATION_LABELS.timeline}');
		expect(tabSource).toContain('{CASE_DESTINATION_LABELS.notes}');
		expect(tabSource).toContain(
			'`${CASE_DESTINATION_TITLES.caseProposals} — separate from the Workflow proposal queue on this tab`'
		);
	});

	it('does not add empty-state next-step test ids to the non-empty workflow items table', () => {
		const tableScroll = tabSource.indexOf('data-testid="workflow-items-table-scroll"');
		expect(tableScroll).toBeGreaterThan(-1);
		const segment = tabSource.slice(tableScroll, tableScroll + 800);
		expect(segment).not.toContain('workflow-items-empty-link-proposals');
	});
});
