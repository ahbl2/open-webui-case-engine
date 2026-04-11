/**
 * P59-03 — Workflow attention region: client-derived counts (source contract).
 * No Svelte mount — verifies derivations bind to existing state only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-03 attention signals', () => {
	it('derives attention from items, proposalCount, filter, loading, and errors only', () => {
		expect(tabSource).toContain('// P59-03: attention signals');
		expect(tabSource).toContain('$: attentionListReady = !loading && !loadError');
		expect(tabSource).toMatch(/\$: attentionOpenInView = attentionListReady[\s\S]*?items\.filter/);
		expect(tabSource).toMatch(/\$: attentionFilterScopeLabel =[\s\S]*?filter === 'all'/);
	});

	it('clears proposals on case switch so derived pending count is not cross-case stale', () => {
		const caseSwitch = tabSource.indexOf('caseId !== prevWorkflowCaseId');
		expect(caseSwitch).toBeGreaterThan(-1);
		const slice = tabSource.slice(caseSwitch, caseSwitch + 1200);
		expect(slice).toMatch(/proposals = \[\];[\s\S]*?proposalError = null/);
	});

	it('renders attention chips with stable test ids and list load branches', () => {
		expect(tabSource).toContain('data-testid="workflow-attention-signals"');
		expect(tabSource).toContain('data-testid="workflow-attention-pending-chip"');
		expect(tabSource).toContain('data-testid="workflow-attention-pending-count"');
		expect(tabSource).toContain('data-testid="workflow-attention-listed-chip"');
		expect(tabSource).toContain('data-testid="workflow-attention-listed-count"');
		expect(tabSource).toContain('data-testid="workflow-attention-filter-scope"');
		expect(tabSource).toContain('data-testid="workflow-attention-open-chip"');
		expect(tabSource).toContain('data-testid="workflow-attention-open-count"');
		expect(tabSource).toContain('data-testid="workflow-attention-list-loading"');
		expect(tabSource).toContain('data-testid="workflow-attention-list-error"');
	});

	it('shows admin-only includes-deleted hint without new data fetches', () => {
		expect(tabSource).toMatch(
			/\{#if isAdmin && includeDeleted\}[\s\S]*?workflow-attention-includes-deleted/
		);
	});

	it('keeps attention region responsive to embedded mode', () => {
		expect(tabSource).toMatch(/workflow-attention-region[\s\S]*?embedded\s*\?/);
		expect(tabSource).toMatch(/workflow-attention-signals[\s\S]*?embedded\s*\?/);
	});

	it('does not add journey modules or deep links in the attention region', () => {
		const att = tabSource.indexOf('data-testid="workflow-attention-region"');
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		expect(att).toBeGreaterThan(-1);
		expect(main).toBeGreaterThan(att);
		const segment = tabSource.slice(att, main);
		expect(segment).not.toMatch(/href=["']\/case\//);
		expect(segment).not.toContain('goto(');
	});

	it('keeps attention markup free of fetches (signals bind to existing state only)', () => {
		const att = tabSource.indexOf('data-testid="workflow-attention-region"');
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		expect(att).toBeGreaterThan(-1);
		expect(main).toBeGreaterThan(att);
		const segment = tabSource.slice(att, main);
		expect(segment).not.toMatch(/await\s+/);
		expect(segment).not.toMatch(/fetch\s*\(/);
	});
});
