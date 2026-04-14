/**
 * P125-01 — Files evidence framing: presentational only; route id via getRouteCaseId.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filesPage = join(__dirname, '../../routes/(app)/case/[id]/files/+page.svelte');
const framingPath = join(__dirname, '../components/case/CaseFilesEvidenceFraming.svelte');
const copyPath = join(__dirname, 'p125FilesEvidenceCopy.ts');
const placeholderPath = join(__dirname, '../components/case/CaseWorkspaceRouteSurfacePlaceholder.svelte');

describe('P125-01 Files evidence framing', () => {
	it('files page mounts evidence framing before file list and forbids $page.params.id', () => {
		const src = readFileSync(filesPage, 'utf8');
		expect(src).toMatch(/CaseFilesEvidenceFraming/);
		const framingIdx = src.indexOf('<CaseFilesEvidenceFraming');
		const scrollIdx = src.indexOf('case-files-primary-scroll');
		expect(framingIdx).toBeGreaterThan(-1);
		expect(scrollIdx).toBeGreaterThan(-1);
		expect(framingIdx).toBeLessThan(scrollIdx);
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).toMatch(/getRouteCaseId/);
	});

	it('CaseFilesEvidenceFraming is presentational only', () => {
		const src = readFileSync(framingPath, 'utf8');
		expect(src).toMatch(/data-testid="case-files-p125-evidence-framing"/);
		expect(src).toMatch(/data-p125-files-evidence/);
		expect(src).toMatch(/DS_STATUS_SURFACE_CLASSES\.success/);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/onMount\b|onDestroy\b/);
	});

	it('copy module avoids authority timeline-equivalent phrasing for Files', () => {
		const pageSrc = readFileSync(filesPage, 'utf8');
		const copySrc = readFileSync(copyPath, 'utf8');
		const combined = `${pageSrc}\n${copySrc}`;
		expect(combined.toLowerCase()).not.toMatch(/official record/);
		expect(combined.toLowerCase()).not.toMatch(/\bauthoritative\b/);
	});

	it('placeholder includes Files evidence framing when surface is Files', () => {
		const src = readFileSync(placeholderPath, 'utf8');
		expect(src).toMatch(/CaseFilesEvidenceFraming/);
		expect(src).toMatch(/P125-01 — Same evidence identity framing/);
	});
});
