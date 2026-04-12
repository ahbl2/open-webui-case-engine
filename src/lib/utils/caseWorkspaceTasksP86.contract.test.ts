/**
 * P86-05 — Cross-surface visibility: Tasks in Case Workspace nav + routing (source contract).
 * P91-06 — Nav guardrail comment: Tasks operational-only vs Timeline.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { resolveActiveCaseSection } from './caseNavSection';

const here = dirname(fileURLToPath(import.meta.url));
const navPath = join(here, '../components/case/CaseWorkspaceNav.svelte');
const tasksPagePath = join(here, '../../routes/(app)/case/[id]/tasks/+page.svelte');

describe('P86-05 Case Workspace Tasks visibility', () => {
	it('includes Tasks in left rail with stable label (no count — avoids cross-component state)', () => {
		const nav = readFileSync(navPath, 'utf8');
		expect(nav).toContain("{ id: 'tasks', label: 'Tasks (Operational)' }");
		expect(nav).toContain('P86-05 / P87-05: Tasks — operational-only and non-authoritative');
		expect(nav).toContain('P87-05');
		expect(nav).toContain('P91-06');
		expect(nav).toContain('P86-05: Order is intentional');
		expect(nav).toContain('primaryHref(caseId, item.id)');
		expect(nav).toContain('data-case-tab={item.id}');
		expect(nav).not.toMatch(/label:\s*'Tasks\s*\(\d+\)'/);
	});

	it('resolves /case/:id/tasks to active section tasks for nav highlighting', () => {
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
