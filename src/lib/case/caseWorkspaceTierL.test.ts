/**
 * P71-02 — Tier L token layer: CSS contract + exported variable names stay aligned.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CE_L_VARS } from './caseWorkspaceTierL';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(__dirname, '../styles/caseWorkspaceTierL.css');
const tierLCss = readFileSync(cssPath, 'utf8');

describe('caseWorkspaceTierL (P71-02)', () => {
	it('defines every exported CE_L_VARS entry in caseWorkspaceTierL.css', () => {
		for (const v of Object.values(CE_L_VARS)) {
			expect(tierLCss).toContain(v);
		}
	});

	it('declares html and html.dark Tier L surfaces for light/dark parity', () => {
		expect(tierLCss).toMatch(/^html\s*\{/m);
		expect(tierLCss).toMatch(/^html\.dark\s*\{/m);
	});

	it('includes shared component hooks for empty shell and content region', () => {
		expect(tierLCss).toContain('.ce-l-empty-framed');
		expect(tierLCss).toContain('.ce-l-content-region');
		expect(tierLCss).toContain('.ce-l-error-retry-link');
	});

	it('clips .ce-l-content-region as flex column (P71-FU1 / P71-FU6 nested scroll contract)', () => {
		const idx = tierLCss.indexOf('.ce-l-content-region {\n');
		expect(idx).toBeGreaterThan(-1);
		const block = tierLCss.slice(idx, idx + 480);
		expect(block).toMatch(/display:\s*flex/);
		expect(block).toMatch(/flex-direction:\s*column/);
		expect(block).toMatch(/overflow:\s*hidden/);
	});

	it('includes P71-03 identity bar primitives', () => {
		expect(tierLCss).toContain('.ce-l-identity-bar');
		expect(tierLCss).toContain('.ce-l-identity-back');
		expect(tierLCss).toContain('.ce-l-identity-edit');
		expect(tierLCss).toContain('.ce-l-identity-meta-chip');
	});

	it('includes P71-04 primary tab strip primitives and tab tokens', () => {
		expect(tierLCss).toContain('--ce-l-tab-active-border');
		expect(tierLCss).toContain('.ce-l-tab-strip');
		expect(tierLCss).toContain('.ce-l-tab-link--active');
		expect(tierLCss).toContain('overflow-x: auto');
	});

	it('includes P71-05 Timeline tab shell primitives (P70-06 S1 scroll discipline)', () => {
		expect(tierLCss).toContain('.ce-l-timeline-shell');
		expect(tierLCss).toContain('.ce-l-timeline-hero');
		expect(tierLCss).toContain('.ce-l-timeline-primary-scroll');
		expect(tierLCss).toContain('overflow-y: auto');
	});

	it('includes P71-06 Files tab shell primitives (P70-06 S1 operational list)', () => {
		expect(tierLCss).toContain('.ce-l-files-shell');
		expect(tierLCss).toContain('.ce-l-files-hero');
		expect(tierLCss).toContain('.ce-l-files-primary-scroll');
	});

	it('includes P71-07 Proposals tab shell primitives (P70-06 W1; panel-internal scroll)', () => {
		expect(tierLCss).toContain('.ce-l-proposals-shell');
		expect(tierLCss).toContain('.ce-l-proposals-hero');
		expect(tierLCss).toContain('.ce-l-proposals-workspace');
	});

	it('includes P71-08 Activity tab shell primitives (P70-06 S1 list scroll)', () => {
		expect(tierLCss).toContain('.ce-l-activity-shell');
		expect(tierLCss).toContain('.ce-l-activity-hero');
		expect(tierLCss).toContain('.ce-l-activity-primary-scroll');
	});

	it('includes P71-09 Intelligence route shell primitives (P70-06 W3 + secondary nav demotion hooks)', () => {
		expect(tierLCss).toContain('.ce-l-intelligence-shell');
		expect(tierLCss).toContain('.ce-l-intelligence-primary-scroll');
		expect(tierLCss).toContain('.ce-l-intelligence-segmented');
	});
});

