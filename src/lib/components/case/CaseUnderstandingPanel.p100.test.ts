/**
 * P100-04 / P100-05 — Case Understanding panel: ordering, authority copy, guardrails (static source read).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseUnderstandingPanel.svelte');
const overviewPath = join(here, 'CaseUnderstandingOverviewSection.svelte');

const FORBIDDEN_PRIORITY = [
	/\bkey\b/i,
	/\btop\b/i,
	/\bimportant\b/i,
	/\blikely\b/i,
	/\brelated\b/i,
	/\bcentral\b/i,
	/\bsuspicious\b/i,
	/\bmost frequent\b/i
];

function indexOrFail(src: string, needle: string): number {
	const i = src.indexOf(needle);
	if (i === -1) throw new Error(`Missing substring: ${needle}`);
	return i;
}

describe('CaseUnderstandingPanel.svelte (P100-04 / P100-05)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('orders entity sections by CASE_ENTITY_TYPES via grouped each', () => {
		expect(src).toContain('CASE_ENTITY_TYPES.map');
		expect(src).toContain('case-understanding-section-');
	});

	it('uses trace record list from P100-03', () => {
		expect(src).toContain('buildEntityTraceFromAggregateGroup');
		expect(src).toContain('trace.record_level');
	});

	it('does not embed record body text or alternate viewers', () => {
		expect(src).not.toMatch(/innerHTML|dangerouslySetInnerHTML/i);
		expect(src).not.toMatch(/iframe|markdown.*render/i);
	});

	it('avoids priority / ranking operator copy', () => {
		for (const re of FORBIDDEN_PRIORITY) {
			expect(src).not.toMatch(re);
		}
	});

	it('exposes stable test hooks', () => {
		expect(src).toContain('data-testid="case-understanding-panel"');
		expect(src).toContain('data-testid="case-understanding-empty"');
		expect(src).toContain('data-testid="case-understanding-no-session"');
		expect(src).toContain('data-testid="case-understanding-trace-list"');
		expect(src).toContain('data-testid="case-understanding-file-limit"');
	});

	it('uses shared P100 copy module and aria labels on Open', () => {
		expect(src).toContain('p100Phase100Copy');
		expect(src).toContain('openTraceContributorAriaLabel');
		expect(src).toContain('caseEngineLinked');
	});

	it('places authority and file-limit lines before entity sections', () => {
		const iPanel = indexOrFail(src, 'data-testid="case-understanding-panel"');
		const iAuth = indexOrFail(src, 'data-testid="case-understanding-authority"');
		const iFile = indexOrFail(src, 'data-testid="case-understanding-file-limit"');
		const iSection = indexOrFail(src, 'case-understanding-section-');
		expect(iAuth).toBeGreaterThan(iPanel);
		expect(iFile).toBeGreaterThan(iAuth);
		expect(iSection).toBeGreaterThan(iFile);
	});
});

describe('CaseUnderstandingOverviewSection.svelte (P100-04 / P100-05)', () => {
	const src = readFileSync(overviewPath, 'utf8');

	it('loads aggregation via P100-02 only', () => {
		expect(src).toContain('aggregateCaseEntitiesFromSourceRecords');
		expect(src).toContain('loadCaseUnderstandingSourceRecords');
		expect(src).toContain('caseEngineLinked');
		expect(src).toContain('case-understanding-overview-deck');
		expect(src).toContain('p100Phase100Copy');
	});

	it('avoids priority phrasing in header', () => {
		for (const re of FORBIDDEN_PRIORITY) {
			expect(src).not.toMatch(re);
		}
	});
});
