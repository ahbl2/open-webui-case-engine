/**
 * P59-12 — Proposal queue vs Guidance footer visual separation (source contracts).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-12 proposal queue / guidance separation', () => {
	it('orders list (in main), proposal panel, then guidance; panel is not inside main markup block (P59-13)', () => {
		const mainOpen = tabSource.indexOf('data-testid="workflow-main-work-area"');
		const panel = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		const list = tabSource.indexOf('data-testid="workflow-items-list-section"');
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		expect(list).toBeLessThan(panel);
		expect(panel).toBeLessThan(guid);
		const mainOnly = tabSource.slice(mainOpen, panel);
		expect(mainOnly).toContain('data-testid="workflow-items-list-section"');
		expect(mainOnly).not.toContain('data-testid="workflow-proposals-panel"');
	});

	it('renders the proposal queue as a self-contained rounded panel (P59-14: light elevation)', () => {
		expect(tabSource).toMatch(
			/data-testid="workflow-proposals-panel"[\s\S]*?DS_WORKFLOW_CLASSES\.proposalsPanel/
		);
	});

	it('uses a footer-like dashed top rule and transparent background when guidance is collapsed', () => {
		expect(tabSource).toMatch(/data-workflow-guidance-footer=\{guidanceExpanded \? undefined : 'true'\}/);
		expect(tabSource).toMatch(
			/data-testid="workflow-guidance-placeholder"[\s\S]*?guidanceExpanded[\s\S]*?guidanceZoneCollapsed/
		);
	});

	it('keeps expanded guidance as a bordered card with tighter top spacing below the proposal panel (P59-16)', () => {
		expect(tabSource).toMatch(/guidanceExpanded\s*\?[\s\S]*?guidanceZoneOpenEmbed/);
		expect(tabSource).toMatch(/guidanceZoneOpenFull/);
	});

	it('preserves embedded vs full spacing hooks on both regions (P59-16: slightly tighter panel pb)', () => {
		expect(tabSource).toMatch(/workflow-proposals-panel[\s\S]*?embedded\s*\? 'mt-3 p-2\.5 pb-2\.5'/);
		expect(tabSource).toMatch(/workflow-proposals-panel[\s\S]*?: 'mt-5 p-4 pb-4'/);
		expect(tabSource).toMatch(/workflow-guidance-placeholder[\s\S]*?guidanceExpanded[\s\S]*?embedded\s*\?/);
	});
});
