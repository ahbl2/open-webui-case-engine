/**
 * P59-11 — Remove redundant top workflow proposal queue strip (source contracts).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-11 top queue strip removal', () => {
	it('omits the top workflow proposal queue banner entirely', () => {
		expect(tabSource).not.toContain('data-testid="workflow-proposals-banner"');
		expect(tabSource).not.toContain('workflow-proposals-review-cta');
		expect(tabSource).not.toContain('toggleProposals');
	});

	it('orders toolbar + list inside main; proposal panel after main closes; guidance after panel (P59-13)', () => {
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		const toolbar = tabSource.indexOf('data-testid="workflow-items-toolbar"');
		const list = tabSource.indexOf('data-testid="workflow-items-list-section"');
		const panel = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		expect(main).toBeLessThan(toolbar);
		expect(toolbar).toBeLessThan(list);
		expect(list).toBeLessThan(panel);
		expect(panel).toBeLessThan(guid);
		const mainOnly = tabSource.slice(main, panel);
		expect(mainOnly).toContain('data-testid="workflow-items-list-section"');
		expect(mainOnly).not.toContain('data-testid="workflow-proposals-panel"');
	});

	it('retains proposal panel loading, empty, error, and list shells', () => {
		expect(tabSource).toContain("proposalsLoading");
		expect(tabSource).toContain('data-testid="workflow-proposals-state-shell"');
		expect(tabSource).toContain('testId="workflow-proposals-empty"');
		expect(tabSource).toContain('proposalError');
	});

	it('retains attention pending count for proposal discoverability', () => {
		expect(tabSource).toContain('data-testid="workflow-attention-pending-count"');
	});
});
