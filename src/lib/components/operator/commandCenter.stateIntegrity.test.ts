/**
 * P131.6-05 — Home OCC Command Center state / structure contracts (source-level).
 * Exclusive summary modes, partial failure isolation, OccStateContainer precedence.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { P131_6_DASHBOARD_SOURCE_PATHS } from './commandCenterP131_6.sourcePaths';

const HOME_PAGE = P131_6_DASHBOARD_SOURCE_PATHS.find((p) => p.endsWith('/home/+page.svelte'))!;

describe('P131.6-05 summary band state exclusivity', () => {
	it('home +page summary slot uses mutually exclusive error / skeleton / KPI branches', () => {
		const page = readFileSync(HOME_PAGE, 'utf8');
		expect(page).toMatch(
			/\{#if\s+hasSummaryError\}[\s\S]*?<OccStateContainer[\s\S]*?\{:\s*else\s+if\s+summaryToken\s+&&\s*\(\s*casesLoading\s*\|\|\s*threadsLoading\s*\)\}[\s\S]*?<OccSkeletonTileRow[\s\S]*?\{:\s*else\}[\s\S]*?<OccSummaryKpiTiles/s
		);
		const errBranch = page.match(/\{#if\s+hasSummaryError\}([\s\S]*?)\{:\s*else\s+if/)?.[1] ?? '';
		expect(errBranch).toContain('<OccStateContainer');
		expect(errBranch).not.toContain('OccSummaryKpiTiles');
		expect(errBranch).not.toContain('OccSkeletonTileRow');
	});

	it('OccSummaryKpiTiles does not embed OccStateContainer (summary band stays presentational tiles)', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('OccSummaryKpiTiles.svelte'))!;
		const src = readFileSync(p, 'utf8');
		expect(src).not.toContain('OccStateContainer');
	});

	it('on summary error, entire summary slot is OccStateContainer (not mixed with KPI tiles in the same branch)', () => {
		const page = readFileSync(HOME_PAGE, 'utf8');
		const summarySlot = page.match(
			/<div\s+class="contents"\s+slot="summary">([\s\S]*?)<\/div>\s*<div\s+class="contents"\s+slot="colLeft">/
		);
		expect(summarySlot).toBeTruthy();
		const inner = summarySlot![1];
		expect(inner).toMatch(/\{#if\s+hasSummaryError\}/);
		const errBranch = inner.match(/\{#if\s+hasSummaryError\}([\s\S]*?)\{:\s*else\s+if/)?.[1] ?? '';
		expect(errBranch).toContain('OccStateContainer');
		expect(errBranch).not.toContain('OccSummaryKpiTiles');
	});
});

describe('P131.6-05 partial failure isolation (cases vs threads)', () => {
	it('home +page keeps independent error strings for cases load vs threads load', () => {
		const page = readFileSync(HOME_PAGE, 'utf8');
		expect(page).toMatch(/let\s+casesError\s*=\s*['"]/);
		expect(page).toMatch(/let\s+threadsLoadError\s*=\s*['"]/);
		expect(page).toMatch(
			/\$:\s*hasSummaryError\s*=\s*[\s\S]*casesError[\s\S]*threadsLoadError/s
		);
	});

	it('Your Cases widget binds OccStateContainer error to casesError only', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('HomeDesktopYourCases.svelte'))!;
		const src = readFileSync(p, 'utf8');
		expect(src).toContain('hasError={Boolean(casesError)}');
		expect(src).not.toContain('threadsLoadError');
	});

	it('Personal Threads widget binds OccStateContainer error to threads load error only', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('HomeDesktopPersonalThreads.svelte'))!;
		const src = readFileSync(p, 'utf8');
		expect(src).toContain('hasError={Boolean(threadsLoadError)}');
		expect(src).not.toContain('casesError');
	});

	it('P131.7-02 — OccHomeLeftColumn does not mount personal threads (legacy HomeDesktopPanels still does)', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('OccHomeLeftColumn.svelte'))!;
		const src = readFileSync(p, 'utf8');
		expect(src).not.toContain('HomeDesktopPersonalThreads');
		expect(src).not.toContain('occ-main-personal');
		expect(src).toContain('OccHomeBoardCases');
		expect(src).toContain('OccHomeWorkflowQueueZone');
	});
});

describe('P131.6-05 OccStateContainer precedence (error overrides loading/empty)', () => {
	it('OccStateContainer renders error branch before loading and empty slots', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('OccStateContainer.svelte'))!;
		const src = readFileSync(p, 'utf8');
		const errIdx = src.indexOf('{#if errorActive}');
		const loadIdx = src.indexOf('{:else if isLoading}');
		const emptyIdx = src.indexOf('{:else if isEmpty}');
		expect(errIdx).toBeGreaterThan(-1);
		expect(loadIdx).toBeGreaterThan(errIdx);
		expect(emptyIdx).toBeGreaterThan(loadIdx);
	});
});

describe('P131.6-05 dashboard zones render through explicit OccStateContainer (no blank unmarked regions)', () => {
	it('each dashboard zone file includes OccStateContainer for structured state', () => {
		const paths = [
			'HomeDesktopYourCases.svelte',
			'HomeDesktopPersonalThreads.svelte',
			'OccHomeWorkflowQueueZone.svelte',
			'OccHomeBoardActivity.svelte',
			'OccRailIntel.svelte',
			'OccRailAssistant.svelte',
			'OccRailProposals.svelte'
		];
		for (const name of paths) {
			const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith(name))!;
			const src = readFileSync(p, 'utf8');
			expect(src).toContain('OccStateContainer');
		}
	});

	it('summary error surface uses OccStateContainer with retry wired to summary reloads', () => {
		const page = readFileSync(HOME_PAGE, 'utf8');
		expect(page).toMatch(/hasSummaryError[\s\S]*?<OccStateContainer[\s\S]*?onRetry=\{retrySummaryLoads\}/s);
		expect(page).not.toContain('data-testid="occ-error-retry"');
		const occ = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('OccErrorBlock.svelte'))!;
		expect(readFileSync(occ, 'utf8')).toContain('data-testid="occ-error-retry"');
	});
});

describe('P131.6-05 retry wiring (read-only reload handlers)', () => {
	it('zone retries call parent load* functions (GET list refetch), not ad-hoc mutations', () => {
		const casesSrc = readFileSync(
			P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('HomeDesktopYourCases.svelte'))!,
			'utf8'
		);
		expect(casesSrc).toContain('onRetry={loadCases}');

		const threadsSrc = readFileSync(
			P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('HomeDesktopPersonalThreads.svelte'))!,
			'utf8'
		);
		expect(threadsSrc).toContain('onRetry={loadThreads}');
	});
});
