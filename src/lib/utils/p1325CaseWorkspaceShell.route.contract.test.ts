/**
 * P132.5-01 — Case `/case/[id]` layout wires the three-zone shell without pulling new backend concerns.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const shellCmpPath = join(__dirname, '../components/case/CaseWorkspaceLayoutShell.svelte');

describe('P132.5-01 case workspace shell route wiring', () => {
	it('embeds CaseWorkspaceLayoutShell with header before sidebar and preserves case-shell-body canvas', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).toContain('CaseWorkspaceLayoutShell');
		expect(src).toContain('CaseWorkspaceShellPanel');
		expect(src).toContain('CaseWorkspaceCaseSidebar');
		const tmpl = src.slice(src.indexOf('</script>'));
		expect(tmpl.indexOf('<CaseWorkspaceHeader')).toBeLessThan(tmpl.indexOf('<CaseWorkspaceCaseSidebar'));
		expect(tmpl.indexOf('<CaseWorkspaceCaseSidebar')).toBeLessThan(tmpl.indexOf("'case-shell-body'"));
		const shellSrc = readFileSync(shellCmpPath, 'utf8');
		expect(shellSrc).toMatch(/data-testid="case-workspace-layout-shell"/);
		expect(shellSrc).toMatch(/data-testid="case-workspace-shell-left"/);
		expect(shellSrc).toMatch(/data-testid="case-workspace-shell-center"/);
		expect(shellSrc).toMatch(/data-testid="case-workspace-shell-right"/);
	});

	it('does not add AI or governance-only imports for the shell', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).not.toMatch(/\$lib\/.*\b(ai|governance)\b/i);
	});

	it('keeps a single case-workspace-shell root frame', () => {
		const src = readFileSync(layoutPath, 'utf8');
		const n = (src.match(/data-testid="case-workspace-shell"/g) ?? []).length;
		expect(n).toBe(1);
	});
});
