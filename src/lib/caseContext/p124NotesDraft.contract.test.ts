/**
 * P124-04 — Notes draft identity: presentation-only; route id via getRouteCaseId.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const notesPage = join(__dirname, '../../routes/(app)/case/[id]/notes/+page.svelte');
const framingPath = join(__dirname, '../components/case/CaseNotesDraftFraming.svelte');
const copyPath = join(__dirname, 'p124NotesDraftCopy.ts');
const placeholderPath = join(__dirname, '../components/case/CaseWorkspaceRouteSurfacePlaceholder.svelte');

describe('P124-04 Notes draft identity', () => {
	it('notes page mounts draft framing and forbids $page.params.id', () => {
		const src = readFileSync(notesPage, 'utf8');
		expect(src).toMatch(/CaseNotesDraftFraming/);
		expect(src).toMatch(/ce-l-notes-shell/);
		const framingIdx = src.indexOf('<CaseNotesDraftFraming');
		const arrivalIdx = src.indexOf('case-notes-p99-arrival');
		expect(framingIdx).toBeGreaterThan(-1);
		expect(arrivalIdx).toBeGreaterThan(-1);
		expect(framingIdx).toBeLessThan(arrivalIdx);
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).toMatch(/getRouteCaseId/);
	});

	it('CaseNotesDraftFraming is presentational only', () => {
		const src = readFileSync(framingPath, 'utf8');
		expect(src).toMatch(/data-testid="case-notes-p124-draft-framing"/);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/onMount\b/);
	});

	it('draft copy module exports static strings', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P124_NOTES_SURFACE_TITLE/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('placeholder includes Notes draft framing when surface is Notes', () => {
		const src = readFileSync(placeholderPath, 'utf8');
		expect(src).toMatch(/surface === 'Notes'/);
		expect(src).toMatch(/CaseNotesDraftFraming/);
	});
});
