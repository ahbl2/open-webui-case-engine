/**
 * P103-03 — CaseFilesTab wires P103 file citation navigation + optional span.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const tabPath = join(here, 'CaseFilesTab.svelte');

describe('CaseFilesTab.svelte (P103-03 file citation navigation)', () => {
	const src = readFileSync(tabPath, 'utf8');

	it('consumes p103 file intent, span validation, and reveal sequence', () => {
		expect(src).toContain('p103CitationNavigationIntent');
		expect(src).toContain('isP103FileNavigationIntent');
		expect(src).toContain('runRevealSequenceForP103Files');
		expect(src).toContain('validateP103TextSpanAgainstExtractedText');
		expect(src).toContain('viewTextSpanRange');
		expect(src).toContain('case-file-extracted-text-span-mark');
		expect(src).toContain('p103-files-span-invalid');
		expect(src).toContain('p103-files-span-unavailable');
	});
});
