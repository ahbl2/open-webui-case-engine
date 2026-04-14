/**
 * P129-01 — Activity audit framing: static copy; presentational component; route scoping.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p129ActivityFramingCopy.ts');
const framingPath = join(__dirname, '../components/case/CaseActivityFraming.svelte');
const activityPagePath = join(__dirname, '../../routes/(app)/case/[id]/activity/+page.svelte');

function assertNoTaboo(lower: string): void {
	expect(lower).not.toMatch(/\bimportant\b/);
	expect(lower).not.toMatch(/\bkey\b/);
	expect(lower).not.toMatch(/\binsight\b/);
	expect(lower).not.toMatch(/\banalysis\b/);
	expect(lower).not.toMatch(/\brecommended\b/);
}

describe('p129ActivityFramingCopy (P129-01)', () => {
	it('is static exports only; taboo-free', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P129_ACTIVITY_SURFACE_TITLE/);
		expect(src).toMatch(/P129_ACTIVITY_EMPTY_TITLE/);
		assertNoTaboo(src.toLowerCase());
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});
});

describe('CaseActivityFraming (P129-01)', () => {
	const src = readFileSync(framingPath, 'utf8');

	it('is presentational only', () => {
		expect(src).toMatch(/data-testid="case-activity-p129-framing"/);
		expect(src).not.toMatch(/\$page/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/onMount\b/);
	});

	it('does not use DS_STATUS_SURFACE_CLASSES', () => {
		expect(src).not.toMatch(/DS_STATUS_SURFACE_CLASSES/);
	});
});

describe('activity +page (P129-01)', () => {
	const src = readFileSync(activityPagePath, 'utf8');

	it('uses getRouteCaseIdString and forbids $page.params.id', () => {
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('mounts CaseActivityFraming before primary scroll region', () => {
		const idxFraming = src.indexOf('<CaseActivityFraming');
		const idxScroll = src.indexOf('case-activity-primary-scroll');
		expect(idxFraming).toBeGreaterThan(-1);
		expect(idxScroll).toBeGreaterThan(-1);
		expect(idxFraming).toBeLessThan(idxScroll);
	});

	it('delegates activity data to CaseActivityList (P129-03)', () => {
		expect(src).toContain('CaseActivityList');
		expect(src).not.toMatch(/listCaseTimelineEntries|listProposals|listCaseFiles/);
	});
});
