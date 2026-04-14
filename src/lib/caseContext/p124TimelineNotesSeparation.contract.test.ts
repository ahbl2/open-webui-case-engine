/**
 * P124-05 — Timeline vs Notes: distinct framing surfaces and copy modules (static contracts).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const timelineFraming = join(__dirname, '../components/case/CaseTimelineAuthorityFraming.svelte');
const notesFraming = join(__dirname, '../components/case/CaseNotesDraftFraming.svelte');
const notesCopy = join(__dirname, 'p124NotesDraftCopy.ts');
const timelineCopy = join(__dirname, 'p124TimelineAuthorityCopy.ts');
const separationCopy = join(__dirname, 'p124SurfaceSeparationCopy.ts');

describe('P124-05 Timeline vs Notes separation', () => {
	it('Timeline framing uses neutral DS surface; Notes framing uses info (not neutral authority)', () => {
		const tl = readFileSync(timelineFraming, 'utf8');
		const nt = readFileSync(notesFraming, 'utf8');
		expect(tl).toMatch(/DS_STATUS_SURFACE_CLASSES\.neutral/);
		expect(tl).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.info/);
		expect(nt).toMatch(/DS_STATUS_SURFACE_CLASSES\.info/);
		expect(nt).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.neutral/);
	});

	it('Notes draft copy module does not claim authority or official record', () => {
		const src = readFileSync(notesCopy, 'utf8');
		const lower = src.toLowerCase();
		expect(lower).not.toMatch(/\bauthoritative\b/);
		expect(lower).not.toMatch(/\bofficial case record\b/);
	});

	it('Timeline authority copy names Notes as drafts (separation), not as equivalent', () => {
		const src = readFileSync(timelineCopy, 'utf8');
		expect(src).toMatch(/P124_TIMELINE_AUTHORITY_BODY/);
		expect(src.toLowerCase()).toMatch(/notes \(working drafts\)/);
	});

	it('Surface separation copy is static and names distinct roles', () => {
		const src = readFileSync(separationCopy, 'utf8');
		expect(src).toMatch(/P124_NAV_TITLE_TIMELINE/);
		expect(src).toMatch(/P124_NAV_TITLE_NOTES/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src.toLowerCase()).not.toMatch(/\bunified\b|\bmerged feed\b/);
	});
});
