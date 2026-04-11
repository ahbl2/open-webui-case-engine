/**
 * P59-16 — Expanded Guidance reachability; compact empty queue; scroll-into-view on expand.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-16 expanded guidance reachability', () => {
	it('uses tighter vertical padding for the empty proposal queue shell', () => {
		const emptyIdx = tabSource.indexOf('proposals.length === 0');
		expect(emptyIdx).toBeGreaterThan(-1);
		const branch = tabSource.slice(emptyIdx, emptyIdx + 800);
		expect(branch).toMatch(/workflow-proposals-state-shell[\s\S]*?embedded\s*\?\s*'px-2 py-1\.5'/);
		expect(branch).toMatch(/:\s*'px-2\.5 py-2'/);
	});

	it('reduces expanded guidance top margin vs prior mt-4 (embedded + full)', () => {
		expect(tabSource).toMatch(/DS_WORKFLOW_CLASSES\.guidanceZoneOpenEmbed/);
		expect(tabSource).toMatch(/DS_WORKFLOW_CLASSES\.guidanceZoneOpenFull/);
	});

	it('adds scroll margin on the guidance anchor for scrollIntoView ergonomics', () => {
		expect(tabSource).toMatch(
			/data-testid="workflow-guidance-placeholder"[\s\S]*?class="scroll-mt-3 transition-colors shrink-0/
		);
	});

	it('scrolls the guidance section into view only when expanding (smooth, nearest)', () => {
		expect(tabSource).toContain("const guidTestId = 'workflow-guidance-placeholder'");
		expect(tabSource).toContain('document.querySelector(`[data-testid="${guidTestId}"]`)');
		expect(tabSource).toMatch(/if \(!guidanceExpanded\) return/);
		expect(tabSource).toContain("block: 'nearest', behavior: 'smooth'");
	});

	it('keeps guidance after the proposal panel in document order', () => {
		expect(tabSource.indexOf('data-testid="workflow-proposals-panel"')).toBeLessThan(
			tabSource.indexOf('data-testid="workflow-guidance-placeholder"')
		);
	});

	it('does not use absolute/fixed positioning on the guidance or proposals panel shells', () => {
		const panel = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		const createModal = tabSource.indexOf('<!-- Create modal -->');
		const mid = tabSource.slice(panel, createModal > panel ? createModal : panel + 3500);
		expect(mid).not.toMatch(/\babsolute\b|\bfixed\b/);
	});
});
