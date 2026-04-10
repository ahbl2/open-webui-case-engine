/**
 * P74-02 — DS token CSS contract (parity with detectiveDesignTokens.css).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DS_VARS } from './detectiveDesignTokens';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(__dirname, '../styles/detectiveDesignTokens.css');
const dsCss = readFileSync(cssPath, 'utf8');

describe('detectiveDesignTokens (P74-02)', () => {
	it('defines every exported DS_VARS entry in detectiveDesignTokens.css', () => {
		for (const v of Object.values(DS_VARS)) {
			expect(dsCss).toContain(v);
		}
	});

	it('declares html and html.dark blocks for light/dark parity', () => {
		expect(dsCss).toMatch(/^html\s*\{/m);
		expect(dsCss).toMatch(/^html\.dark\s*\{/m);
	});

	it('lists semantic status tokens for P73-03 / P74-03+ consumption', () => {
		expect(dsCss).toContain('--ds-status-success-bg');
		expect(dsCss).toContain('--ds-status-warning-bg');
		expect(dsCss).toContain('--ds-status-danger-bg');
		expect(dsCss).toContain('--ds-status-info-bg');
	});
});
