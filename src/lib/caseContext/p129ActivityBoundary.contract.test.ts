/**
 * P129-05 — Audit boundary: taboo wording, no cross-surface imports, no client reorder.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const p129CopyAndComponentPaths = [
	join(__dirname, 'p129ActivityFramingCopy.ts'),
	join(__dirname, 'p129ActivityListCopy.ts'),
	join(__dirname, 'p129ActivityDetailCopy.ts'),
	join(__dirname, '../components/case/CaseActivityFraming.svelte'),
	join(__dirname, '../components/case/CaseActivityList.svelte'),
	join(__dirname, '../components/case/CaseActivityEventDetail.svelte'),
	join(__dirname, '../case/p129ActivityDisplay.ts'),
	join(__dirname, '../case/p129ActivitySourceHref.ts')
];

function assertP129TabooFree(lower: string): void {
	expect(lower).not.toMatch(/\bimportant\b/);
	expect(lower).not.toMatch(/\bkey\b/);
	expect(lower).not.toMatch(/\bcritical\b/);
	expect(lower).not.toMatch(/\bpriority\b/);
	expect(lower).not.toMatch(/\binsight\b/);
	expect(lower).not.toMatch(/\banalysis\b/);
	expect(lower).not.toMatch(/\bmeaning\b/);
	expect(lower).not.toMatch(/\brecommended\b/);
	expect(lower).not.toMatch(/\bsuggested\b/);
	expect(lower).not.toMatch(/\blikely\b/);
	expect(lower).not.toMatch(/\bdetected\b/);
	expect(lower).not.toMatch(/\bmatched\b/);
	expect(lower).not.toMatch(/\bderived\b/);
	expect(lower).not.toMatch(/\binferred\b/);
}

describe('P129-05 boundary (copy + Activity components)', () => {
	it('is taboo-free across P129 Activity copy and components', () => {
		for (const p of p129CopyAndComponentPaths) {
			const src = readFileSync(p, 'utf8');
			assertP129TabooFree(src.toLowerCase());
			expect(src).not.toMatch(/localStorage|sessionStorage/);
		}
	});

	it('Activity list does not use $page.params.id', () => {
		const src = readFileSync(join(__dirname, '../components/case/CaseActivityList.svelte'), 'utf8');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('Activity list does not reorder events client-side', () => {
		const src = readFileSync(join(__dirname, '../components/case/CaseActivityList.svelte'), 'utf8');
		expect(src).not.toMatch(/\bevents\s*\.\s*sort\s*\(/);
	});

	it('Activity list does not import Timeline/Proposal rendering components', () => {
		const src = readFileSync(join(__dirname, '../components/case/CaseActivityList.svelte'), 'utf8');
		expect(src).not.toMatch(/TimelineEntryCard|ProposalReview|CaseProposalDraft|CaseAiProposal/);
		// Timeline/Proposal data APIs — not used for Activity (Case Engine activity-events only).
		expect(src).not.toMatch(/listCaseTimelineEntries|listProposals\b/);
	});
});
