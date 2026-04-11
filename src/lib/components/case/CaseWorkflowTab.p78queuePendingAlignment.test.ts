/**
 * P78-06 — Workflow proposal queue: pending triage matches attention count; history is secondary.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P78-06 queue pending alignment', () => {
	it('derives pending count from the same proposal list payload as the visible queue', () => {
		expect(tabSource).toContain('$: pendingProposals = proposals.filter');
		expect(tabSource).toContain('$: proposalCount = pendingProposals.length');
		expect(tabSource).not.toContain('loadProposalCount');
	});

	it('renders pending rows in the primary list and tucks resolved rows under secondary history', () => {
		expect(tabSource).toContain('{#each pendingProposals as p (p.id)}');
		expect(tabSource).toContain('data-testid="workflow-proposals-history"');
		expect(tabSource).toContain('workflow-proposals-empty-pending');
		expect(tabSource).toContain('{@render workflowProposalRow(p)}');
	});
});
