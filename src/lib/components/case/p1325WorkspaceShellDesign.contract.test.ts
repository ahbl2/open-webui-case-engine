/**
 * P132.5-05 — Workspace shell design tokens: DS class map + detectiveSurfaces.css hooks.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const foundationPath = join(__dirname, '../../case/detectivePrimitiveFoundation.ts');
const surfacesPath = join(__dirname, '../../styles/detectiveSurfaces.css');

describe('P132.5-05 workspace shell design system', () => {
	it('exports DS_WORKSPACE_SHELL_CLASSES aligned with ds-p1325-* CSS hooks', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		const ts = readFileSync(foundationPath, 'utf8');
		expect(ts).toMatch(/DS_WORKSPACE_SHELL_CLASSES/);
		expect(ts).toMatch(/layoutCenter:\s*'ds-p1325-layout-center'/);
		expect(ts).toMatch(/shellPanel:\s*'ds-p1325-shell-panel'/);
		expect(css).toMatch(/\.ds-p1325-layout-center\b/);
		expect(css).toMatch(/\.ds-p1325-shell-panel\b/);
		expect(css).toMatch(/\.ds-p1325-right-stack-tablist\b/);
	});

	it('CaseWorkspaceShellPanel wires DS_WORKSPACE_SHELL_CLASSES (no new data logic)', () => {
		const src = readFileSync(join(__dirname, 'CaseWorkspaceShellPanel.svelte'), 'utf8');
		expect(src).toMatch(/DS_WORKSPACE_SHELL_CLASSES/);
		expect(src).toMatch(/\.shellPanel/);
	});

	it('CaseWorkspaceLayoutShell applies layout center + rail classes', () => {
		const src = readFileSync(join(__dirname, 'CaseWorkspaceLayoutShell.svelte'), 'utf8');
		expect(src).toMatch(/layoutCenter/);
		expect(src).toMatch(/layoutRail/);
	});
});
