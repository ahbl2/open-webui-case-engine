/**
 * P131.6-05 — Home OCC Command Center accessibility structure (source-level).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { P131_6_DASHBOARD_SOURCE_PATHS } from './commandCenterP131_6.sourcePaths';

function readAllDashboardSources(): string {
	return P131_6_DASHBOARD_SOURCE_PATHS.map((path) => readFileSync(path, 'utf8')).join('\n');
}

const HOME_PAGE = P131_6_DASHBOARD_SOURCE_PATHS.find((p) => p.endsWith('/home/+page.svelte'))!;

function collectHtmlIds(src: string): string[] {
	const ids: string[] = [];
	const re = /\bid\s*=\s*"([^"]+)"/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(src)) !== null) {
		ids.push(m[1]);
	}
	return ids;
}

describe('P131.6-05 a11y — landmarks and hero heading', () => {
	it('OperatorCommandCenterFrame exposes labeled main landmark', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('OperatorCommandCenterFrame.svelte'))!;
		const src = readFileSync(p, 'utf8');
		expect(src).toContain('<main');
		expect(src).toContain('id="occ-command-center-main"');
		expect(src).toContain('aria-labelledby="occ-home-hero-heading"');
	});

	it('home +page renders exactly one h1 with stable id for hero labeling', () => {
		const page = readFileSync(HOME_PAGE, 'utf8');
		const wave2 = page.match(/\{#if\s+wave2ShellChrome\}([\s\S]*?)\{:\s*else\}/)?.[1] ?? '';
		expect(wave2).toContain('<h1 id="occ-home-hero-heading"');
		expect((wave2.match(/<h1\b/g) ?? []).length).toBe(1);
	});

	it('dashboard grid sections use aria-labelledby with matching heading ids', () => {
		const framePath = P131_6_DASHBOARD_SOURCE_PATHS.find((f) =>
			f.endsWith('OperatorCommandCenterFrame.svelte')
		)!;
		const frame = readFileSync(framePath, 'utf8');
		expect(frame).toMatch(/aria-labelledby="occ-dashboard-summary-heading"/);
		expect(frame).toMatch(/id="occ-dashboard-summary-heading"/);
		expect(frame).toMatch(/aria-labelledby="occ-col-left-heading"/);
		expect(frame).toMatch(/id="occ-col-left-heading"/);
	});
});

describe('P131.6-05 a11y — OccStateContainer roles', () => {
	it('maps error to role alert and loading/empty to role status', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('OccStateContainer.svelte'))!;
		const src = readFileSync(p, 'utf8');
		expect(src).toMatch(
			/\$:\s*roleValue\s*=\s*errorActive\s*\?\s*'alert'\s*:\s*isLoading\s*\|\|\s*isEmpty\s*\?\s*'status'\s*:\s*undefined/
		);
	});
});

describe('P131.6-05 a11y — skeletons are hidden from accessibility tree', () => {
	it('skeleton components set aria-hidden on their roots', () => {
		for (const name of ['OccSkeletonTileRow.svelte', 'OccSkeletonList.svelte', 'OccSkeletonFeed.svelte']) {
			const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith(name))!;
			const src = readFileSync(p, 'utf8');
			expect(src).toContain('aria-hidden="true"');
		}
	});
});

describe('P131.6-05 a11y — stable heading ids (no duplicates in dashboard sources)', () => {
	it('does not reuse the same id attribute value twice across scanned dashboard files', () => {
		const combined = P131_6_DASHBOARD_SOURCE_PATHS.map((path) => readFileSync(path, 'utf8')).join('\n');
		const ids = collectHtmlIds(combined);
		const counts = new Map<string, number>();
		for (const id of ids) {
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		const dupes = [...counts.entries()].filter(([, n]) => n > 1);
		expect(dupes).toEqual([]);
	});
});

describe('P131.6-05 a11y — Retry controls are distinguishable', () => {
	it('OccErrorBlock passes aria-label through to the retry button', () => {
		const p = P131_6_DASHBOARD_SOURCE_PATHS.find((f) => f.endsWith('OccErrorBlock.svelte'))!;
		const src = readFileSync(p, 'utf8');
		expect(src).toContain('aria-label={retryAriaLabel || undefined}');
		expect(src).toContain('data-testid="occ-error-retry"');
	});

	it('home OCC surfaces use distinct retry aria-label i18n strings', () => {
		const combined = readAllDashboardSources();
		const direct = [...combined.matchAll(/retryAriaLabel=\{\$i18n\.t\(\s*'([^']+)'\s*\)\}/g)].map(
			(m) => m[1]
		);
		const defaulted = [
			...combined.matchAll(
				/retryAriaLabel=\{[^}]*\|\|\s*\$i18n\.t\(\s*'([^']+)'\s*\)\}/g
			)
		].map((m) => m[1]);
		const labels = [...direct, ...defaulted];
		expect(labels.length).toBeGreaterThan(1);
		// OccRailIntel defaults match the label passed from OccHomeCenterColumn — same string may appear twice in source.
		const unique = new Set(labels);
		expect(unique.size).toBeGreaterThanOrEqual(6);
		expect(labels.length - unique.size).toBeLessThanOrEqual(1);
	});
});
