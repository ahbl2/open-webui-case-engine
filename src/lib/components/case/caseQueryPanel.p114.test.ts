/**
 * P114-04 — Case query structured filter controls (static source guardrails).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseQueryPanel.svelte');

describe('CaseQueryPanel.svelte (P114-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('exposes structured filter controls with stable test ids', () => {
		expect(src).toContain('data-testid="case-query-structured-filters"');
		expect(src).toContain('data-testid="case-query-filter-type"');
		expect(src).toContain('data-testid="case-query-filter-occurred-from"');
		expect(src).toContain('data-testid="case-query-filter-occurred-to"');
		expect(src).toContain('data-testid="case-query-filter-tags"');
		expect(src).toContain('data-testid="case-query-filter-location"');
		expect(src).toContain('data-testid="case-query-filters-clear"');
		expect(src).toContain('data-testid="case-query-filters-active-indicator"');
	});

	it('uses caseQueryStructuredFiltersUi for request shaping (explicit fields only)', () => {
		expect(src).toContain('$lib/case/caseQueryStructuredFiltersUi');
		expect(src).toContain('structuredFiltersFromUiFields');
		expect(src).not.toMatch(/smart match/i);
	});

	it('passes optional filters into postCaseQuery only when built payload exists', () => {
		expect(src).toContain('postCaseQuery');
		expect(src).toContain('...(filters ? { filters } : {})');
	});

	it('clears filter fields on case change', () => {
		expect(src).toContain('filterTypeToken =');
		expect(src).toContain('clearStructuredFilters');
	});

	it('shows Case Engine structured_filters trace when present', () => {
		expect(src).toContain('case-query-trace-structured-filters');
		expect(src).toContain('structured_filters');
	});
});
