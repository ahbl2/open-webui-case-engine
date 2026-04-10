/**
 * P71-FU1 / P71-FU2 / P71-FU3 / P71-FU6 — Shared case workspace scroll chain: bounded flex height + inner overflow-y scroll ports.
 * P71-FU2: case shell fills app main pane (`flex-1 min-h-0`) instead of viewport `h-screen`, which broke nested scroll.
 * P71-FU3: no `h-full` on `case-workspace-main` or `CaseWorkspaceContentRegion` — percentage height on flex items
 *          conflicts with `flex: 1 1 0%` / `min-h-0` and leaves primary scroll ports without a definite height.
 * P71-FU6: `.ce-l-content-region` flex column contract (unlayered CSS + Tailwind on wrapper) so route scrollports are bounded.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const layoutSource = readFileSync(layoutPath, 'utf8');
const appLayoutPath = join(__dirname, '../../routes/(app)/+layout.svelte');
const appLayoutSource = readFileSync(appLayoutPath, 'utf8');
const contentRegionPath = join(__dirname, '../components/case/CaseWorkspaceContentRegion.svelte');
const contentRegionSource = readFileSync(contentRegionPath, 'utf8');
const cssPath = join(__dirname, '../styles/caseWorkspaceTierL.css');
const tierLCss = readFileSync(cssPath, 'utf8');

describe('case workspace shell scroll chain (P71-FU1 / P71-FU2 / P71-FU3 / P71-FU6)', () => {
	it('keeps case-workspace-main in the flex + bounded-height contract (no h-full — P71-FU3)', () => {
		expect(layoutSource).toContain('data-testid="case-workspace-main"');
		const mainIdx = layoutSource.indexOf('data-testid="case-workspace-main"');
		const before = layoutSource.slice(Math.max(0, mainIdx - 220), mainIdx);
		expect(before).toMatch(/flex-1/);
		expect(before).toMatch(/min-h-0/);
		expect(before).not.toMatch(/h-full/);
		expect(before).toMatch(/overflow-hidden/);
	});

	it('uses CaseWorkspaceContentRegion with Tier L region + flex column + min-h-0 (no h-full — P71-FU3 / P71-FU6)', () => {
		expect(contentRegionSource).toContain('ce-l-content-region');
		expect(contentRegionSource).not.toMatch(/ce-l-content-region h-full/);
		expect(contentRegionSource).toMatch(/flex flex-col flex-1/);
		expect(contentRegionSource).toMatch(/min-h-0/);
	});

	it('declares flex column + overflow clipping on .ce-l-content-region (P71-FU6)', () => {
		const blockIdx = tierLCss.indexOf('.ce-l-content-region {\n');
		expect(blockIdx).toBeGreaterThan(-1);
		const block = tierLCss.slice(blockIdx, blockIdx + 480);
		expect(block).toMatch(/display:\s*flex/);
		expect(block).toMatch(/flex-direction:\s*column/);
		expect(block).toMatch(/overflow:\s*hidden/);
	});

	it('P71-FU2: case-workspace-shell fills the app main flex column (not raw h-screen)', () => {
		const shellIdx = layoutSource.indexOf('data-testid="case-workspace-shell"');
		expect(shellIdx).toBeGreaterThan(-1);
		// P76-02+: root uses `caseShellRootClass` (`ds-case-shell` or legacy Tailwind flex chain) — flex lives in CSS / binding, not adjacent to test id.
		expect(layoutSource).toMatch(/caseShellRootClass/);
		expect(layoutSource).not.toMatch(/data-testid="case-workspace-shell"[^>]*h-screen/);
	});

	it('P71-FU2: (app) main content slot participates in height chain (h-full + min-h-0)', () => {
		const paneIdx = appLayoutSource.indexOf('data-testid="app-main-content-pane"');
		expect(paneIdx).toBeGreaterThan(-1);
		const beforePane = appLayoutSource.slice(Math.max(0, paneIdx - 400), paneIdx + 80);
		expect(beforePane).toMatch(/flex-1/);
		expect(beforePane).toMatch(/min-h-0/);
		expect(beforePane).toMatch(/h-full/);
		expect(beforePane).toMatch(/overflow-hidden/);
	});
});
