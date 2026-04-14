/**
 * P125-01 — Files evidence copy is static exports only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const p = join(dirname(fileURLToPath(import.meta.url)), 'p125FilesEvidenceCopy.ts');

describe('p125FilesEvidenceCopy', () => {
	it('exports title and body strings only', () => {
		const src = readFileSync(p, 'utf8');
		expect(src).toMatch(/export const P125_FILES_SURFACE_TITLE/);
		expect(src).toMatch(/export const P125_FILES_EVIDENCE_BODY/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\bAI\b|ai-assisted/i);
	});
});
