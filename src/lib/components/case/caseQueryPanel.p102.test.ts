/**
 * P102-04 — Case query panel guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseQueryPanel.svelte');
const pagePath = join(here, '../../../routes/(app)/case/[id]/query/+page.svelte');

describe('CaseQueryPanel.svelte (P102-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('uses shared P102 presentation helpers for labels and scope', () => {
		expect(src).toContain('$lib/case/p102CaseQueryPresentation');
		expect(src).toContain('formatCaseQueryCitationLabel');
		expect(src).toContain('caseQueryResponseMatchesActiveCase');
		expect(src).toContain('P102_CASE_QUERY_SCOPE_COPY');
	});

	it('uses postCaseQuery from caseQueryApi only', () => {
		expect(src).toContain("$lib/apis/caseEngine/caseQueryApi");
		expect(src).toContain('postCaseQuery');
		expect(src).not.toContain('createCaseProposal');
		expect(src).not.toContain('/case-proposals');
		expect(src).not.toContain('/entries');
	});

	it('exposes status and stale-response guard hooks', () => {
		expect(src).toContain('data-testid="case-query-panel"');
		expect(src).toContain('data-case-query-status');
		expect(src).toContain('data-case-query-result-case-id');
		expect(src).toContain('data-testid="case-query-status-headline"');
		expect(src).toContain('requestGeneration');
	});

	it('does not add mutation affordances', () => {
		expect(src).not.toMatch(/Add to timeline|Create task|Create proposal/i);
	});

	it('uses distinct status surface classes (not success styling for degraded)', () => {
		expect(src).toContain('ce-l-case-query-status--degraded');
		expect(src).toContain('ce-l-case-query-status--refused');
		expect(src).toContain('ce-l-case-query-status--ok');
	});
});

describe('query/+page.svelte (P102-04)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('mounts CaseQueryPanel with case id and token', () => {
		expect(src).toContain('CaseQueryPanel');
		expect(src).toContain('caseEngineToken');
		expect(src).toContain('$page.params.id');
	});
});
