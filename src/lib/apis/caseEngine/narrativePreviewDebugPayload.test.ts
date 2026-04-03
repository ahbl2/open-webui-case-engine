/**
 * P37 — Rejected AI narrative debug on preview response only; never on save/export.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const indexPath = join(dirname(fileURLToPath(import.meta.url)), 'index.ts');

describe('postNarrativePreview debug payload (P37)', () => {
	it('parses optional debug with strict rejectedAiReasonType and code/label reasons', () => {
		const src = readFileSync(indexPath, 'utf8');
		expect(src).toMatch(/parseNarrativePreviewDebugPayload/);
		expect(src).toMatch(/parseRejectedAiReasonEntries/);
		expect(src).toMatch(/meaning_drift/);
		expect(src).toMatch(/context_loss/);
		expect(src).toMatch(/payload\.debug = debugParsed/);
		expect(src).toMatch(/\[narrative-debug api\]/);
		expect(src).toMatch(/rec\.code/);
		expect(src).toMatch(/rec\.label/);
	});

	it('postNarrativeRecord save path does not reference preview debug fields', () => {
		const src = readFileSync(indexPath, 'utf8');
		const saveStart = src.indexOf('export async function postNarrativeRecord');
		expect(saveStart).toBeGreaterThan(-1);
		const saveSlice = src.slice(saveStart, saveStart + 2200);
		expect(saveSlice).not.toMatch(/rejectedAi/);
		expect(saveSlice).not.toMatch(/debug/);
	});
});
