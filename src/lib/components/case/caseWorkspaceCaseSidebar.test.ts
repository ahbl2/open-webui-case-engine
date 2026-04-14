/**
 * P123-02 / P123-05 — Case sidebar contract: explicit selection, no auto-pick, server list only, Phase 123 route mappings, nav integrity.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const sidebarPath = join(dirname(fileURLToPath(import.meta.url)), 'CaseWorkspaceCaseSidebar.svelte');

describe('CaseWorkspaceCaseSidebar P123-02', () => {
	it('loads cases via listCasesSidebar only (no parallel list APIs)', () => {
		const src = readFileSync(sidebarPath, 'utf8');
		expect(src).toMatch(/listCasesSidebar/);
		expect(src).toMatch(/getRouteCaseId/);
		expect(src).not.toMatch(/listCases\s*\(/);
		expect(src).not.toMatch(/\/cases\?unit=/);
	});

	it('does not auto-select a case on load (no first-row goto, no default selection)', () => {
		const src = readFileSync(sidebarPath, 'utf8');
		expect(src).not.toMatch(/cases\s*\[\s*0\s*\]/);
		expect(src).not.toMatch(/filteredCases\s*\[\s*0\s*\]/);
		expect(src).not.toMatch(/\.at\s*\(\s*0\s*\)/);
	});

	it('highlights active row from route id only (not store-derived activeCaseId for row chrome)', () => {
		const src = readFileSync(sidebarPath, 'utf8');
		expect(src).toMatch(/routeCaseId/);
		expect(src).toMatch(/c\.id === routeCaseId/);
		expect(src).not.toMatch(/\$activeCaseId/);
	});

	it('uses explicit surface hrefs from p123SurfaceLinks (timeline, notes, files, activity, ai-workspace)', () => {
		const src = readFileSync(sidebarPath, 'utf8');
		expect(src).toMatch(/\/case\/\$\{id\}\/timeline/);
		expect(src).toMatch(/p123SurfaceLinks/);
		expect(src).toMatch(/ai-workspace/);
		expect(src).toMatch(/data-case-tab=\{item\.id\}/);
	});

	it('does not embed remote AI SDKs or completion endpoints in sidebar source', () => {
		const lower = readFileSync(sidebarPath, 'utf8').toLowerCase();
		expect(lower).not.toMatch(/openai|anthropic|\/v1\/chat\/completions/);
		expect(lower).not.toMatch(/\bentity\b/);
		expect(lower).not.toMatch(/\bworkflow\b/);
		expect(lower).not.toMatch(/sort\s*\(/);
	});

	it('P123-05: nav links only with valid route id; no empty-segment hrefs; shared copy + disabled marker', () => {
		const src = readFileSync(sidebarPath, 'utf8');
		expect(src).toMatch(/P123_SIDEBAR_SURFACE_LINKS_UNAVAILABLE/);
		expect(src).toMatch(/data-p123-nav-disabled/);
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/href=\"\/case\/\//);
		expect(src).not.toMatch(/href=\{'\/case\/\/'/);
	});

	it('P124-05: sidebar surface titles + boundary hint (Timeline vs Notes vs Files vs Entities)', () => {
		const src = readFileSync(sidebarPath, 'utf8');
		expect(src).toMatch(/P124_NAV_TITLE_TIMELINE/);
		expect(src).toMatch(/P124_SIDEBAR_SURFACE_BOUNDARY_HINT/);
		expect(src).toMatch(/title=\{item\.navTitle\}/);
		expect(src).toMatch(/case-workspace-p124-boundary-hint/);
	});
});
