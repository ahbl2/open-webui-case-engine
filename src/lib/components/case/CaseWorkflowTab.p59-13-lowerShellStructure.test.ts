/**
 * P59-13 — Lower Workflow shell: proposal queue section vs Guidance footer (source contracts).
 * Structural DOM order: main (toolbar + list only) → proposals panel → guidance.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-13 lower shell structure', () => {
	it('keeps heading, explainer, and state shell markup inside the proposal queue section only', () => {
		const panelOpen = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		const guidOpen = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		expect(panelOpen).toBeGreaterThan(-1);
		expect(guidOpen).toBeGreaterThan(panelOpen);
		const queueOnly = tabSource.slice(panelOpen, guidOpen);
		expect(queueOnly).toMatch(/<h3[^>]*>Workflow proposal queue<\/h3>/);
		expect(queueOnly).toContain('this queue is not the case Proposals tab');
		expect(queueOnly).toContain('data-testid="workflow-proposals-state-shell"');
		expect(queueOnly).toContain('testId="workflow-proposals-empty"');
		expect(queueOnly).not.toContain('data-testid="workflow-guidance-placeholder"');
		expect(queueOnly).not.toContain('data-testid="workflow-main-work-area"');
	});

	it('places collapsed-guidance footer hook only on the guidance region (after the proposal panel)', () => {
		expect(tabSource.indexOf('data-workflow-guidance-footer=')).toBeGreaterThan(
			tabSource.indexOf('data-testid="workflow-proposals-panel"')
		);
		expect(tabSource).toMatch(
			/data-testid="workflow-guidance-placeholder"[\s\S]*?data-workflow-guidance-footer=\{guidanceExpanded \? undefined : 'true'\}/
		);
	});

	it('preserves guidance expand/collapse control in the guidance block (P59-16: toggle helper + scroll into view)', () => {
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		expect(guid).toBeGreaterThan(-1);
		const guidHead = tabSource.slice(guid, guid + 2500);
		expect(guidHead).toContain('data-testid="workflow-guidance-toggle"');
		expect(tabSource).toContain('async function toggleGuidanceExpanded()');
		expect(tabSource).toContain('void toggleGuidanceExpanded()');
		expect(tabSource).toContain("anchor.scrollIntoView({ block: 'nearest', behavior: 'smooth' })");
	});

	it('uses one layout tree for full and embedded (order unchanged by mode)', () => {
		expect(tabSource.match(/data-testid="workflow-proposals-panel"/g)?.length).toBe(1);
		expect(tabSource.match(/data-testid="workflow-guidance-placeholder"/g)?.length).toBe(1);
	});
});
