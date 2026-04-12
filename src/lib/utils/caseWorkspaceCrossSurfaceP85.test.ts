/**
 * P85-05 — Cross-surface consistency: Case Workspace shell + official-record semantics (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const caseRouteRoot = join(here, '../../routes/(app)/case/[id]');

const CASE_WORKSPACE_PAGES: { rel: string; testId: string }[] = [
	{ rel: 'timeline/+page.svelte', testId: 'case-timeline-page' },
	{ rel: 'summary/+page.svelte', testId: 'case-summary-page' },
	{ rel: 'notes/+page.svelte', testId: 'case-notes-page' },
	{ rel: 'files/+page.svelte', testId: 'case-files-page' },
	{ rel: 'intelligence/+page.svelte', testId: 'case-intelligence-page' },
	{ rel: 'graph/+page.svelte', testId: 'case-graph-page' },
	{ rel: 'intelligence/entity/[type]/[value]/+page.svelte', testId: 'case-intelligence-entity-page' },
	{ rel: 'workflow/+page.svelte', testId: 'case-workflow-page' },
	{ rel: 'proposals/+page.svelte', testId: 'case-proposals-page' },
	{ rel: 'warrants/+page.svelte', testId: 'case-warrants-page' },
	{ rel: 'chat/+page.svelte', testId: 'case-chat-page' },
	{ rel: 'activity/+page.svelte', testId: 'case-activity-page' },
	{ rel: 'tasks/+page.svelte', testId: 'case-tasks-page' }
];

describe('P85-05 case workspace shell (Tier L content region)', () => {
	it('wraps each primary case tab route in CaseWorkspaceContentRegion with a stable testId', () => {
		for (const { rel, testId } of CASE_WORKSPACE_PAGES) {
			const src = readFileSync(join(caseRouteRoot, rel), 'utf8');
			expect(src, rel).toContain('import CaseWorkspaceContentRegion');
			expect(src, rel).toContain(`<CaseWorkspaceContentRegion testId="${testId}">`);
		}
	});
});

describe('P85-05 official record semantics (Timeline vs Notes vs Proposals)', () => {
	it('Timeline route documents timeline_entries as the official committed record', () => {
		const src = readFileSync(join(caseRouteRoot, 'timeline/+page.svelte'), 'utf8');
		expect(src).toMatch(/timeline_entries/);
		expect(src).toMatch(/official case record|official case timeline/i);
		expect(src).toMatch(/working drafts/i);
	});

	it('Notes route documents notebook notes as working drafts, not official records', () => {
		const src = readFileSync(join(caseRouteRoot, 'notes/+page.svelte'), 'utf8');
		expect(src).toMatch(/WORKING DRAFTS/i);
		expect(src).toMatch(/Not official case records/i);
	});

	it('Proposals route distinguishes staging from Timeline and Notes', () => {
		const src = readFileSync(join(caseRouteRoot, 'proposals/+page.svelte'), 'utf8');
		expect(src).toMatch(/proposal_records/);
		expect(src).toMatch(/Timeline/i);
		expect(src).toMatch(/Notes \(drafts\)|Notes remain/i);
		expect(src).toMatch(/official record|Not official until Commit/i);
	});

	it('Tasks route documents operational-only, non-authoritative tasks (not timeline_entries)', () => {
		const src = readFileSync(join(caseRouteRoot, 'tasks/+page.svelte'), 'utf8');
		expect(src).toMatch(/non-authoritative|not `timeline_entries`/i);
		expect(src).toMatch(/timeline_entries/);
	});
});
