/**
 * P71-04 — Primary case navigation (P70-05): Tier L tab link hooks + `data-case-tab`.
 * P82-01 — Left rail (historically `CaseWorkspaceNav`; P123-02 — `CaseWorkspaceCaseSidebar`).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const navPath = join(__dirname, '../components/case/CaseWorkspaceCaseSidebar.svelte');
const leftStackPath = join(__dirname, '../components/case/CaseWorkspaceLeftPanelStack.svelte');
const layoutSource = readFileSync(layoutPath, 'utf8');
const navSource = readFileSync(navPath, 'utf8');
const leftStackSource = readFileSync(leftStackPath, 'utf8');

describe('case primary navigation (P71-04 / P70-05) — tab bar + optional left stack component', () => {
	it('embeds CaseWorkspaceCaseNavTabBar and CaseWorkspaceLayoutShell; left stack file still composes CaseWorkspaceCaseSidebar (not mounted in layout)', () => {
		expect(layoutSource).toContain('CaseWorkspaceCaseNavTabBar');
		expect(layoutSource).not.toContain('CaseWorkspaceLeftPanelStack');
		expect(leftStackSource).toContain('CaseWorkspaceCaseSidebar');
		expect(layoutSource).toContain('CaseWorkspaceLayoutShell');
	});

	it('uses Tier L tab link classes and landmark nav on the left rail', () => {
		expect(navSource).toContain('ce-l-tab-link');
		expect(navSource).toContain('ce-l-tab-link--active');
		expect(navSource).toContain('data-testid="case-workspace-nav"');
		expect(navSource).toContain('aria-label="Case workspace sections"');
	});

	it('does not use legacy gray/blue tab utility dialect on links', () => {
		const navIdx = navSource.indexOf('data-testid="case-workspace-nav"');
		const afterNav = navSource.slice(navIdx, navIdx + 3500);
		expect(afterNav).not.toMatch(/border-blue-500/);
		expect(afterNav).not.toMatch(/text-blue-600/);
	});

	it('binds data-case-tab for section hooks', () => {
		expect(navSource).toContain('data-case-tab={item.id}');
	});

	it('routes Phase 123 surface links via explicit href helper to /case/[id]/[section]', () => {
		expect(navSource).toContain('surfaceHref');
		expect(navSource).toContain("return `/case/${caseId}/${section}`");
	});

	it('keeps CaseWorkspaceHeader (identity surface) before CaseWorkspaceCaseNavTabBar in template', () => {
		const afterScript = layoutSource.indexOf('</script>');
		const tmpl = layoutSource.slice(afterScript + 1);
		expect(tmpl.indexOf('<CaseWorkspaceHeader')).toBeLessThan(tmpl.indexOf('<CaseWorkspaceCaseNavTabBar'));
	});
});
