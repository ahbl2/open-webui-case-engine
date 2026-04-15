/**
 * P128-03 — Proposal list + read-only review guardrails (static analysis).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const copyPath = join(process.cwd(), 'src/lib/caseContext/p128ProposalListCopy.ts');
const displayPath = join(process.cwd(), 'src/lib/caseContext/p128ProposalDisplay.ts');
const detailPath = join(process.cwd(), 'src/lib/components/case/CaseProposalDetailPanel.svelte');
const pagePath = join(process.cwd(), 'src/routes/(app)/case/[id]/proposals/+page.svelte');
const panelPath = join(process.cwd(), 'src/lib/components/proposals/ProposalReviewPanel.svelte');

const taboo =
	/\b(best|top|priority|important|recommended|suggested|likely|matched|detected|score|ranking)\b/i;

describe('P128-03 — copy module', () => {
	it('p128ProposalListCopy is static strings only (no taboo wording)', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).not.toMatch(taboo);
		expect(src).not.toMatch(/\bauto\b/i);
		expect(src).not.toMatch(/\.sort\s*\(/);
	});
});

describe('P128-03 — display helpers', () => {
	it('p128ProposalDisplay has no client list sort', () => {
		const src = readFileSync(displayPath, 'utf8');
		expect(src).not.toMatch(/\.sort\s*\(/);
		expect(src).not.toMatch(taboo);
	});
});

describe('P128-03 — CaseProposalDetailPanel', () => {
	it('does not use $page.params.id or web storage', () => {
		const src = readFileSync(detailPath, 'utf8');
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(taboo);
	});
});

describe('P128-03 — proposals route wiring', () => {
	it('passes P128 single-review + review enabled and uses getRouteCaseIdString (not $page.params.id)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain('p128SingleReviewMode={true}');
		expect(src).toContain('reviewActionsEnabled={true}');
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});

describe('P128-03 — ProposalReviewPanel wiring', () => {
	it('embeds read-only detail, reviewActionsEnabled, and p128SingleReviewMode', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('export let reviewActionsEnabled = true');
		expect(src).toContain('export let p128SingleReviewMode = false');
		expect(src).toContain('CaseProposalDetailPanel');
		expect(src).toContain('p128ProposalListPreviewBody');
		expect(src).not.toMatch(/\.sort\s*\(\s*\)/);
	});
});
