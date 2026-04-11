/**
 * P71-04 — Primary case navigation (P70-05): Tier L tab link hooks + `data-case-tab`.
 * P82-01 — Left rail in `CaseWorkspaceNav.svelte` (replaces horizontal `ce-l-tab-strip` in layout).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const navPath = join(__dirname, '../components/case/CaseWorkspaceNav.svelte');
const layoutSource = readFileSync(layoutPath, 'utf8');
const navSource = readFileSync(navPath, 'utf8');

describe('case primary navigation (P71-04 / P70-05) — P82 left rail', () => {
	it('embeds CaseWorkspaceNav from the case layout', () => {
		expect(layoutSource).toContain('CaseWorkspaceNav');
		expect(layoutSource).toContain('CaseWorkspaceShell');
	});

	it('uses Tier L tab link classes and landmark nav on the left rail', () => {
		expect(navSource).toContain('ce-l-tab-link');
		expect(navSource).toContain('ce-l-tab-link--active');
		expect(navSource).toContain('data-testid="case-workspace-nav"');
		expect(navSource).toContain('aria-label="Case sections"');
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

	it('routes primary destinations via primaryHref to /case/[id]/[section]', () => {
		expect(navSource).toContain('primaryHref(caseId, item.id)');
		expect(navSource).toContain('return `/case/${id}/${sectionId}`');
	});

	it('keeps CaseWorkspaceHeader (identity surface) before CaseWorkspaceNav in template', () => {
		const afterScript = layoutSource.indexOf('</script>');
		const tmpl = layoutSource.slice(afterScript + 1);
		expect(tmpl.indexOf('<CaseWorkspaceHeader')).toBeLessThan(tmpl.indexOf('<CaseWorkspaceNav'));
	});
});
