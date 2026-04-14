/**
 * P127-02 — Workflow create form: static copy; no taboo vocabulary; no page id leakage.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p127WorkflowCreateCopy.ts');
const formPath = join(__dirname, '../components/case/CaseWorkflowCreateForm.svelte');
const tabPath = join(__dirname, '../components/case/CaseWorkflowTab.svelte');
const panelPath = join(__dirname, '../components/case/CaseCaseWorkflowItemsPanel.svelte');

describe('p127WorkflowCreateCopy (P127-02)', () => {
	it('is static exports only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P127_WORKFLOW_CREATE_ENTRY_BUTTON/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});

	it('avoids taboo inference / priority product vocabulary', () => {
		const lower = readFileSync(copyPath, 'utf8').toLowerCase();
		expect(lower).not.toMatch(/\bsuggested\b/);
		expect(lower).not.toMatch(/\brecommended\b/);
		expect(lower).not.toMatch(/\bimportant\b/);
		expect(lower).not.toMatch(/\bpriority\b/);
		expect(lower).not.toMatch(/\bdetected\b/);
		expect(lower).not.toMatch(/\bmatched\b/);
	});
});

describe('CaseWorkflowCreateForm (P127-02)', () => {
	const src = readFileSync(formPath, 'utf8');

	it('calls createCaseWorkflowItem only; no fetch(', () => {
		expect(src).toContain('createCaseWorkflowItem');
		expect(src).not.toContain('fetch(');
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('uses explicit type and status selects (no case-data prefill)', () => {
		expect(src).toContain('bind:value={workflowType}');
		expect(src).toContain('bind:value={status}');
		expect(src).not.toMatch(/placeholder=\{.*case/i);
	});
});

describe('CaseWorkflowTab workflow create wiring (P127-02)', () => {
	const src = readFileSync(tabPath, 'utf8');

	it('mounts CaseWorkflowCreateForm in modal; no legacy create priority state', () => {
		expect(src).toContain('CaseWorkflowCreateForm');
		expect(src).toContain('workflow-p127-create-modal');
		expect(src).not.toMatch(/createPriority/);
	});

	it('does not use $page.params.id', () => {
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});

describe('CaseCaseWorkflowItemsPanel create wiring (P127-02)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('embeds CaseWorkflowCreateForm', () => {
		expect(src).toContain('CaseWorkflowCreateForm');
		expect(src).toContain('case-workflow-panel--create-form');
	});
});
