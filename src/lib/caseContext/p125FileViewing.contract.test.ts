/**
 * P125-03 — File viewing copy: static strings; extracted label includes “raw”; no storage in copy module.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p125FileViewingCopy.ts');
const tabPath = join(__dirname, '../components/case/CaseFilesTab.svelte');

describe('P125-03 file viewing copy and modal wiring', () => {
	it('copy module exports static strings including raw extracted heading', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/export const P125_FILE_VIEW_EXTRACTED_HEADING/);
		expect(src).toMatch(/Extracted text \(raw\)/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\bAI\b/i);
	});

	it('CaseFilesTab modal uses P125 viewing copy and forbids $page.params.id', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toMatch(/P125_FILE_VIEW_EXTRACTED_HEADING/);
		expect(src).toMatch(/case-file-view-extracted/);
		expect(src).toMatch(/case-file-view-preview/);
		expect(src).toMatch(/fetchCaseFileObjectUrl/);
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/extBadgeExtractable/);
	});

	it('copy avoids authority-style wording for extracted channel', () => {
		const src = readFileSync(copyPath, 'utf8').toLowerCase();
		expect(src).not.toMatch(/\bauthoritative\b/);
		expect(src).not.toMatch(/official record/);
	});
});
