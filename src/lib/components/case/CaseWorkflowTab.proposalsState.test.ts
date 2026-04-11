/**
 * P57-02 — Workflow proposal panel loading / empty parity (shared case-state components).
 * Source contract tests — no Svelte mount (matches repo patterns).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab proposal panel state presentation (P57-02)', () => {
	it('uses CaseLoadingState for proposal loading instead of plain Loading text', () => {
		expect(tabSource).toContain('<CaseLoadingState label="Loading workflow proposal queue…" testId="workflow-proposals-loading" />');
		expect(tabSource).not.toMatch(/Loading proposals\.\.\./);
	});

	it('uses CaseEmptyState for empty proposals with scoped test id', () => {
		expect(tabSource).toContain('testId="workflow-proposals-empty"');
		expect(tabSource).toContain('<CaseEmptyState');
		expect(tabSource).toContain('title="Nothing in the workflow proposal queue yet."');
		expect(tabSource).toContain(
			'When intake suggests a new or changed workflow item, it appears in this queue on the Workflow tab. Governed timeline or note drafts for review and commit belong on the case Proposals tab—not here.'
		);
	});

	it('keeps proposal list render path after loading/error/empty branches', () => {
		expect(tabSource).toContain('{#each pendingProposals as p (p.id)}');
		expect(tabSource).toContain('{:else if proposalError}');
		expect(tabSource).toContain('<CaseErrorState message={proposalError} onRetry={loadProposals} />');
	});
});
