/**
 * P127-05 — Workflow boundary: copy taboo scan; CaseWorkflowTab presentation guardrails.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const boundaryPath = join(__dirname, 'p127WorkflowBoundaryCopy.ts');
const framingPath = join(__dirname, 'p127WorkflowFramingCopy.ts');
const listDetailPath = join(__dirname, 'p127WorkflowListDetailCopy.ts');
const createPath = join(__dirname, 'p127WorkflowCreateCopy.ts');
const tabPath = join(__dirname, '../components/case/CaseWorkflowTab.svelte');

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

describe('p127WorkflowBoundaryCopy (P127-05)', () => {
	it('is static exports; taboo-free', () => {
		const src = readFileSync(boundaryPath, 'utf8');
		expect(src).toMatch(/P127_WORKFLOW_LEGACY_TOOLBAR_TITLE/);
		assertNoTaboo(src.toLowerCase());
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});
});

describe('P127 workflow copy modules taboo scan (P127-05)', () => {
	it.each([
		['p127WorkflowFramingCopy', framingPath],
		['p127WorkflowListDetailCopy', listDetailPath],
		['p127WorkflowCreateCopy', createPath]
	] as const)('%s', (_name, p) => {
		assertNoTaboo(readFileSync(p, 'utf8').toLowerCase());
	});
});

describe('CaseWorkflowTab boundary wiring (P127-05)', () => {
	const src = readFileSync(tabPath, 'utf8');

	it('imports boundary copy and drops urgency emoji helper from legacy table', () => {
		expect(src).toContain('p127WorkflowBoundaryCopy');
		expect(src).not.toContain('getPriorityEmoji');
	});

	it('does not use $page.params.id', () => {
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('does not render a Priority column header', () => {
		expect(src).not.toContain('>Priority</th');
	});
});
