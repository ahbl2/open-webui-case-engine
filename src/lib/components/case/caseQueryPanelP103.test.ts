/**
 * P103-04 / P103-05 — CaseQueryPanel query → P103 navigation wiring and shared operator copy.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseQueryPanel.svelte');

describe('CaseQueryPanel.svelte (P103-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('wires citations to resolveQueryCitationNavigation and navigateToCitationNavigationPayload', () => {
		expect(src).toContain('resolveQueryCitationNavigation');
		expect(src).toContain('navigateToCitationNavigationPayload');
		expect(src).toContain('case-query-citation-open');
		expect(src).toContain('case-query-citation-unsupported');
		expect(src).toContain('case-query-citation-invalid-span');
		expect(src).toContain('case-query-citation-invalid-case');
		expect(src).toContain('case-query-citation-invalid');
		expect(src).toContain('case-query-citation-nav-error');
		expect(src).toContain('openCitationFromQuery');
		expect(src).toContain('p103NavigationOperatorCopy');
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
