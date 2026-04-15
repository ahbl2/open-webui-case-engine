/**
 * P123-05 — Shared copy module is strings only (no storage, no logic).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const p = join(dirname(fileURLToPath(import.meta.url)), 'p123CaseWorkspaceCopy.ts');

describe('p123CaseWorkspaceCopy', () => {
	it('exports copy constants only (no runtime coupling)', () => {
		const src = readFileSync(p, 'utf8');
		expect(src).toMatch(/export const P123_NO_CASE_ROUTE_BODY/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\bfetch\b/);
	});
});
