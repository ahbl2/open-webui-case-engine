/**
 * P57-05 / P59-11 — Workflow proposal discoverability (presentation + attention).
 * P59-11: pending emphasis lives in Attention + proposal panel (no top banner).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab pending proposals discoverability (P57-05 / P59-11)', () => {
	it('surfaces pending count in Attention (not a duplicate top banner)', () => {
		expect(tabSource).toContain('data-testid="workflow-attention-pending-count"');
		expect(tabSource).toContain('{proposalCount}');
		expect(tabSource).toContain('data-testid="workflow-attention-pending-chip"');
		expect(tabSource).not.toContain('data-testid="workflow-proposals-banner"');
	});

	it('keeps the workflow proposal panel as the in-tab queue surface with doctrine copy', () => {
		expect(tabSource).toContain('data-testid="workflow-proposals-panel"');
		expect(tabSource).toContain('Workflow proposal queue');
		expect(tabSource).toContain('this queue is not the case Proposals tab');
	});

	it('keeps accept/reject wiring on proposal rows', () => {
		expect(tabSource).toContain('on:click={() => openAccept(p)}');
		expect(tabSource).toContain('on:click={() => openReject(p)}');
		expect(tabSource).toContain('await acceptWorkflowProposal(caseId, target.id, token)');
	});
});
