/**
 * P126-01 — Entities surface framing: static copy; warning-toned surface distinct from Timeline/Notes/Files.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p126EntityFramingCopy.ts');
const boundaryDisciplineCopyPath = join(__dirname, 'p126EntitiesBoundaryCopy.ts');
const framingPath = join(__dirname, '../components/case/CaseEntitiesFraming.svelte');
const entitiesListPage = join(__dirname, '../../routes/(app)/case/[id]/entities/+page.svelte');
const entitiesDetailPage = join(__dirname, '../../routes/(app)/case/[id]/entities/[entityId]/+page.svelte');
const filesFraming = join(__dirname, '../components/case/CaseFilesEvidenceFraming.svelte');
const timelineFraming = join(__dirname, '../components/case/CaseTimelineAuthorityFraming.svelte');
const notesFraming = join(__dirname, '../components/case/CaseNotesDraftFraming.svelte');

describe('P126-01 Entity surface framing', () => {
	it('copy module is static string exports only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/export const P126_ENTITIES_SURFACE_TITLE/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});

	it('CaseEntitiesFraming is presentational (no page store)', () => {
		const src = readFileSync(framingPath, 'utf8');
		expect(src).toMatch(/data-testid="case-entities-p126-structured-framing"/);
		expect(src).not.toMatch(/\$page/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('P126-05: boundary discipline copy is mounted on framing (always visible on list + detail)', () => {
		const src = readFileSync(framingPath, 'utf8');
		expect(src).toMatch(/data-testid="case-entities-boundary-discipline"/);
		expect(src).toMatch(/P126_ENTITIES_BOUNDARY_DISCIPLINE_LINE/);
		const boundary = readFileSync(boundaryDisciplineCopyPath, 'utf8');
		expect(boundary).toMatch(/export const P126_ENTITIES_BOUNDARY_DISCIPLINE_LINE/);
	});

	it('Entities framing uses warning; Timeline neutral; Notes chrome hero; Files success (distinct tones)', () => {
		const ent = readFileSync(framingPath, 'utf8');
		const files = readFileSync(filesFraming, 'utf8');
		const tl = readFileSync(timelineFraming, 'utf8');
		const nt = readFileSync(notesFraming, 'utf8');
		expect(ent).toMatch(/DS_STATUS_SURFACE_CLASSES\.warning/);
		expect(files).toMatch(/DS_STATUS_SURFACE_CLASSES\.success/);
		expect(tl).toMatch(/DS_STATUS_SURFACE_CLASSES\.neutral/);
		expect(nt).toMatch(/ce-l-notes-hero/);
		expect(ent).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.success/);
		expect(ent).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.neutral/);
		expect(ent).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.info/);
	});

	it('entities list and detail routes mount CaseEntitiesFraming before panel content', () => {
		const list = readFileSync(entitiesListPage, 'utf8');
		const detail = readFileSync(entitiesDetailPage, 'utf8');
		expect(list).toMatch(/CaseEntitiesFraming/);
		expect(detail).toMatch(/CaseEntitiesFraming/);
		const idxFraming = list.indexOf('CaseEntitiesFraming');
		const idxPanel = list.indexOf('CaseEntitiesPanel');
		expect(idxFraming).toBeGreaterThan(-1);
		expect(idxPanel).toBeGreaterThan(idxFraming);
	});

	it('P126 copy avoids interpretive / extraction product vocabulary', () => {
		const src = readFileSync(copyPath, 'utf8').toLowerCase();
		expect(src).not.toMatch(/\bdetected\b/);
		expect(src).not.toMatch(/\bfound\b/);
		expect(src).not.toMatch(/\bidentified\b/);
		expect(src).not.toMatch(/\bmatched\b/);
		expect(src).not.toMatch(/\bauthoritative\b/);
		expect(src).not.toMatch(/official record/);
	});
});
