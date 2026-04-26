/**
 * P125-05 — Files boundary: static copy; framing surfaces distinct; no taboo product vocabulary in additions.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const boundaryCopy = join(__dirname, 'p125FilesBoundaryCopy.ts');
const tabPath = join(__dirname, '../components/case/CaseFilesTab.svelte');
const filesFraming = join(__dirname, '../components/case/CaseFilesEvidenceFraming.svelte');
const timelineFraming = join(__dirname, '../components/case/CaseTimelineAuthorityFraming.svelte');
const notesFraming = join(__dirname, '../components/case/CaseNotesDraftFraming.svelte');
const separationCopy = join(__dirname, 'p124SurfaceSeparationCopy.ts');

describe('P125-05 Files boundary enforcement', () => {
	it('boundary copy module is static only', () => {
		const src = readFileSync(boundaryCopy, 'utf8');
		expect(src).toMatch(/P125_FILES_BOUNDARY_DISCIPLINE_LINE/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('CaseFilesTab does not duplicate P125 boundary under upload (hero + nav carry framing)', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).not.toMatch(/case-files-boundary-discipline/);
		expect(src).not.toMatch(/P125_FILES_BOUNDARY_DISCIPLINE_LINE/);
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('Files framing stays success-toned; Timeline neutral; Notes chrome hero (no ds-status blend)', () => {
		const files = readFileSync(filesFraming, 'utf8');
		const tl = readFileSync(timelineFraming, 'utf8');
		const nt = readFileSync(notesFraming, 'utf8');
		expect(files).toMatch(/DS_STATUS_SURFACE_CLASSES\.success/);
		expect(tl).toMatch(/DS_STATUS_SURFACE_CLASSES\.neutral/);
		expect(nt).toMatch(/ce-l-notes-hero/);
		expect(files).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.neutral/);
		expect(files).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.info/);
	});

	it('P124 nav hints name four distinct surface roles including Files as supporting-only and Entities as explicit', () => {
		const src = readFileSync(separationCopy, 'utf8');
		expect(src).toMatch(/P124_NAV_TITLE_FILES/);
		expect(src.toLowerCase()).toMatch(/supporting evidence/);
		expect(src.toLowerCase()).toMatch(/files are supporting/);
		expect(src.toLowerCase()).toMatch(/entities surface/);
	});

	it('no ranking/relevance/marketing vocabulary in P125 boundary additions', () => {
		const src = readFileSync(boundaryCopy, 'utf8').toLowerCase();
		const tab = readFileSync(tabPath, 'utf8').toLowerCase();
		const combined = `${src}\n${tab}`;
		expect(combined).not.toMatch(/\branking\b/);
		expect(combined).not.toMatch(/\brelevance\b/);
		expect(combined).not.toMatch(/\bconfidence\b/);
		expect(combined).not.toMatch(/\bbest match\b/);
	});
});
