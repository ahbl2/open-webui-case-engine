/**
 * P57-03 — Workflow page/section hierarchy and filter grouping (markup contract).
 * Source contract tests — no Svelte mount.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab hierarchy and filter grouping (P57-03)', () => {
	it('defines page header and major section test ids for scan structure', () => {
		expect(tabSource).toContain('data-testid="workflow-page-header"');
		expect(tabSource).toContain('data-testid="workflow-items-toolbar"');
		expect(tabSource).toContain('data-testid="workflow-filter-cluster"');
		expect(tabSource).toContain('data-testid="workflow-items-list-section"');
		expect(tabSource).toContain('data-testid="workflow-proposals-panel"');
	});

	it('groups filter controls inside workflow-filter-cluster with unchanged filter actions', () => {
		expect(tabSource).toContain('data-testid="workflow-filter-cluster"');
		expect(tabSource).toMatch(/filter === 'all'[\s\S]*?All/);
		expect(tabSource).toMatch(/filter === 'HYPOTHESIS'[\s\S]*?Hypotheses/);
		expect(tabSource).toMatch(/filter === 'GAP'[\s\S]*?Gaps/);
		expect(tabSource).toContain('bind:checked={includeDeleted}');
		expect(tabSource).toContain('Create workflow item');
		expect(tabSource).toContain('on:click={openCreate}');
	});

	it('does not remove list or proposal render paths', () => {
		expect(tabSource).toContain('workflowListViewState === \'loading\'');
		expect(tabSource).toContain('workflowListViewState === \'empty\'');
		expect(tabSource).toContain('{#each items as item (item.id)}');
		expect(tabSource).toContain('{#each pendingProposals as p (p.id)}');
		expect(tabSource).toContain('async function loadProposals()');
	});
});
