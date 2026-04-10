/**
 * P59-02 — Workflow attention shell layout (markup contract).
 * Source contract tests — no Svelte mount.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-02 workspace shell layout', () => {
	it('defines attention, main work area, and guidance placeholder regions', () => {
		expect(tabSource).toContain('data-testid="workflow-attention-region"');
		expect(tabSource).toContain('data-testid="workflow-attention-signals"');
		expect(tabSource).toContain('data-testid="workflow-main-work-area"');
		expect(tabSource).toContain('data-testid="workflow-guidance-placeholder"');
		expect(tabSource).toContain('data-testid="workflow-guidance-placeholder-copy"');
	});

	it('orders shell regions: attention, then main, then proposal panel, then guidance (P59-13)', () => {
		const att = tabSource.indexOf('data-testid="workflow-attention-region"');
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		const panel = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		expect(att).toBeGreaterThan(-1);
		expect(main).toBeGreaterThan(att);
		expect(panel).toBeGreaterThan(main);
		expect(guid).toBeGreaterThan(panel);
	});

	it('nests only toolbar + items list inside main; proposal queue is a sibling section after main closes (P59-13)', () => {
		const mainOpen = tabSource.indexOf('data-testid="workflow-main-work-area"');
		const panelOpen = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		expect(mainOpen).toBeGreaterThan(-1);
		expect(panelOpen).toBeGreaterThan(mainOpen);
		const mainOnly = tabSource.slice(mainOpen, panelOpen);
		expect(mainOnly).toContain('data-testid="workflow-items-toolbar"');
		expect(mainOnly).toContain('data-testid="workflow-items-list-section"');
		expect(mainOnly).not.toContain('data-testid="workflow-proposals-panel"');
	});

	it('applies embedded sizing hooks to attention and guidance shells', () => {
		expect(tabSource).toMatch(/workflow-attention-region[\s\S]*?embedded\s*\?/);
		expect(tabSource).toMatch(/workflow-guidance-placeholder[\s\S]*?embedded\s*\?/);
	});

	it('P59-15: main work area stacks in document flow (no flex-1) so proposals/guidance are not overlapped', () => {
		expect(tabSource).not.toMatch(
			/data-testid="workflow-main-work-area"[\s\S]*?embedded \? 'flex-1/
		);
		expect(tabSource).toMatch(
			/data-testid="workflow-main-work-area"[\s\S]*?embedded \? 'gap-2\.5' : 'gap-5'/
		);
		expect(tabSource).toMatch(/data-testid="workflow-main-work-area"[\s\S]*?shrink-0/);
		expect(tabSource).toMatch(/data-testid="workflow-main-work-area"[\s\S]*?min-w-0/);
	});
});
