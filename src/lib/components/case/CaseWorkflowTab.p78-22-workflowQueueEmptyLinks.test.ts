/**
 * P78-22 — Workflow proposal queue empty states: same-case links (Proposals, Timeline, Notes).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P78-22 workflow proposal queue empty state links', () => {
	it('adds a primary create CTA when the workflow proposal list is completely empty (links live in other branches)', () => {
		const branch = tabSource.indexOf('{:else if proposals.length === 0}');
		expect(branch).toBeGreaterThan(-1);
		const nextElse = tabSource.indexOf('{:else}', branch + 1);
		expect(nextElse).toBeGreaterThan(-1);
		const slice = tabSource.slice(branch, nextElse);
		expect(slice).toContain('data-testid="workflow-queue-empty-next-steps"');
		expect(slice).toContain('data-testid="workflow-queue-empty-create"');
		expect(slice).toContain('Create workflow item');
		expect(slice).toContain('No workflow proposals yet');
		expect(slice).not.toContain('href="/case/{caseId}/proposals"');
	});

	it('adds next-step links when there are no pending queue items (pending-only empty branch)', () => {
		const pendingEmpty = tabSource.indexOf('testId="workflow-proposals-empty-pending"');
		expect(pendingEmpty).toBeGreaterThan(-1);
		const slice = tabSource.slice(pendingEmpty, pendingEmpty + 2800);
		expect(slice).toContain('data-testid="workflow-queue-pending-empty-next-steps"');
		expect(slice).toContain('data-testid="workflow-queue-pending-empty-link-proposals"');
		expect(slice).toContain('this workflow queue');
		expect(slice).toContain('Governed timeline and note drafts live on the case');
	});

	it('keeps workflow item list empty links distinct from queue pending next-step link test ids', () => {
		expect(tabSource).toContain('workflow-items-empty-link-proposals');
		expect(tabSource).toContain('workflow-queue-pending-empty-link-proposals');
		expect(tabSource).toContain('workflow-queue-empty-create');
	});

	it('preserves P78-08 governance wording on the Proposals link title', () => {
		expect(tabSource).toContain(
			'`${CASE_DESTINATION_TITLES.caseProposals} — separate from the Workflow proposal queue on this tab`'
		);
	});
});
