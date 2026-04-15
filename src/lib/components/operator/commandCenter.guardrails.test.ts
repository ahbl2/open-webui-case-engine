/**
 * P131.6-05 — Command Center / Home OCC dashboard guardrails (source-level).
 * Read-only data zones, no-inference copy, no mutation imports in zone components.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
	COMMAND_CENTER_ROUTE_PANEL_PATH,
	P131_6_DASHBOARD_SOURCE_PATHS,
	P131_COMMAND_CENTER_COPY_PATH
} from './commandCenterP131_6.sourcePaths';

const HOME_PAGE_PATH = P131_6_DASHBOARD_SOURCE_PATHS[0];

function readSources(paths: readonly string[]): string {
	return paths.map((p) => readFileSync(p, 'utf8')).join('\n');
}

/** Zone + shell components only (parent page may bind desktop thread APIs). */
const ZONE_AND_SHELL_PATHS = P131_6_DASHBOARD_SOURCE_PATHS.filter((p) => p !== HOME_PAGE_PATH);

const FORBIDDEN_INFERENCE_SUBSTRINGS = [
	'urgent',
	'priority',
	'important',
	"you're all caught up",
	'nothing to do'
] as const;

describe('P131.6-05 Command Center guardrails (no-inference copy)', () => {
	it('dashboard + Command Center copy sources omit disallowed interpretive phrases', () => {
		const combined = readSources([
			...P131_6_DASHBOARD_SOURCE_PATHS,
			P131_COMMAND_CENTER_COPY_PATH
		]).toLowerCase();
		for (const phrase of FORBIDDEN_INFERENCE_SUBSTRINGS) {
			expect(combined).not.toContain(phrase.toLowerCase());
		}
	});

	it('error copy remains standardized (OccErrorBlock contract strings)', () => {
		const errPath = P131_6_DASHBOARD_SOURCE_PATHS.find((p) => p.endsWith('OccErrorBlock.svelte'))!;
		const errSrc = readFileSync(errPath, 'utf8');
		expect(errSrc).toContain("$i18n.t('Unable to load data.')");
		expect(errSrc).toContain("$i18n.t('Please try again.')");
	});

	it('empty-state titles use factual No … phrasing via i18n.t', () => {
		const zoneSrc = readSources(ZONE_AND_SHELL_PATHS);
		const emptyTitleCalls = zoneSrc.match(/\$i18n\.t\(\s*'No [^']+'\s*\)/g) ?? [];
		expect(emptyTitleCalls.length).toBeGreaterThan(0);
		for (const call of emptyTitleCalls) {
			const inner = call.match(/\$i18n\.t\(\s*'([^']+)'\s*\)/)?.[1] ?? '';
			expect(inner.startsWith('No ')).toBe(true);
			expect(inner.endsWith('.')).toBe(true);
		}
	});
});

describe('P131.6-05 Command Center guardrails (read-only zone components)', () => {
	it('zone/shell Svelte files only use type-only Case Engine imports when referencing caseEngine', () => {
		for (const p of ZONE_AND_SHELL_PATHS) {
			if (!p.endsWith('.svelte')) continue;
			const src = readFileSync(p, 'utf8');
			if (!src.includes("$lib/apis/caseEngine'") && !src.includes('$lib/apis/caseEngine"')) continue;
			expect(src).toMatch(/import\s+type\s+\{[^}]+\}\s+from\s+['"]\$lib\/apis\/caseEngine['"]/);
		}
	});

	it('home +page load paths use read list endpoints only (listCases, listPersonalThreadAssociations)', () => {
		const page = readFileSync(HOME_PAGE_PATH, 'utf8');
		expect(page).toMatch(/await\s+listCases\(/);
		expect(page).toMatch(/await\s+listPersonalThreadAssociations\(/);
		expect(page).not.toMatch(/\b(deleteCase|updateCase|commitProposal|createProposal|softDelete)\b/);
	});

	it('OperatorCommandCenterFrame has no data mutation hooks (no onMount, no caseEngine API)', () => {
		const framePath = P131_6_DASHBOARD_SOURCE_PATHS.find((p) =>
			p.endsWith('OperatorCommandCenterFrame.svelte')
		)!;
		const src = readFileSync(framePath, 'utf8');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
		expect(src).not.toMatch(/\bonMount\b/);
		expect(src).not.toMatch(/\bfetch\b/);
	});

	it('Command Center route panel does not import Case Engine APIs directly', () => {
		const src = readFileSync(COMMAND_CENTER_ROUTE_PANEL_PATH, 'utf8');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
	});

	it('dashboard sources do not add polling loops', () => {
		const src = readSources(P131_6_DASHBOARD_SOURCE_PATHS);
		expect(src).not.toMatch(/\bsetInterval\s*\(/);
		expect(src).not.toMatch(/\bwhile\s*\(\s*true\s*\)/);
	});

	it('home +page onMount triggers each loader at most once (no duplicate load calls in onMount)', () => {
		const page = readFileSync(HOME_PAGE_PATH, 'utf8');
		const onMountBlock = page.match(/onMount\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)/s);
		expect(onMountBlock).toBeTruthy();
		const body = onMountBlock![0];
		expect(body).toMatch(/loadThreads\s*\(\s*\)/);
		expect(body).toMatch(/loadCases\s*\(\s*\)/);
		expect(body.split(/loadCases\s*\(\s*\)/).length - 1).toBe(1);
		expect(body.split(/loadThreads\s*\(\s*\)/).length - 1).toBe(1);
	});

	it('retry handlers for summary metrics re-fetch via loadCases + loadThreads only', () => {
		const page = readFileSync(HOME_PAGE_PATH, 'utf8');
		expect(page).toContain('function retrySummaryLoads()');
		expect(page).toMatch(/void\s+loadCases\s*\(\s*\)/);
		expect(page).toMatch(/void\s+loadThreads\s*\(\s*\)/);
	});

	it('OccStateContainer exposes stable state selector for contract tests', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('OccStateContainer.svelte'))!;
		const src = readFileSync(p, 'utf8');
		expect(src).toContain('data-testid="occ-state-container"');
	});
});
