/**
 * P87-03 — Contextual entry points to Tasks: navigation-only (<a href>), no counts, no task state.
 * P87-05 — Cross-surface read-layer label/title consistency (header, Timeline, nav, panel).
 * P91-06 — Guardrails: canonical Tasks-vs-Timeline wording; no drift; no Timeline integration affordances.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const headerPath = join(here, '../components/case/CaseWorkspaceHeader.svelte');
const timelinePath = join(here, '../../routes/(app)/case/[id]/timeline/+page.svelte');
const navPath = join(here, '../components/case/CaseWorkspaceNav.svelte');
const panelPath = join(here, '../components/case/CaseTasksPanel.svelte');

const CANONICAL_TASKS_TOOLTIP = 'Operational tasks — not part of the official Timeline';

describe('P87-03 CaseWorkspaceHeader — tasks entry (navigation only)', () => {
	it('exposes Tasks (Operational) link with href to /case/:id/tasks', () => {
		const src = readFileSync(headerPath, 'utf8');
		expect(src).toContain('P87-03');
		expect(src).toMatch(/data-testid="case-workspace-header-tasks-link"/);
		expect(src).toMatch(/href=\{`\/case\/\$\{caseId\}\/tasks`\}/);
		expect(src).toContain('Tasks (Operational)');
		expect(src).toContain('DS_BTN_CLASSES');
	});

	it('does not use fetch, storage, or app stores (header remains layout-only)', () => {
		const src = readFileSync(headerPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
		expect(src).not.toMatch(/from ['"]\$lib\/stores['"]/);
	});

	it('does not imply task counts or numeric task badges in the entry markup', () => {
		const src = readFileSync(headerPath, 'utf8');
		expect(src).not.toMatch(/tasks['"]?\s*[,}]\s*label:\s*['"][^'"]*\d/);
		const tasksLinkIdx = src.indexOf('case-workspace-header-tasks-link');
		expect(tasksLinkIdx).toBeGreaterThan(-1);
		const snippet = src.slice(tasksLinkIdx, tasksLinkIdx + 400);
		expect(snippet).not.toMatch(/\d+\s+tasks/i);
		expect(snippet).not.toMatch(/tabular-nums/);
	});
});

describe('P87-03 Timeline page — tasks entry (navigation only)', () => {
	it('exposes Open Tasks (Operational) anchor with DS_WORKFLOW embed nav classes', () => {
		const src = readFileSync(timelinePath, 'utf8');
		expect(src).toContain('P87-03');
		expect(src).toMatch(/data-testid="case-timeline-open-tasks-operational"/);
		expect(src).toMatch(/href=\{`\/case\/\$\{caseId\}\/tasks`\}/);
		expect(src).toContain('Open Tasks (Operational)');
		expect(src).toContain('DS_WORKFLOW_CLASSES.embedNavLink');
		expect(src).toContain('DS_WORKFLOW_CLASSES.embedNavLinkCompact');
	});

	it('uses <a href> for tasks entry — not goto() to tasks route', () => {
		const src = readFileSync(timelinePath, 'utf8');
		expect(src).not.toMatch(/goto\s*\(\s*[`'"][^`'"]*\/tasks/);
	});

	it('tasks entry snippet has no count-based task text', () => {
		const src = readFileSync(timelinePath, 'utf8');
		const idx = src.indexOf('case-timeline-open-tasks-operational');
		expect(idx).toBeGreaterThan(-1);
		const snippet = src.slice(idx, idx + 500);
		expect(snippet).not.toMatch(/\d+\s+tasks/i);
		expect(snippet).not.toMatch(/tabular-nums/);
	});
});

describe('P87-05 Cross-surface Tasks read-layer consistency', () => {
	it('uses the same canonical tooltip on header link, Timeline link, and Tasks panel badge', () => {
		const header = readFileSync(headerPath, 'utf8');
		const timeline = readFileSync(timelinePath, 'utf8');
		const panel = readFileSync(panelPath, 'utf8');
		expect(header).toContain(`title="${CANONICAL_TASKS_TOOLTIP}"`);
		expect(timeline).toContain(`title="${CANONICAL_TASKS_TOOLTIP}"`);
		expect(panel).toContain(`title="${CANONICAL_TASKS_TOOLTIP}"`);
	});

	it('uses Tasks (Operational) for global header link and left-rail nav label', () => {
		const header = readFileSync(headerPath, 'utf8');
		const nav = readFileSync(navPath, 'utf8');
		expect(header).toContain('P87-05');
		expect(nav).toContain('P87-05');
		expect(header).toContain('Tasks (Operational)');
		expect(nav).toContain("{ id: 'tasks', label: 'Tasks (Operational)' }");
	});

	it('uses Open Tasks (Operational) for Timeline contextual entry (distinct from global label)', () => {
		const timeline = readFileSync(timelinePath, 'utf8');
		expect(timeline).toContain('P87-05');
		expect(timeline).toContain('Open Tasks (Operational)');
	});

	it('keeps Tasks panel section hint baseline and forbids durability wording in panel source', () => {
		const panel = readFileSync(panelPath, 'utf8');
		expect(panel).toContain('P87-05');
		expect(panel).toMatch(/Operational · Not part of Timeline/);
		expect(panel).not.toMatch(/\b(saved|recorded|logged|stored)\b/i);
	});

	it('header and nav sources remain free of fetch, storage, and store barrel imports', () => {
		for (const p of [headerPath, navPath]) {
			const src = readFileSync(p, 'utf8');
			expect(src).not.toMatch(/\bfetch\s*\(/);
			expect(src).not.toMatch(/localStorage/);
			expect(src).not.toMatch(/sessionStorage/);
			expect(src).not.toMatch(/from ['"]\$lib\/stores['"]/);
		}
	});
});

describe('P91-06 Cross-surface Tasks vs Timeline guardrails', () => {
	it('Tasks panel forbids Timeline logging or promotion phrasing (regression lock)', () => {
		const panel = readFileSync(panelPath, 'utf8');
		expect(panel).not.toMatch(/\blog (this )?task to (the )?timeline/i);
		expect(panel).not.toMatch(/promote (this )?task to (the )?timeline/i);
		expect(panel).not.toMatch(/convert (this )?task to (a )?timeline entry/i);
		expect(panel).not.toMatch(/\boccurred_at\b/);
	});
});
