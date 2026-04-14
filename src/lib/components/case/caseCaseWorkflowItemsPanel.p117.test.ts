/**
 * P117-04 — Case workflow items panel guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseCaseWorkflowItemsPanel.svelte');
const pagePath = join(here, '../../../routes/(app)/case/[id]/case-workflow/+page.svelte');
const apiPath = join(here, '../../apis/caseEngine/caseWorkflowItemsApi.ts');

describe('CaseCaseWorkflowItemsPanel.svelte (P117-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('uses Phase 117 caseWorkflowItemsApi only (not legacy workflow-items)', () => {
		expect(src).toContain("$lib/apis/caseEngine/caseWorkflowItemsApi");
		expect(src).toContain('listCaseWorkflowItems');
		expect(src).toContain('CaseWorkflowCreateForm');
		expect(src).toContain('updateCaseWorkflowItem');
		expect(src).not.toContain('/workflow-items');
		expect(src).not.toContain('CaseWorkflowTab');
	});

	it('does not client-side sort or re-rank the server list', () => {
		expect(src).not.toContain('.sort(');
	});

	it('does not add delete control', () => {
		expect(src).not.toMatch(/delete|remove workflow/i);
	});

	it('exposes test ids for loading, empty, error, list, create, filters', () => {
		expect(src).toContain('data-testid="case-case-workflow-items-panel"');
		expect(src).toContain('data-testid="case-workflow-panel--loading"');
		expect(src).toContain('data-testid="case-workflow-panel--empty"');
		expect(src).toContain('data-testid="case-workflow-panel--error"');
		expect(src).toContain('data-testid="case-workflow-panel--list"');
		expect(src).toContain('data-testid="case-workflow-panel--create-form"');
		expect(src).toContain('data-testid="case-workflow-panel--type"');
		expect(src).toContain('data-testid="case-workflow-panel--local-filters"');
	});

	it('uses P117 operator copy module', () => {
		expect(src).toContain('$lib/case/p117CaseWorkflowItemsCopy');
	});
});

describe('case-workflow/+page.svelte (P117-04)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('mounts CaseCaseWorkflowItemsPanel with case id and token', () => {
		expect(src).toContain('CaseCaseWorkflowItemsPanel');
		expect(src).toContain('caseEngineToken');
		expect(src).toContain('$page.params.id');
		expect(src).toContain('#key caseId');
	});
});

describe('caseWorkflowItemsApi.ts path guard', () => {
	const src = readFileSync(apiPath, 'utf8');

	it('does not build legacy P13 /cases/:id/workflow-items template', () => {
		expect(src.match(/\`\/cases\/\$\{[^}]+\}\/workflow-items\`/g) ?? []).toHaveLength(0);
	});
});
