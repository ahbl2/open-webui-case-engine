/**
 * P86-05 — Cross-surface visibility: Tasks route + resolution (source contract).
 * P91-06 — Nav guardrail comment: Tasks operational-only vs Timeline.
 * P123-02 — Phase 123 left rail is minimal; Tasks is not in the primary rail (route remains canonical).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { resolveActiveCaseSection } from './caseNavSection';

const here = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(here, '../../routes/(app)/case/[id]/+layout.svelte');
const tasksPagePath = join(here, '../../routes/(app)/case/[id]/tasks/+page.svelte');

describe('P86-05 Case Workspace Tasks visibility', () => {
	it('P123-02: case layout uses CaseWorkspaceLeftPanelStack embedding CaseWorkspaceCaseSidebar; Tasks route remains available', () => {
		const layout = readFileSync(layoutPath, 'utf8');
		const stackPath = join(here, '../components/case/CaseWorkspaceLeftPanelStack.svelte');
		const stack = readFileSync(stackPath, 'utf8');
		expect(layout).toContain('CaseWorkspaceLeftPanelStack');
		expect(stack).toContain('CaseWorkspaceCaseSidebar');
		expect(layout).not.toContain('CaseWorkspaceNav');
	});

	it('resolves /case/:id/tasks to active section tasks for nav highlighting when that route is used', () => {
		expect(resolveActiveCaseSection('/case/abc123/tasks')).toBe('tasks');
	});

	it('tasks route uses Tier L content region; panel handles Case Engine (P89-07)', () => {
		const src = readFileSync(tasksPagePath, 'utf8');
		expect(src).toContain('CaseWorkspaceContentRegion');
		expect(src).toContain('testId="case-tasks-page"');
		expect(src).toContain('P89-07');
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
	});
});
