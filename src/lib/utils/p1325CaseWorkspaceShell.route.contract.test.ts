/**
 * P132.5-01 / P132.5-02 — Case `/case/[id]` layout wires the three-zone shell without pulling new backend concerns.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const shellCmpPath = join(__dirname, '../components/case/CaseWorkspaceLayoutShell.svelte');
const leftStackPath = join(__dirname, '../components/case/CaseWorkspaceLeftPanelStack.svelte');

describe('P132.5 case workspace shell route wiring', () => {
	it('embeds CaseWorkspaceLayoutShell with header before shell body and preserves case-shell-body canvas (no left rail)', () => {
		const src = readFileSync(layoutPath, 'utf8');
		const stackSrc = readFileSync(leftStackPath, 'utf8');
		expect(src).toContain('CaseWorkspaceLayoutShell');
		expect(src).toContain('CaseWorkspaceShellPanel');
		expect(src).not.toContain('CaseWorkspaceLeftPanelStack');
		expect(stackSrc).toContain('CaseWorkspaceCaseSidebar');
		const tmpl = src.slice(src.indexOf('</script>'));
		expect(tmpl.indexOf('<CaseWorkspaceHeader')).toBeLessThan(tmpl.indexOf('<CaseWorkspaceLayoutShell'));
		expect(tmpl.indexOf('<CaseWorkspaceLayoutShell')).toBeLessThan(tmpl.indexOf("'case-shell-body'"));
		const shellSrc = readFileSync(shellCmpPath, 'utf8');
		expect(shellSrc).toMatch(/data-testid="case-workspace-layout-shell"/);
		expect(shellSrc).not.toMatch(/data-testid="case-workspace-shell-left"/);
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

	it('P132.5-02 — wraps Timeline in primary panel with delegated scroll (no new API imports)', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).toContain("activeSection === 'timeline'");
		expect(src).toContain('case-workspace-shell-timeline-panel');
		expect(src).toContain('delegateBodyScroll={true}');
		expect(src).toContain('P1325_SHELL_TIMELINE_PANEL_TITLE');
	});

	it('P132.5-04 — left stack component remains for embedded use; route layout does not mount the left rail', () => {
		const src = readFileSync(layoutPath, 'utf8');
		const stackSrc = readFileSync(leftStackPath, 'utf8');
		expect(src).not.toContain('CaseWorkspaceLeftPanelStack');
		expect(src).not.toContain('P1325_LEFT_STACK_PANEL_TITLE');
		expect(stackSrc).toMatch(/data-testid="p1325-left-stack--case-context"/);
		expect(stackSrc).toMatch(/data-testid="p1325-left-stack--entities-wrap"/);
		expect(stackSrc).toMatch(/data-testid="p1325-left-stack--workflow-wrap"/);
		expect(stackSrc).toMatch(/data-testid="p1325-left-stack--nav-secondary"/);
	});

	it('P132.5-03 — right rail uses Activity/Tools stack (no route navigation)', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).toContain('CaseWorkspaceRightPanelStack');
		expect(src).toContain('P1325_RIGHT_STACK_PANEL_TITLE');
		expect(src).toContain('slot="right"');
		const rightIdx = src.indexOf('slot="right"');
		expect(rightIdx).toBeGreaterThan(-1);
		const afterRight = src.slice(rightIdx, rightIdx + 800);
		expect(afterRight).toContain('delegateBodyScroll={true}');
		expect(afterRight).toContain('CaseWorkspaceRightPanelStack');
	});
});
