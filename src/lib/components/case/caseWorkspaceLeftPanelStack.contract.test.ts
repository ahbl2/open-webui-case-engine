/**
 * P132.5-04 — Left support rail: context + entities + workflow + demoted nav (composition only).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stackPath = join(__dirname, 'CaseWorkspaceLeftPanelStack.svelte');
const layoutPath = join(__dirname, '../../../routes/(app)/case/[id]/+layout.svelte');

describe('CaseWorkspaceLeftPanelStack P132.5-04', () => {
	it('stacks case context, entities, workflow, and demoted nav in deterministic order', () => {
		const src = readFileSync(stackPath, 'utf8');
		const ctx = src.indexOf('data-testid="p1325-left-stack--case-context"');
		const ent = src.indexOf('data-testid="p1325-left-stack--entities-wrap"');
		const wf = src.indexOf('data-testid="p1325-left-stack--workflow-wrap"');
		const nav = src.indexOf('data-testid="p1325-left-stack--nav-secondary"');
		expect(ctx).toBeGreaterThan(-1);
		expect(ent).toBeGreaterThan(-1);
		expect(wf).toBeGreaterThan(-1);
		expect(nav).toBeGreaterThan(-1);
		expect(ctx).toBeLessThan(ent);
		expect(ent).toBeLessThan(wf);
		expect(wf).toBeLessThan(nav);
	});

	it('embeds compact entity + workflow panels and demoted sidebar (no case list)', () => {
		const src = readFileSync(stackPath, 'utf8');
		expect(src).toContain('CaseEntitiesPanel');
		expect(src).toContain('compactRail={true}');
		expect(src).toContain('CaseCaseWorkflowItemsPanel');
		expect(src).toContain('railCompact={true}');
		expect(src).toContain('CaseWorkspaceCaseSidebar');
		expect(src).toContain('showCaseList={false}');
		expect(src).toContain('layoutVariant="embedded"');
	});

	it('does not import Case Engine APIs in the stack file (composition boundary)', () => {
		const src = readFileSync(stackPath, 'utf8');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine\b/);
	});

	it('does not add AI or governance-only imports', () => {
		const src = readFileSync(stackPath, 'utf8');
		expect(src).not.toMatch(/\$lib\/.*\b(ai|governance)\b/i);
	});

	it('case layout wires the stack with title constant (no direct sidebar in layout)', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).toContain('CaseWorkspaceLeftPanelStack');
		expect(src).toContain('P1325_LEFT_STACK_PANEL_TITLE');
		expect(src).not.toContain('<CaseWorkspaceCaseSidebar');
	});
});
