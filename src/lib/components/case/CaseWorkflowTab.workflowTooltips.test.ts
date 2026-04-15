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
			/data-testid="workflow-proposals-panel"[\s\S]*?aria-label=\{P127_WORKFLOW_PROPOSAL_QUEUE_ARIA\}/
		);
	});

	it('adds column header tooltips for rank, origin, and citations', () => {
		expect(tabSource).toContain('title={P127_WORKFLOW_LEGACY_RANK_TH_TITLE}');
		expect(tabSource).toContain('title={P127_WORKFLOW_LEGACY_ORIGIN_TH_TITLE}');
		expect(tabSource).toContain(
			'title="Count of evidence links recorded on this workflow item."'
		);
	});

	it('keeps core list controls and behavior wiring unchanged', () => {
		expect(tabSource).toContain('data-testid="workflow-filter-cluster"');
		expect(tabSource).toContain('filter = \'all\'');
		expect(tabSource).toContain('await listWorkflowItems(caseId, token,');
		expect(tabSource).toContain('await acceptWorkflowProposal(caseId, target.id, token)');
		expect(tabSource).toContain('DS_WORKFLOW_CLASSES.th');
		expect(tabSource).toMatch(/<th class="\{DS_WORKFLOW_CLASSES\.th\}">Type<\/th>/);
		expect(tabSource).toMatch(/<th class="\{DS_WORKFLOW_CLASSES\.th\}">Status<\/th>/);
	});
});
