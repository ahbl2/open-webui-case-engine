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
		expect(slice).toMatch(/Workflow proposal queue[\s\S]*?border-b border-gray-200\/55/);
		expect(slice).toMatch(/embedded \? 'mb-1\.5' : 'mb-2\.5'/);
	});

	it('adds a larger vertical gutter for collapsed guidance (embedded + full)', () => {
		expect(tabSource).toMatch(
			/guidanceExpanded[\s\S]*?: embedded\s*\?\s*'mt-7 pt-4 border-0 border-t border-dashed/
		);
		expect(tabSource).toMatch(/:\s*'mt-9 pt-5 border-0 border-t border-dashed border-gray-300\/65/);
	});

	it('softens collapsed guidance headline/copy so it reads as footer utility, not queue chrome', () => {
		expect(tabSource).toContain("font-medium uppercase tracking-wider text-gray-400/75 dark:text-gray-500/70");
		expect(tabSource).toContain('text-gray-400/70 dark:text-gray-500/65');
	});

	it('preserves structural order: panel before guidance (P59-13 baseline)', () => {
		expect(tabSource.indexOf('data-testid="workflow-proposals-panel"')).toBeLessThan(
			tabSource.indexOf('data-testid="workflow-guidance-placeholder"')
		);
	});
});
