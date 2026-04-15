/**
 * P128-04 — Accept/reject guardrails (static analysis).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelPath = join(process.cwd(), 'src/lib/components/proposals/ProposalReviewPanel.svelte');
const pagePath = join(process.cwd(), 'src/routes/(app)/case/[id]/proposals/+page.svelte');
const copyPath = join(process.cwd(), 'src/lib/caseContext/p128ProposalReviewCopy.ts');

const taboo =
	/\b(best|top|priority|important|recommended|suggested|likely|matched|detected|score|ranking)\b/i;

describe('P128-04 — review copy', () => {
	it('p128ProposalReviewCopy has no taboo wording', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).not.toMatch(taboo);
		expect(src).not.toMatch(/\bauto\b/i);
	});
});

describe('P128-04 — ProposalReviewPanel', () => {
	it('defines single-review mode and sequential accept handler', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('export let p128SingleReviewMode = false');
		expect(src).toContain('handleP128Accept');
		expect(src).toContain('await approveProposal');
		expect(src).toContain('await commitProposal');
		expect(src).toContain('p128-accept-btn');
		expect(src).toContain('P128_ACCEPT_BUTTON_TITLE');
	});

	it('hides bulk bar when p128 presentation (no bulk block tied to single mode)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('!p128Presentation && anySelectedOnTab');
	});
});

describe('P128-04 — proposals route', () => {
	it('enables single-review mode and getRouteCaseIdString', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain('p128SingleReviewMode={true}');
		expect(src).toContain('reviewActionsEnabled={true}');
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});
