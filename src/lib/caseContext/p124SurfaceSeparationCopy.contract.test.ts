/**
 * P124-05 — p124SurfaceSeparationCopy.ts — string exports only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const p = join(dirname(fileURLToPath(import.meta.url)), 'p124SurfaceSeparationCopy.ts');

describe('p124SurfaceSeparationCopy', () => {
	it('exports navigation boundary strings', () => {
		const src = readFileSync(p, 'utf8');
		expect(src).toMatch(/export const P124_NAV_TITLE_TIMELINE/);
		expect(src).toMatch(/export const P124_SIDEBAR_SURFACE_BOUNDARY_HINT/);
	});
});
