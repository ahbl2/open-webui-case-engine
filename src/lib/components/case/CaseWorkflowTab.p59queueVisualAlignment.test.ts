/**
 * P59-06 / P59-11 — Workflow proposal queue presentation (source contract).
 * P59-11: top banner removed; panel is the single in-tab queue surface.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-06 / P59-11 proposal queue presentation', () => {
	it('keeps queue semantics and P59-01 narrative strings intact', () => {
		expect(tabSource).toContain('Workflow proposal queue');
		expect(tabSource).toContain(
			'aria-label="Workflow proposal queue — suggestions for workflow items, separate from case Proposals drafts"'
		);
		expect(tabSource).toContain('this queue is not the case Proposals tab');
	});

	it('does not render the redundant top queue banner (P59-11)', () => {
		expect(tabSource).not.toContain('data-testid="workflow-proposals-banner"');
		expect(tabSource).not.toContain('workflow-proposals-banner-empty');
		expect(tabSource).not.toContain('workflow-proposals-pending-badge');
	});

	it('keeps the proposal panel after the items list (sibling section after main; P59-13)', () => {
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		const list = tabSource.indexOf('data-testid="workflow-items-list-section"');
		const toolbar = tabSource.indexOf('data-testid="workflow-items-toolbar"');
		const panel = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		expect(main).toBeLessThan(toolbar);
		expect(toolbar).toBeLessThan(list);
		expect(list).toBeLessThan(panel);
	});

	it('loads proposals with items and counts (no toggle gate)', () => {
		expect(tabSource).toMatch(
			/\$: if \(caseId && token\) \{[\s\S]*?loadItems\(\);[\s\S]*?loadProposalCount\(\);[\s\S]*?loadProposals\(\);/
		);
		expect(tabSource).not.toContain('toggleProposals');
	});

	it('gives the panel clearer border separation from the items list', () => {
		expect(tabSource).toMatch(/workflow-proposals-panel[\s\S]*?border-t border-gray-200/);
	});
});
