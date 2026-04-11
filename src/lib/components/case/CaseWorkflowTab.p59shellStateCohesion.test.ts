/**
 * P59-07 — Workflow shell loading / empty / error presentation cohesion (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');
const emptyStateSource = readFileSync(join(__dirname, 'CaseEmptyState.svelte'), 'utf8');

describe('CaseWorkflowTab P59-07 shell state cohesion', () => {
	it('frames workflow list loading, error, and empty in a shared shell inside the list section', () => {
		const listSec = tabSource.indexOf('data-testid="workflow-items-list-section"');
		const loadBr = tabSource.indexOf("workflowListViewState === 'loading'");
		expect(listSec).toBeGreaterThan(-1);
		expect(loadBr).toBeGreaterThan(listSec);
		expect(tabSource).toContain('data-testid="workflow-items-list-state-shell"');
		expect(tabSource.indexOf('data-testid="workflow-items-list-state-shell"', loadBr)).toBeGreaterThan(loadBr);
		expect(tabSource).toContain("workflowListViewState === 'error'");
		expect(tabSource).toContain("workflowListViewState === 'empty'");
		expect(tabSource).toContain('testId="workflow-items-list-loading"');
		expect(tabSource).toContain('framed={false}');
	});

	it('wraps proposals panel loading, error, and empty in a cohesive state shell', () => {
		const panel = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		expect(panel).toBeGreaterThan(-1);
		expect(tabSource).toContain('data-testid="workflow-proposals-state-shell"');
		const shellAfterPanel = tabSource.indexOf('data-testid="workflow-proposals-state-shell"', panel);
		expect(shellAfterPanel).toBeGreaterThan(panel);
		// Snippet for proposal rows precedes loading branch — need a wider slice than P59-07 originally assumed.
		expect(tabSource.slice(panel, panel + 20000)).toMatch(/proposalsLoading[\s\S]*?workflow-proposals-state-shell/);
	});

	it('uses chip-style attention cues for list load failure and loading (not floating text)', () => {
		expect(tabSource).toMatch(/workflow-attention-list-error[\s\S]*?DS_WORKFLOW_CLASSES\.attentionChip/);
		expect(tabSource).toMatch(/workflow-attention-list-loading[\s\S]*?DS_WORKFLOW_CLASSES\.attentionChip/);
	});

	it('keeps list section as flex column for coherent vertical rhythm with state shells', () => {
		expect(tabSource).toMatch(/data-testid="workflow-items-list-section"[\s\S]*?class="[^"]*flex flex-col/);
	});

	it('defaults CaseEmptyState framed=true so non-Workflow tabs keep the dashed card', () => {
		expect(emptyStateSource).toContain('export let framed = true');
		expect(emptyStateSource).toMatch(/\{framed\s*\?/);
	});
});
