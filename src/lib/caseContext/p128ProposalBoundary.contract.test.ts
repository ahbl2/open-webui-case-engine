/**
 * P128-05 — Proposal boundary: taboo scan on P128 copy + key surfaces; no client list sort.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const taboo =
	/\b(best|top|priority|important|recommended|suggested|likely|matched|detected|score|ranking)\b/i;

const copyFiles = [
	'p128ProposalFramingCopy.ts',
	'p128ProposalListCopy.ts',
	'p128ProposalReviewCopy.ts',
	'p128ProposalCreateCopy.ts'
] as const;

const root = join(process.cwd(), 'src/lib/caseContext');
const framingPath = join(process.cwd(), 'src/lib/components/case/CaseProposalFraming.svelte');
const proposalsPagePath = join(process.cwd(), 'src/routes/(app)/case/[id]/proposals/+page.svelte');
const displayPath = join(root, 'p128ProposalDisplay.ts');

describe('P128-05 — copy modules taboo scan', () => {
	for (const f of copyFiles) {
		it(`${f} has no ranking/inference taboo tokens`, () => {
			const src = readFileSync(join(root, f), 'utf8');
			expect(src).not.toMatch(taboo);
			expect(src).not.toMatch(/\bauto\b/i);
		});
	}
});

describe('P128-05 — list preview helpers', () => {
	it('p128ProposalDisplay has no client-side .sort(', () => {
		const src = readFileSync(displayPath, 'utf8');
		expect(src).not.toMatch(/\.sort\s*\(/);
	});
});

describe('P128-05 — proposals route + framing', () => {
	it('proposals page documents boundary and mounts framing before panel', () => {
		const src = readFileSync(proposalsPagePath, 'utf8');
		expect(src).toMatch(/proposal_records/i);
		expect(src).toMatch(/timeline_entries/i);
		expect(src).toMatch(/Notes \(drafts\)/i);
		expect(src).toMatch(/official record/i);
		expect(src.indexOf('<CaseProposalFraming')).toBeLessThan(src.indexOf('<ProposalReviewPanel'));
	});

	it('CaseProposalFraming stays presentational and includes P128-05 acceptance copy', () => {
		const src = readFileSync(framingPath, 'utf8');
		expect(src).toContain('P128_PROPOSALS_FRAMING_BODY_ACCEPTANCE');
		expect(src).not.toMatch(/\$page|localStorage|sessionStorage/);
	});
});
