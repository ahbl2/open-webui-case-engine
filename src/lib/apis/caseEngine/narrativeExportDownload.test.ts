/**
 * P36-03 — Saved narrative export client uses default HTML path; optional format query.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const indexPath = join(dirname(fileURLToPath(import.meta.url)), 'index.ts');

describe('downloadNarrativeRecordExport (P36-03 / P36-05)', () => {
	it('builds export URL via URLSearchParams: default HTML has no query; format + ack when set', () => {
		const src = readFileSync(indexPath, 'utf8');
		const fnStart = src.indexOf('export async function downloadNarrativeRecordExport');
		expect(fnStart).toBeGreaterThan(-1);
		const slice = src.slice(fnStart, fnStart + 1400);
		expect(slice).toMatch(/new URLSearchParams/);
		expect(slice).toMatch(/acknowledge_export_warning/);
		expect(slice).toMatch(/params\.set\('format', fmt\)/);
	});
});
