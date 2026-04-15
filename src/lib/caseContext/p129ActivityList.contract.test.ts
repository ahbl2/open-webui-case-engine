/**
 * P129-03 — Activity list: static copy, display mapping, list component + route contracts.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const listCopyPath = join(__dirname, 'p129ActivityListCopy.ts');
const displayPath = join(__dirname, '../case/p129ActivityDisplay.ts');
const listPath = join(__dirname, '../components/case/CaseActivityList.svelte');
const detailPath = join(__dirname, '../components/case/CaseActivityEventDetail.svelte');
const sourceHrefPath = join(__dirname, '../case/p129ActivitySourceHref.ts');
const detailCopyPath = join(__dirname, 'p129ActivityDetailCopy.ts');
const activityPagePath = join(__dirname, '../../routes/(app)/case/[id]/activity/+page.svelte');

function assertNoRankingTaboo(lower: string): void {
	expect(lower).not.toMatch(/\bimportant\b/);
	expect(lower).not.toMatch(/\bkey\b/);
	expect(lower).not.toMatch(/\bpriority\b/);
	expect(lower).not.toMatch(/\bcritical\b/);
	expect(lower).not.toMatch(/\brecommended\b/);
}

function assertNoInferenceTaboo(lower: string): void {
	expect(lower).not.toMatch(/\blikely\b/);
	expect(lower).not.toMatch(/\bdetected\b/);
	expect(lower).not.toMatch(/\bmatched\b/);
	expect(lower).not.toMatch(/\bderived\b/);
	expect(lower).not.toMatch(/\binferred\b/);
	expect(lower).not.toMatch(/\binsight\b/);
	expect(lower).not.toMatch(/\banalysis\b/);
	expect(lower).not.toMatch(/\bmeaning\b/);
	expect(lower).not.toMatch(/\bsuggested\b/);
}

describe('p129ActivityListCopy (P129-03)', () => {
	it('is static-only and taboo-free', () => {
		const src = readFileSync(listCopyPath, 'utf8');
		expect(src).toMatch(/P129_ACTIVITY_LIST_EMPTY_TITLE/);
		assertNoRankingTaboo(src.toLowerCase());
		assertNoInferenceTaboo(src.toLowerCase());
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});
});

describe('p129ActivityDisplay (P129-03)', () => {
	const src = readFileSync(displayPath, 'utf8');

	it('maps event types to factual labels', () => {
		expect(src).toContain('Proposal created');
		expect(src).toContain('Timeline entry created');
	});

	it('has no taboo wording', () => {
		const lower = src.toLowerCase();
		assertNoRankingTaboo(lower);
		assertNoInferenceTaboo(lower);
	});
});

describe('CaseActivityList (P129-03 / P129-04)', () => {
	const src = readFileSync(listPath, 'utf8');

	it('uses listCaseActivityEvents and does not reorder the events array', () => {
		expect(src).toContain('listCaseActivityEvents');
		expect(src).not.toMatch(/\bevents\s*\.\s*sort\s*\(/);
	});

	it('wires source links and detail panel (P129-04)', () => {
		expect(src).toContain('p129ActivitySourceHref');
		expect(src).toContain('CaseActivityEventDetail');
	});

	it('does not read route params directly', () => {
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});
});

describe('CaseActivityEventDetail (P129-04)', () => {
	const src = readFileSync(detailPath, 'utf8');

	it('is presentational only', () => {
		expect(src).toMatch(/data-testid="case-activity-event-detail"/);
		expect(src).not.toMatch(/\$page/);
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/\$lib\/stores/);
	});
});

describe('p129ActivitySourceHref (P129-04)', () => {
	const src = readFileSync(sourceHrefPath, 'utf8');

	it('does not import client stores or routing', () => {
		expect(src).not.toMatch(/\$page/);
		expect(src).not.toMatch(/\$lib\/stores/);
	});
});

describe('p129ActivityDetailCopy (P129-04)', () => {
	it('is taboo-free static copy', () => {
		const src = readFileSync(detailCopyPath, 'utf8');
		const lower = src.toLowerCase();
		assertNoRankingTaboo(lower);
		assertNoInferenceTaboo(lower);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});
});

describe('activity +page (P129-03)', () => {
	const src = readFileSync(activityPagePath, 'utf8');

	it('uses getRouteCaseIdString and forbids $page.params.id', () => {
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('keeps CaseActivityFraming before list region', () => {
		const idxFraming = src.indexOf('<CaseActivityFraming');
		const idxScroll = src.indexOf('case-activity-primary-scroll');
		expect(idxFraming).toBeGreaterThan(-1);
		expect(idxScroll).toBeGreaterThan(-1);
		expect(idxFraming).toBeLessThan(idxScroll);
	});

	it('mounts CaseActivityList inside scroll when token path exists', () => {
		expect(src).toContain('<CaseActivityList');
	});
});
