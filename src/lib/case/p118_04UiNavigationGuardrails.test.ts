/**
 * P118-04 — Static scans: backend-driven navigation wiring, banned interpretive copy, no legacy citation resolver in query panel.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, '../components/case/CaseQueryPanel.svelte');
const relPanelPath = join(here, '../components/case/CaseRelationshipsPanel.svelte');
const copyPath = join(here, 'p118NavigationOperatorCopy.ts');

/** Ticket-banned interpretive marketing-style labels (substring scan). */
const BANNED_SUBSTRINGS = [
	'Relevant',
	'Important',
	'Suggested',
	'Related evidence',
	'Next step'
];

describe('P118-04 — CaseQueryPanel navigation wiring', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('resolves citation navigation via Case Engine POST only', () => {
		expect(src).toContain('postCaseCitationNavigation');
		expect(src).toContain('enforce_envelope_case_id');
		expect(src).toContain('navigateFromCitationNavigationResult');
	});

	it('does not call legacy resolveQueryCitationNavigation on the query surface', () => {
		expect(src).not.toContain('resolveQueryCitationNavigation');
	});

	it('preserves case_file text span display for operator visibility', () => {
		expect(src).toContain('text_span');
		expect(src).toContain("c.kind === 'case_file'");
	});

	it('exposes deterministic citation UI test ids for supported / loading / unavailable / prefetch error', () => {
		expect(src).toContain('data-testid="case-query-citation-open"');
		expect(src).toContain('data-testid="case-query-citation-loading"');
		expect(src).toContain('data-testid="case-query-citation-unavailable"');
		expect(src).toContain('data-testid="case-query-citation-prefetch-error"');
	});

	it('uses neutral Open record action label', () => {
		expect(src).toContain('Open record');
	});
});

describe('P118-04 — CaseRelationshipsPanel linked records', () => {
	const src = readFileSync(relPanelPath, 'utf8');

	it('loads related navigation from Case Engine only', () => {
		expect(src).toContain('postCaseRelatedRecordNavigation');
		expect(src).toContain('navigateFromCitationNavigationResult');
	});

	it('does not sort or group candidates beyond engine order (no sort in panel)', () => {
		expect(src).not.toMatch(/\.sort\s*\(/);
		expect(src).not.toMatch(/groupBy|group_by/i);
	});

	it('surfaces linked list with explicit non-navigable path when navigation.ok is false', () => {
		expect(src).toContain('cand.navigation.ok');
		expect(src).toContain('case-relationships-linked-not-navigable');
	});
});

describe('P118-04 — operator copy scan (banned interpretive wording)', () => {
	const src = readFileSync(copyPath, 'utf8');

	for (const banned of BANNED_SUBSTRINGS) {
		it(`p118NavigationOperatorCopy does not contain "${banned}"`, () => {
			expect(src).not.toContain(banned);
		});
	}
});
