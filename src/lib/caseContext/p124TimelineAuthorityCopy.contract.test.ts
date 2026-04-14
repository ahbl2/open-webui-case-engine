/**
 * P124-01 — Timeline authority copy is static exports only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const p = join(dirname(fileURLToPath(import.meta.url)), 'p124TimelineAuthorityCopy.ts');

describe('p124TimelineAuthorityCopy', () => {
	it('exports title and body strings only', () => {
		const src = readFileSync(p, 'utf8');
		expect(src).toMatch(/export const P124_TIMELINE_SURFACE_TITLE/);
		expect(src).toMatch(/export const P124_TIMELINE_AUTHORITY_BODY/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});
});
