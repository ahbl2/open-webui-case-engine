/**
 * P127-03 — Workflow list + detail (attributes only): static copy; route scoping; no priority vocabulary.
 * P127-04 — Manual status: explicit apply; updateCaseWorkflowItem only from user action.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p127WorkflowListDetailCopy.ts');
const tabPath = join(__dirname, '../components/case/CaseWorkflowTab.svelte');
const panelPath = join(__dirname, '../components/case/CaseCaseWorkflowItemsPanel.svelte');
const detailPath = join(__dirname, '../components/case/CaseWorkflowDetailPanel.svelte');
const witemPagePath = join(__dirname, '../../routes/(app)/case/[id]/workflow/witem/[workflowItemId]/+page.svelte');

function assertNoTaboo(lower: string): void {
	expect(lower).not.toMatch(/\bimportant\b/);
	expect(lower).not.toMatch(/\bpriority\b/);
	expect(lower).not.toMatch(/\burgent\b/);
	expect(lower).not.toMatch(/\bcritical\b/);
	expect(lower).not.toMatch(/\bsuggested\b/);
	expect(lower).not.toMatch(/\brecommended\b/);
	expect(lower).not.toMatch(/\blikely\b/);
	expect(lower).not.toMatch(/\bmatched\b/);
}

describe('p127WorkflowListDetailCopy (P127-03 / P127-04)', () => {
	it('is static exports only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P127_WORKFLOW_LIST_SECTION_TITLE/);
		expect(src).toMatch(/P127_WORKFLOW_DETAIL_STATUS_APPLY/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});

	it('avoids taboo inference / priority vocabulary', () => {
		assertNoTaboo(readFileSync(copyPath, 'utf8').toLowerCase());
	});
});

describe('CaseWorkflowDetailPanel (P127-03 / P127-04)', () => {
	const src = readFileSync(detailPath, 'utf8');

	it('loads via listCaseWorkflowItems + find; no page stores', () => {
		expect(src).toContain('listCaseWorkflowItems');
		expect(src).toContain('.find(');
		expect(src).not.toMatch(/\$page/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('does not client-side sort workflow rows', () => {
		expect(src).not.toContain('.sort(');
	});

	it('P127-04: status changes only via explicit apply + updateCaseWorkflowItem', () => {
		expect(src).toContain('updateCaseWorkflowItem');
		expect(src).toContain('applyStatusChange');
		expect(src).toContain('case-workflow-detail-panel--status-apply');
		expect(src).toContain('case-workflow-detail-panel--status-select');
		expect(src).toContain('toast.success');
		const reactiveBlocks = src.match(/\$:[^;]+;/g) ?? [];
		expect(reactiveBlocks.some((b) => b.includes('updateCaseWorkflowItem'))).toBe(false);
	});
});

describe('CaseWorkflowTab P117 operational list (P127-03)', () => {
	const src = readFileSync(tabPath, 'utf8');

	it('uses list/detail copy + display labels; links to witem route', () => {
		expect(src).toContain('p127WorkflowListDetailCopy');
		expect(src).toContain('p127LabelWorkflowType');
		expect(src).toContain('/workflow/witem/');
		expect(src).toContain('encodeURIComponent(caseId)');
	});

	it('does not use $page.params.id', () => {
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('does not client-side sort Phase 117 list', () => {
		const block = src.split('workflow-p117-items-list')[1] ?? '';
		expect(block).not.toContain('.sort(');
	});
});

describe('CaseCaseWorkflowItemsPanel list rows (P127-03)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('uses P127 list copy for empty + detail links; no description paragraph in list rows', () => {
		expect(src).toContain('P127_WORKFLOW_LIST_EMPTY');
		expect(src).toContain('case-workflow-panel--detail-link');
		expect(src).not.toMatch(/\{#if it\.description\}/);
	});

	it('does not client-side sort server list', () => {
		expect(src).not.toContain('.sort(');
	});

	it('does not use $page.params.id', () => {
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});

describe('workflow witem route (P127-03)', () => {
	const src = readFileSync(witemPagePath, 'utf8');

	it('uses getRouteCaseIdString and forbids $page.params.id', () => {
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});
