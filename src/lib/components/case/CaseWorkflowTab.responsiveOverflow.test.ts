/**
 * P57-06 — Workflow table / proposal list responsive overflow (presentation only).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab responsive overflow (P57-06)', () => {
	it('wraps workflow items table in horizontal + vertical scroll container', () => {
		expect(tabSource).toContain('data-testid="workflow-items-table-scroll"');
		expect(tabSource).toContain('DS_WORKFLOW_CLASSES.tableScroll');
		expect(tabSource).toContain('DS_WORKFLOW_CLASSES.table');
	});

	it('uses min-w-0 + shrink-0 on list section so the table cannot be overlapped by the next flex sibling', () => {
		expect(tabSource).toContain('DS_WORKFLOW_CLASSES.workspace');
		expect(tabSource).toContain(
			'data-testid="workflow-items-list-section" class="min-w-0 flex flex-col shrink-0"'
		);
	});

	it('uses proposal list scroll container with min-w-0 and proposal row wrapping', () => {
		expect(tabSource).toContain('data-testid="workflow-proposals-list-scroll"');
		expect(tabSource).toContain('data-testid="workflow-proposals-panel"');
		expect(tabSource).toContain('flex flex-wrap items-center gap-x-2 gap-y-1 justify-between min-w-0');
		expect(tabSource).toContain('{proposalTypeLabel(p)}');
	});

	it('preserves table body and proposal iteration', () => {
		expect(tabSource).toContain('{#each items as item (item.id)}');
		expect(tabSource).toContain('{#each pendingProposals as p (p.id)}');
		expect(tabSource).toContain('on:click={() => openEdit(item)}');
		expect(tabSource).toContain('on:click={() => openAccept(p)}');
	});
});
