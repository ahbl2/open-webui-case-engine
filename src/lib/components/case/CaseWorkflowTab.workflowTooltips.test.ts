/**
 * P57-10 — Minimal high-value Workflow tab tooltips (native title; presentation-only).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab workflow tooltips (P57-10)', () => {
	it('disambiguates workflow queue vs case Proposals tab on the proposal panel (P59-11)', () => {
		expect(tabSource).toMatch(
			/data-testid="workflow-proposals-panel"[\s\S]*?aria-label="Workflow proposal queue — suggestions for workflow items, separate from case Proposals drafts"/
		);
	});

	it('adds column header tooltips for priority, origin, and citations', () => {
		expect(tabSource).toContain('title="Urgency 0–3; higher numbers mean higher priority."');
		expect(tabSource).toContain(
			'title="Investigator: you added this row on Workflow. Proposal: created when you accepted a workflow suggestion from the Workflow proposal queue below."'
		);
		expect(tabSource).toContain(
			'title="Count of evidence links recorded on this workflow item."'
		);
	});

	it('keeps core list controls and behavior wiring unchanged', () => {
		expect(tabSource).toContain('data-testid="workflow-filter-cluster"');
		expect(tabSource).toContain('filter = \'all\'');
		expect(tabSource).toContain('await listWorkflowItems(caseId, token,');
		expect(tabSource).toContain('await acceptWorkflowProposal(caseId, target.id, token)');
		expect(tabSource).toContain('<th class="text-left px-2 py-1.5">Type</th>');
		expect(tabSource).toContain('<th class="text-left px-2 py-1.5">Status</th>');
	});
});
