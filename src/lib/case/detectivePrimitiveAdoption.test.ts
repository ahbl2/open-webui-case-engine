/**
 * P74-10 — Contract: DS CSS stack in `app.css` matches adoption boundary (drift prevention).
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
const appCssPath = join(__dirname, '../../app.css');
const appCss = readFileSync(appCssPath, 'utf8');

describe('detectivePrimitiveAdoption (P74-10)', () => {
	it('exports a stable primitive layer version', () => {
		expect(DETECTIVE_PRIMITIVE_LAYER_VERSION).toBe(3);
	});

	it('app.css imports DS style layers in DETECTIVE_DS_STYLE_IMPORT_ORDER', () => {
		let lastIdx = -1;
		for (const file of DETECTIVE_DS_STYLE_IMPORT_ORDER) {
			const needle = `@import "./lib/styles/${file}"`;
			expect(appCss).toContain(needle);
			const idx = appCss.indexOf(needle);
			expect(idx).toBeGreaterThan(lastIdx);
			lastIdx = idx;
		}
	});

	it('Tier L follows DS Ask integrity in app.css (migration coexistence anchor)', () => {
		const askIdx = appCss.indexOf('detectiveAskIntegrity.css');
		const tierLIdx = appCss.indexOf('caseWorkspaceTierL.css');
		expect(askIdx).toBeGreaterThan(-1);
		expect(tierLIdx).toBeGreaterThan(askIdx);
	});
});
