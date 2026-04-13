/**
 * P118-05 — Open WebUI navigation integrity closeout: backend-only resolution, no citation route tables in query UI.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, '../components/case/CaseQueryPanel.svelte');
const apiPath = join(here, '../apis/caseEngine/caseNavigationApi.ts');
const navigatePath = join(here, 'p118CitationNavigationNavigate.ts');

describe('P118-05 — OWUI navigation integrity (static)', () => {
	const panel = readFileSync(panelPath, 'utf8');
	const api = readFileSync(apiPath, 'utf8');
	const nav = readFileSync(navigatePath, 'utf8');

	it('CaseQueryPanel does not resolve citations via client-side kind→route logic', () => {
		expect(panel).toContain('postCaseCitationNavigation');
		expect(panel).not.toContain('resolveQueryCitationNavigation');
		expect(panel).not.toMatch(/switch\s*\(\s*c\.kind/);
	});

	it('caseNavigationApi does not embed application path templates', () => {
		expect(api).not.toMatch(/\/case\/\$\{/);
		expect(api).not.toContain('goto(');
	});

	it('navigateFromCitationNavigationResult branches on backend route_key / citation_kind only', () => {
		expect(nav).toContain('route_key');
		expect(nav).toContain('navigateFromCitationNavigationResult');
		expect(nav).not.toMatch(/switch\s*\(\s*citation\.kind/);
	});
});
