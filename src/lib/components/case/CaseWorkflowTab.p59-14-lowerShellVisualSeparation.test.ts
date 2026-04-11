/**
 * P59-14 — Lower Workflow shell visual separation (presentation contracts, no DOM moves).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-14 lower shell visual separation', () => {
	it('separates proposal queue intro from body with a bottom rule inside the panel', () => {
		const panelOpen = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		const guidOpen = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		const slice = tabSource.slice(panelOpen, guidOpen);
		expect(slice).toMatch(/Workflow proposal queue[\s\S]*?border-b border-\[var\(--ds-border-default\)\]/);
		expect(slice).toMatch(/embedded \? 'mb-1\.5' : 'mb-2\.5'/);
	});

	it('adds a larger vertical gutter for collapsed guidance (embedded + full)', () => {
		expect(tabSource).toMatch(/DS_WORKFLOW_CLASSES\.guidanceZoneCollapsedEmbed/);
		expect(tabSource).toMatch(/DS_WORKFLOW_CLASSES\.guidanceZoneCollapsedFull/);
	});

	it('softens collapsed guidance headline/copy so it reads as footer utility, not queue chrome', () => {
		expect(tabSource).toContain('DS_TYPE_CLASSES.label');
		expect(tabSource).toContain('DS_WORKFLOW_TEXT_CLASSES.guidanceIntroMuted');
		expect(tabSource).toMatch(/guidanceExpanded \? 'opacity-100' : 'opacity-80'/);
	});

	it('preserves structural order: panel before guidance (P59-13 baseline)', () => {
		expect(tabSource.indexOf('data-testid="workflow-proposals-panel"')).toBeLessThan(
			tabSource.indexOf('data-testid="workflow-guidance-placeholder"')
		);
	});
});
