/**
 * P123-04 / P123-05 — Timeline / Notes / Files routes + sidebar navigation integrity.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const timelinePath = join(__dirname, '../../routes/(app)/case/[id]/timeline/+page.svelte');
const notesPath = join(__dirname, '../../routes/(app)/case/[id]/notes/+page.svelte');
const filesPath = join(__dirname, '../../routes/(app)/case/[id]/files/+page.svelte');
const placeholderPath = join(__dirname, '../components/case/CaseWorkspaceRouteSurfacePlaceholder.svelte');
const sidebarPath = join(__dirname, '../components/case/CaseWorkspaceCaseSidebar.svelte');

describe('P123-04 case workspace routes (timeline / notes / files)', () => {
	it.each([
		['timeline', timelinePath],
		['notes', notesPath],
		['files', filesPath]
	] as const)('%s page uses getRouteCaseId and forbids $page.params.id', (_name, p) => {
		const src = readFileSync(p, 'utf8');
		expect(src).toMatch(/getRouteCaseId/);
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('placeholder shell has no stores, fetch, or lifecycle hooks', () => {
		const src = readFileSync(placeholderPath, 'utf8');
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/\bfetch\b/);
		expect(src).not.toMatch(/onMount\b/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('sidebar does not emit /case//… hrefs and gates Phase 123 nav on routeCaseId', () => {
		const src = readFileSync(sidebarPath, 'utf8');
		expect(src).toMatch(/\{#if routeCaseId\}/);
		expect(src).not.toMatch(/href=\"\/case\/\//);
		expect(src).toMatch(/data-p123-nav-disabled/);
	});
});
