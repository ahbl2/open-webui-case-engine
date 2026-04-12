/**
 * Phase 96 — Synthesis panel: section order, authority, traceability, uncertainty, P96-05 integration guardrails.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseSynthesisReadModelPanel.svelte');
const overviewPath = join(here, 'CaseSynthesisReadModelOverviewSection.svelte');

const FORBIDDEN_WORKFLOW_PHRASES = [
	/next step/i,
	/next action/i,
	/reminder/i,
	/follow-up required/i,
	/follow up required/i,
	/orchestrat/i,
	/\bassign\b/i,
	/action item/i
];

const FORBIDDEN_SCORING_PHRASES = [/confidence score/i, /\btruth score\b/i, /\bverified\b/i];

const FORBIDDEN_AUTHORITY_DRIFT_PHRASES = [/\bofficial summary\b/i, /\bfinal conclusion\b/i];

function indexOrFail(src: string, needle: string): number {
	const i = src.indexOf(needle);
	if (i === -1) throw new Error(`Missing substring: ${needle}`);
	return i;
}

describe('CaseSynthesisReadModelPanel.svelte (P96-02 / P96-03 / P96-04 contract)', () => {
	const panelSrc = readFileSync(panelPath, 'utf8');

	it('renders synthesis sections in required DOM order (1→4)', () => {
		const i1 = indexOrFail(panelSrc, 'data-testid="synthesis-section-established-facts"');
		const i2 = indexOrFail(panelSrc, 'data-testid="synthesis-section-supporting-context"');
		const i3 = indexOrFail(panelSrc, 'data-testid="synthesis-section-gaps-unknowns"');
		const i4 = indexOrFail(panelSrc, 'data-testid="synthesis-section-trace-summary"');
		expect(i1 < i2 && i2 < i3 && i3 < i4).toBe(true);
	});

	it('binds Timeline facts only to the established-facts section', () => {
		const eachFacts = '#each model.timeline_facts';
		const first = panelSrc.indexOf(eachFacts);
		expect(first).toBeGreaterThan(-1);
		const second = panelSrc.indexOf(eachFacts, first + 1);
		expect(second).toBe(-1);
		const established = indexOrFail(panelSrc, 'data-testid="synthesis-section-established-facts"');
		const supporting = indexOrFail(panelSrc, 'data-testid="synthesis-section-supporting-context"');
		expect(first).toBeGreaterThan(established);
		expect(first).toBeLessThan(supporting);
	});

	it('binds supporting_context only under supporting section', () => {
		const eachSupport = '#each model.supporting_context';
		const pos = panelSrc.indexOf(eachSupport);
		expect(pos).toBeGreaterThan(-1);
		const supporting = indexOrFail(panelSrc, 'data-testid="synthesis-section-supporting-context"');
		const gaps = indexOrFail(panelSrc, 'data-testid="synthesis-section-gaps-unknowns"');
		expect(pos).toBeGreaterThan(supporting);
		expect(pos).toBeLessThan(gaps);
	});

	it('uses stable empty-state hooks for predictable layout', () => {
		expect(panelSrc).toContain('data-testid="synthesis-empty-established"');
		expect(panelSrc).toContain('data-testid="synthesis-empty-supporting"');
		expect(panelSrc).toContain('data-testid="synthesis-empty-gaps"');
	});

	it('does not include workflow-oriented phrases in operator copy', () => {
		for (const re of FORBIDDEN_WORKFLOW_PHRASES) {
			expect(panelSrc).not.toMatch(re);
		}
	});

	it('does not include scoring or certainty-badge style phrases', () => {
		for (const re of FORBIDDEN_SCORING_PHRASES) {
			expect(panelSrc).not.toMatch(re);
		}
	});

	it('does not include authority-drift phrases (official summary, final conclusion)', () => {
		for (const re of FORBIDDEN_AUTHORITY_DRIFT_PHRASES) {
			expect(panelSrc).not.toMatch(re);
		}
	});

	it('P96-03: citation hooks and trace IDs are present for traceability UI', () => {
		expect(panelSrc).toContain('data-testid="synthesis-fact-citation"');
		expect(panelSrc).toContain('data-testid="synthesis-support-citation"');
		expect(panelSrc).toContain('data-testid="synthesis-gap-traceability"');
		expect(panelSrc).toContain('data-testid="synthesis-gap-no-source-refs"');
		expect(panelSrc).toContain('data-testid="synthesis-trace-ids-timeline"');
		expect(panelSrc).toContain('data-testid="synthesis-trace-ids-tasks"');
		expect(panelSrc).toContain('data-testid="synthesis-trace-ids-files"');
		expect(panelSrc).toContain('formatTraceIdLine');
	});

	it('P96-03: Timeline facts use Timeline-specific badges (not task/file chronology)', () => {
		const established = indexOrFail(panelSrc, 'data-testid="synthesis-section-established-facts"');
		const tBadge = panelSrc.indexOf('Timeline entry', established);
		expect(tBadge).toBeGreaterThan(established);
		expect(panelSrc).toContain('Same entry as Timeline—this row is read-only display.');
	});

	it('P96-03: supporting rows expose source citation test id inside supporting section only', () => {
		const supStart = indexOrFail(panelSrc, 'data-testid="synthesis-section-supporting-context"');
		const supEnd = indexOrFail(panelSrc, 'data-testid="synthesis-section-gaps-unknowns"');
		const cit = panelSrc.indexOf('data-testid="synthesis-support-citation"');
		expect(cit).toBeGreaterThan(supStart);
		expect(cit).toBeLessThan(supEnd);
	});

	it('P96-03: gaps always include traceability block with no-reference fallback', () => {
		expect(panelSrc).toContain('data-testid="synthesis-gap-related-ids"');
	});

	it('P96-04: uncertainty states and non-authoritative gap framing', () => {
		expect(panelSrc).toContain('data-testid="synthesis-gap-state-no-refs"');
		expect(panelSrc).toContain('data-testid="synthesis-gap-state-linked-refs"');
		expect(panelSrc).toContain('data-synthesis-gap-state=');
		expect(panelSrc).toContain('data-testid="synthesis-gap-linked-framing"');
		expect(panelSrc).toContain('data-testid="synthesis-gap-no-refs-framing"');
		expect(panelSrc).toContain('Unknown / unanswered');
		expect(panelSrc).toContain('Ambiguous / mixed support');
		expect(panelSrc).toContain('Linked references (context only)');
		expect(panelSrc).toContain('No gap rows in this read model');
		expect(panelSrc).toContain('does not mean the picture is complete');
	});

	it('P96-04: empty gaps state explains absence of rows without claiming full understanding', () => {
		expect(panelSrc).toContain('data-testid="synthesis-empty-gaps"');
		expect(panelSrc).toContain('does not mean the picture is complete');
	});
});

describe('Phase 96 synthesis surface (P96-05 integration)', () => {
	const panelSrc = readFileSync(panelPath, 'utf8');
	const overviewSrc = readFileSync(overviewPath, 'utf8');

	it('panel uses coherent authority language (Timeline official; this view not the record)', () => {
		expect(panelSrc).toContain('not</span> the official');
		expect(panelSrc).toContain('Authoritative Timeline entries only');
		expect(panelSrc).toContain('supporting evidence only');
	});

	it('empty states use consistent read-only layout wording where applicable', () => {
		expect(panelSrc).toContain('No Timeline entries in this read-only layout.');
		expect(panelSrc).toContain('No supporting items in this read-only layout.');
	});

	it('section headings use uniform panel typography (no stray text-base on h3)', () => {
		expect(panelSrc).not.toMatch(/synthesis-supporting-heading[^\n]*text-base/);
		expect(panelSrc).not.toMatch(/synthesis-trace-heading[^\n]*text-base/);
	});

	it('overview shell aligns with Timeline authority and read-only framing', () => {
		expect(overviewSrc).toContain('Timeline tab holds the official chronology');
		expect(overviewSrc).toContain('Does not save, export, or change');
	});

	it('overview avoids authority-drift and workflow phrases', () => {
		for (const re of FORBIDDEN_AUTHORITY_DRIFT_PHRASES) {
			expect(overviewSrc).not.toMatch(re);
		}
		for (const re of FORBIDDEN_WORKFLOW_PHRASES) {
			expect(overviewSrc).not.toMatch(re);
		}
	});
});

describe('CaseSynthesisReadModelOverviewSection.svelte (load path)', () => {
	const overviewSrc = readFileSync(overviewPath, 'utf8');

	it('loads synthesis via read-only builder only (no direct mutation APIs)', () => {
		expect(overviewSrc).toContain("from '$lib/case/caseSynthesisReadModel'");
		expect(overviewSrc).toContain('buildCaseSynthesisReadModel');
		expect(overviewSrc).not.toMatch(/createCaseTask|softDeleteTimelineEntry|uploadCaseFile|DELETE/i);
	});

	it('overview copy avoids workflow-oriented phrases', () => {
		for (const re of FORBIDDEN_WORKFLOW_PHRASES) {
			expect(overviewSrc).not.toMatch(re);
		}
	});
});
