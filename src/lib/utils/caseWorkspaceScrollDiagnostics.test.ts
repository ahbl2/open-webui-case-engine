/**
 * P71-FU4 / P71-FU5 — contract: diagnostics exports + prod gate + session persistence strings.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, 'caseWorkspaceScrollDiagnostics.ts'), 'utf8');

describe('caseWorkspaceScrollDiagnostics (P71-FU4)', () => {
	it('exports measurement + run entry points and gates on import.meta.env.PROD', () => {
		expect(src).toContain('export function measureCaseWorkspaceScrollChain');
		expect(src).toContain('export function runCaseWorkspaceScrollDiagnostics');
		expect(src).toContain('export function shouldRunCaseWorkspaceScrollDiagnostics');
		expect(src).toMatch(/import\.meta\.env\.PROD/);
	});

	it('P71-FU5: sessionStorage key persists activation across tab navigation', () => {
		expect(src).toContain('CE_CASE_SCROLL_DIAG_SESSION');
		expect(src).toContain('persistCaseScrollDiagFromUrl');
	});

	it('documents activation (query string + localStorage) and console hook', () => {
		expect(src).toContain('CE_CASE_SCROLL_DIAG');
		expect(src).toContain('caseScrollDiag');
		expect(src).toContain('__caseWorkspaceScrollDiag');
		expect(src).toContain('Diagnostics enabled');
	});

	it('samples html, body, app pane, case shell, main, content region, route scroll, proposals', () => {
		expect(src).toContain('documentElement');
		expect(src).toContain('app-main-content-pane');
		expect(src).toContain('case-workspace-shell');
		expect(src).toContain('case-workspace-main');
		expect(src).toContain('ce-l-content-region');
		expect(src).toContain('case-timeline-primary-scroll');
		expect(src).toContain('proposal-panel-scroll');
		expect(src).toContain('proposal-review-panel');
	});
});
