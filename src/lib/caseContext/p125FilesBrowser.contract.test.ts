/**
 * P125-02 — Case file browser: explicit metadata labels; deterministic list; no ranking vocabulary in copy.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p125FilesBrowserCopy.ts');
const tabPath = join(__dirname, '../components/case/CaseFilesTab.svelte');

describe('P125-02 Case file browser', () => {
	it('copy module exports static strings only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/export const P125_FILES_LABEL_TYPE/);
		expect(src).toMatch(/export const P125_FILES_LABEL_UPLOADED/);
		expect(src).toMatch(/export const P125_FILES_LABEL_SIZE/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\bAI\b/i);
	});

	it('CaseFilesTab uses P125 labels and row metadata test ids; forbids $page.params.id', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toMatch(/P125_FILES_LABEL_TYPE/);
		expect(src).toMatch(/case-file-row-metadata/);
		expect(src).toMatch(/case-file-row-name/);
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/extBadgeExtractable/);
	});

	it('copy and tab do not add ranking / relevance vocabulary', () => {
		const copy = readFileSync(copyPath, 'utf8');
		const tab = readFileSync(tabPath, 'utf8');
		const combined = `${copy}\n${tab}`.toLowerCase();
		expect(combined).not.toMatch(/\branking\b/);
		expect(combined).not.toMatch(/\brelevance\b/);
		expect(combined).not.toMatch(/\bpriorit/);
	});
});
