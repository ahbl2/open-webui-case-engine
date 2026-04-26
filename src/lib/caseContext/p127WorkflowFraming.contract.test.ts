/**
 * P127-01 — Workflow operational framing: static copy; distinct DS tone; no page store leakage.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p127WorkflowFramingCopy.ts');
const framingPath = join(__dirname, '../components/case/CaseWorkflowFraming.svelte');
const workflowHeroPath = join(__dirname, '../components/case/CaseWorkflowWorkspaceHero.svelte');
const workflowPage = join(__dirname, '../../routes/(app)/case/[id]/workflow/+page.svelte');
const timelineFraming = join(__dirname, '../components/case/CaseTimelineAuthorityFraming.svelte');
const notesFraming = join(__dirname, '../components/case/CaseNotesDraftFraming.svelte');
const filesFraming = join(__dirname, '../components/case/CaseFilesEvidenceFraming.svelte');
const entitiesFraming = join(__dirname, '../components/case/CaseEntitiesFraming.svelte');
const workflowTabPath = join(__dirname, '../components/case/CaseWorkflowTab.svelte');

describe('P127-01 Workflow operational framing', () => {
	it('copy module is static string exports only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/export const P127_WORKFLOW_SURFACE_TITLE/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});

	it('CaseWorkflowFraming is presentational (no page store)', () => {
		const src = readFileSync(framingPath, 'utf8');
		expect(src).toMatch(/CaseWorkflowWorkspaceHero/);
		expect(src).not.toMatch(/\$page/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('CaseWorkflowWorkspaceHero is Tier L elevated (test id + border tokens)', () => {
		const src = readFileSync(workflowHeroPath, 'utf8');
		expect(src).toMatch(/ce-l-surface-elevated/);
		expect(src).toMatch(/data-testid=\{omitDataTestId/);
	});

	it('Workflow framing avoids Timeline/Notes/Files/Entities ds-status surfaces (operational hero; Tier L elevated)', () => {
		const wf = readFileSync(framingPath, 'utf8');
		expect(wf).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.neutral/);
		expect(wf).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.info/);
		expect(wf).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.success/);
		expect(wf).not.toMatch(/DS_STATUS_SURFACE_CLASSES\.warning/);
		expect(wf).toMatch(/CaseWorkflowWorkspaceHero/);
	});

	it('Workflow framing tone is distinct from Timeline, Notes, Files, Entities', () => {
		const tl = readFileSync(timelineFraming, 'utf8');
		const nt = readFileSync(notesFraming, 'utf8');
		const fi = readFileSync(filesFraming, 'utf8');
		const ent = readFileSync(entitiesFraming, 'utf8');
		expect(tl).toMatch(/DS_STATUS_SURFACE_CLASSES\.neutral/);
		expect(nt).toMatch(/ce-l-notes-hero/);
		expect(fi).toMatch(/DS_STATUS_SURFACE_CLASSES\.success/);
		expect(ent).toMatch(/DS_STATUS_SURFACE_CLASSES\.warning/);
	});

	it('workflow route uses getRouteCaseIdString; no $page.params.id; tab carries Tier L hero', () => {
		const src = readFileSync(workflowPage, 'utf8');
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).toContain('<CaseWorkflowTab');
		expect(src).not.toContain('<CaseWorkflowFraming');
		const tabPath = join(__dirname, '../components/case/CaseWorkflowTab.svelte');
		const tab = readFileSync(tabPath, 'utf8');
		expect(tab).toMatch(/WORKFLOW_DASH_TITLE|Operational Tracking/);
		expect(tab).toMatch(/data-testid="workflow-page-header"/);
	});

	it('P127 copy avoids taboo product vocabulary', () => {
		const src = readFileSync(copyPath, 'utf8').toLowerCase();
		expect(src).not.toMatch(/\bimportant\b/);
		expect(src).not.toMatch(/\bpriority\b/);
		expect(src).not.toMatch(/\bsuggested\b/);
		expect(src).not.toMatch(/\brecommended\b/);
		expect(src).not.toMatch(/\bdetected\b/);
	});

	it('CaseWorkflowTab imports empty-state manual line from P127 copy', () => {
		const src = readFileSync(workflowTabPath, 'utf8');
		expect(src).toMatch(/p127WorkflowFramingCopy/);
		expect(src).toMatch(/P127_WORKFLOW_EMPTY_MANUAL_CREATION_LINE/);
		expect(src).toMatch(/workflow-items-empty-p127-manual-only/);
	});
});
