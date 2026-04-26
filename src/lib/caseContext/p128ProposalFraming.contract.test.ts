/**
 * P128-01 — Proposals intake framing: static copy; presentational component; route scoping.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p128ProposalFramingCopy.ts');
const framingPath = join(__dirname, '../components/case/CaseProposalFraming.svelte');
const proposalsPagePath = join(__dirname, '../../routes/(app)/case/[id]/proposals/+page.svelte');

function assertNoTaboo(lower: string): void {
	expect(lower).not.toMatch(/\bimportant\b/);
	expect(lower).not.toMatch(/\bpriority\b/);
	expect(lower).not.toMatch(/\bsuggested\b/);
	expect(lower).not.toMatch(/\brecommended\b/);
	expect(lower).not.toMatch(/\bdetected\b/);
}

describe('p128ProposalFramingCopy (P128-01)', () => {
	it('is static exports only; taboo-free', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P128_PROPOSALS_HERO_TITLE/);
		expect(src).toMatch(/P128_PROPOSALS_SURFACE_TITLE/);
		expect(src).toMatch(/P128_PROPOSALS_FRAMING_BODY_ACCEPTANCE/);
		assertNoTaboo(src.toLowerCase());
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});
});

describe('CaseProposalFraming (P128-01)', () => {
	const src = readFileSync(framingPath, 'utf8');

	it('is presentational only', () => {
		expect(src).toMatch(/P128_PROPOSALS_HERO_TITLE/);
		expect(src).toMatch(/data-testid="case-proposals-p128-intake-framing"/);
		expect(src).not.toMatch(/\$page/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/onMount\b/);
	});

	it('avoids Timeline/Notes/Files/Entities/Workflow ds-status surfaces', () => {
		expect(src).not.toMatch(/DS_STATUS_SURFACE_CLASSES/);
	});
});

describe('proposals +page (P128-01)', () => {
	const src = readFileSync(proposalsPagePath, 'utf8');

	it('uses getRouteCaseIdString and forbids $page.params.id', () => {
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('mounts CaseProposalFraming before ProposalReviewPanel', () => {
		const idxFraming = src.indexOf('<CaseProposalFraming');
		const idxPanel = src.indexOf('<ProposalReviewPanel');
		expect(idxFraming).toBeGreaterThan(-1);
		expect(idxPanel).toBeGreaterThan(-1);
		expect(idxFraming).toBeLessThan(idxPanel);
	});
});
