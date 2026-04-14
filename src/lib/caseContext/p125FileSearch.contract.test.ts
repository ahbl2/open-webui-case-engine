/**
 * P125-04 — Case-scoped search: static copy; wiring to CaseFilesTab; forbidden “relevance” product vocabulary.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p125FileSearchCopy.ts');
const tabPath = join(__dirname, '../components/case/CaseFilesTab.svelte');

describe('P125-04 case file search', () => {
	it('copy module is static exports only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P125_FILE_SEARCH_ACTIVE_FRAMING/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('CaseFilesTab wires search framing and open-view; forbids $page.params.id', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toMatch(/case-files-search-source-framing/);
		expect(src).toMatch(/case-file-row-open-view/);
		expect(src).toMatch(/loadExtractedTextIntoModal/);
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('avoid interpretive / marketing-style search vocabulary in P125 additions', () => {
		const copy = readFileSync(copyPath, 'utf8');
		const tab = readFileSync(tabPath, 'utf8');
		const combined = `${copy}\n${tab}`.toLowerCase();
		expect(combined).not.toMatch(/\bbest match\b/);
		expect(combined).not.toMatch(/\brelevant\b/);
		expect(combined).not.toMatch(/\bconfidence\b/);
		expect(combined).not.toMatch(/\branking\b/);
	});
});
