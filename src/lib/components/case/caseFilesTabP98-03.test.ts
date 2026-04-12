/**
 * P98-03 / P98-05 — CaseFilesTab embeds FilesDeclaredRelationshipsBlock (honest no-op until contract exists).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const tabPath = join(dirname(fileURLToPath(import.meta.url)), 'CaseFilesTab.svelte');
const filesBlockPath = join(dirname(fileURLToPath(import.meta.url)), 'FilesDeclaredRelationshipsBlock.svelte');

describe('CaseFilesTab P98-03', () => {
	it('embeds FilesDeclaredRelationshipsBlock with case id and file id', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toContain("import FilesDeclaredRelationshipsBlock from '$lib/components/case/FilesDeclaredRelationshipsBlock.svelte'");
		expect(src).toMatch(/<FilesDeclaredRelationshipsBlock\s+\{caseId\}\s+fileId=\{f\.id\}\s*\/>/);
	});

	it('FilesDeclaredRelationshipsBlock uses shared region aria constant (P98-05 parity)', () => {
		const block = readFileSync(filesBlockPath, 'utf8');
		expect(block).toContain('P98_DECLARED_RELATIONSHIP_REGION_ARIA');
		expect(block).not.toMatch(/aria-label="Declared same-case connections"/);
	});
});
