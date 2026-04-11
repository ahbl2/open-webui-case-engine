/**
 * P74-10 — Contract: DS CSS stack in `tailwind.css` matches adoption boundary (drift prevention).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	DETECTIVE_DS_STYLE_IMPORT_ORDER,
	DETECTIVE_PRIMITIVE_LAYER_VERSION
} from './detectivePrimitiveAdoption';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tailwindCssPath = join(__dirname, '../../tailwind.css');
const tailwindCss = readFileSync(tailwindCssPath, 'utf8');

describe('detectivePrimitiveAdoption (P74-10)', () => {
	it('exports a stable primitive layer version', () => {
		expect(DETECTIVE_PRIMITIVE_LAYER_VERSION).toBe(20);
	});

	it('tailwind.css imports DS style layers in DETECTIVE_DS_STYLE_IMPORT_ORDER', () => {
		let lastIdx = -1;
		for (const file of DETECTIVE_DS_STYLE_IMPORT_ORDER) {
			const needle = `@import "./lib/styles/${file}"`;
			expect(tailwindCss).toContain(needle);
			const idx = tailwindCss.indexOf(needle);
			expect(idx).toBeGreaterThan(lastIdx);
			lastIdx = idx;
		}
	});

	it('Tier L follows DS Ask integrity in tailwind.css (migration coexistence anchor)', () => {
		const askIdx = tailwindCss.indexOf('detectiveAskIntegrity.css');
		const tierLIdx = tailwindCss.indexOf('caseWorkspaceTierL.css');
		expect(askIdx).toBeGreaterThan(-1);
		expect(tierLIdx).toBeGreaterThan(askIdx);
	});
});
