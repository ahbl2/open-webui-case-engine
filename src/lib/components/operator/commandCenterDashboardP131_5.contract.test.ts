/**
 * P131.5-01 — Command Center dashboard grid + card shell (layout only; no data changes).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CommandCenterPanel.svelte');
const cardPath = join(here, 'CommandCenterDashboardCard.svelte');
const metricCardPath = join(here, 'CommandCenterSummaryMetricCard.svelte');

describe('P131.5-01 Command Center dashboard shell', () => {
	it('CommandCenterDashboardCard is presentational only', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\b/);
		expect(src).not.toMatch(/\$lib\/apis\//);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/\bgoto\b/);
		expect(src).not.toMatch(/\bonMount\b/);
		expect(src).toMatch(/data-p131-5-dashboard-card/);
	});

	it('CommandCenterPanel uses CSS grid with side-by-side spans on large screens', () => {
		const src = readFileSync(panelPath, 'utf8');
		const metricSrc = readFileSync(metricCardPath, 'utf8');
		expect(src).toMatch(/grid-cols-1/);
		expect(src).toMatch(/lg:grid-cols-12/);
		expect(src).toMatch(/lg:col-span-8/);
		expect(src).toMatch(/lg:col-span-4/);
		expect(src).toMatch(/lg:col-span-12/);
		expect(metricSrc).toMatch(/lg:col-span-3/);
		expect(src).not.toMatch(/flex\s+min-h-0\s+flex-1\s+flex-col\s+gap-3/);
	});

	it('panel does not add Case Engine API imports', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
	});
});
