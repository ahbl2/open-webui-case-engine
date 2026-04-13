/**
 * P103-04 / P103-05 — CaseQueryPanel presentation + operator copy.
 * P118-04 — Citation navigation resolved via Case Engine `/navigation/citation` (no client route tables).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseQueryPanel.svelte');

describe('CaseQueryPanel.svelte (P103 / P118 navigation)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('P118-04: wires citations to Case Engine postCaseCitationNavigation prefetch + navigateFromCitationNavigationResult', () => {
		expect(src).toContain('postCaseCitationNavigation');
		expect(src).toContain('prefetchCitationNavigations');
		expect(src).toContain('navigateFromCitationNavigationResult');
		expect(src).not.toContain('resolveQueryCitationNavigation');
		expect(src).toContain('case-query-citation-open');
		expect(src).toContain('case-query-citation-unavailable');
		expect(src).toContain('case-query-citation-nav-error');
		expect(src).toContain('openCitationFromQuery');
		expect(src).toContain('p103NavigationOperatorCopy');
		expect(src).toContain('p118NavigationOperatorCopy');
	});

	it('does not add write or proposal paths on the query surface', () => {
		expect(src).not.toMatch(/POST\s+\/cases\/.*\/(entries|tasks|files|notes|proposals)/i);
		expect(src).not.toContain('createProposal');
		expect(src).not.toContain('commitProposal');
	});

	it('navigates only from explicit citation handler (no onMount goto)', () => {
		expect(src).not.toMatch(/onMount\s*\([^)]*goto/);
	});
});
