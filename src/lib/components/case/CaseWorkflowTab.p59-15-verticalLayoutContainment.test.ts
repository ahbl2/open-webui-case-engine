/**
 * P59-15 — Workflow shell vertical layout containment (document flow, no section overlap).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-15 vertical layout containment', () => {
	const shellIds = [
		'data-testid="workflow-narrative-intro"',
		'data-testid="workflow-attention-region"',
		'data-testid="workflow-main-work-area"',
		'data-testid="workflow-proposals-panel"',
		'data-testid="workflow-guidance-placeholder"'
	] as const;

	it('orders major lower shell blocks: attention → main → proposals → guidance', () => {
		const intro = tabSource.indexOf(shellIds[0]);
		const att = tabSource.indexOf(shellIds[1]);
		const main = tabSource.indexOf(shellIds[2]);
		const panel = tabSource.indexOf(shellIds[3]);
		const guid = tabSource.indexOf(shellIds[4]);
		expect(intro).toBeLessThan(att);
		expect(att).toBeLessThan(main);
		expect(main).toBeLessThan(panel);
		expect(panel).toBeLessThan(guid);
	});

	it('keeps proposal queue outside main in source (sibling sections)', () => {
		const mainOpen = tabSource.indexOf('data-testid="workflow-main-work-area"');
		const panelOpen = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		const mainOnly = tabSource.slice(mainOpen, panelOpen);
		expect(mainOnly).not.toContain('data-testid="workflow-proposals-panel"');
	});

	it('does not use flex-1 on main (prevents height steal + overflow paint over lower sections)', () => {
		expect(tabSource).not.toMatch(/workflow-main-work-area[\s\S]{0,400}flex-1/);
	});

	it('marks shell sections shrink-0 so flex parents do not compress stacked regions', () => {
		expect(tabSource).toMatch(/workflow-page-header" class=\{embedded \? '[^']*shrink-0/);
		expect(tabSource).toMatch(/workflow-attention-region"[\s\S]*?shrink-0/);
		expect(tabSource).toMatch(/workflow-main-work-area"[\s\S]*?shrink-0/);
		expect(tabSource).toMatch(/workflow-guidance-placeholder"[\s\S]*?shrink-0/);
	});

	it('embedded root participates in flex min-height chain without overlay positioning on shell', () => {
		expect(tabSource).toMatch(
			/data-workflow-layout=\{embedded \? 'embedded' : 'full'\}[\s\S]*?DS_WORKFLOW_CLASSES\.workspaceEmbedded/
		);
		const low = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		const tail = tabSource.slice(low, low + 2000);
		expect(tail).not.toMatch(/absolute|fixed/);
	});
});
