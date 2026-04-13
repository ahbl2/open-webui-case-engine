/**
 * P101-04 / P101-05 — Source-level guardrails (no runtime AI / no Case Engine).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, '../components/case/CaseAiProposalDraftPanel.svelte');
const apiPath = join(here, '../apis/caseEngine/caseProposalsApi.ts');
const tasksPagePath = join(here, '../../routes/(app)/case/[id]/tasks/+page.svelte');
const timelinePagePath = join(here, '../../routes/(app)/case/[id]/timeline/+page.svelte');

describe('P101-04 / P101-05 guardrails (source)', () => {
	it('CaseAiProposalDraftPanel uses Case Engine proposal create only', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('createCaseProposalManual');
		expect(src).toContain('$lib/apis/caseEngine/caseProposalsApi');
		expect(src).not.toMatch(/proposal_records/);
		expect(src).not.toMatch(/\/cases\/\$\{[^}]+\}\/entries/);
		expect(src).not.toMatch(/case-tasks/);
	});

	it('caseProposalsApi targets POST /cases/:id/case-proposals', () => {
		const src = readFileSync(apiPath, 'utf8');
		expect(src).toContain('/case-proposals');
		expect(src).toContain("creation_mode: 'manual'");
	});

	it('tasks and timeline pages wire draft panel with case id + token (no cross-case)', () => {
		const t = readFileSync(tasksPagePath, 'utf8');
		expect(t).toContain('CaseAiProposalDraftPanel');
		expect(t).toContain('caseEngineToken');
		expect(t).toContain('caseId');
		const tl = readFileSync(timelinePagePath, 'utf8');
		expect(tl).toContain('CaseAiProposalDraftPanel');
		expect(tl).toContain('caseEngineToken');
		expect(tl).toContain('caseId');
	});

	it('draft logic module does not reference storage as authority', () => {
		const src = readFileSync(join(here, 'p101AiCaseProposalDraft.ts'), 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
	});
});
