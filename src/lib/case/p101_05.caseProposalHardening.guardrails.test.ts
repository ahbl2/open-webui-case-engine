/**
 * P101-05 — Cross-surface consistency and case-boundary guardrails (source-level).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, '../components/case/CaseAiProposalDraftPanel.svelte');
const copyPath = join(here, 'p101ProposalUiCopy.ts');
const draftPath = join(here, 'p101AiCaseProposalDraft.ts');

describe('P101-05 proposal hardening (source)', () => {
	it('CaseAiProposalDraftPanel uses shared copy and strict source_refs validation', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('p101ProposalUiCopy');
		expect(src).toContain('parseAndValidateSourceRefsJson');
		expect(src).toContain('capturedCaseId');
		expect(src).toContain('ERR_CASE_CHANGED');
		expect(src).toContain('setProposalType');
		expect(src).toContain('data-case-id');
	});

	it('shared copy module exposes consistent proposal doctrine strings', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toContain('P101_PANEL_EYEBROW');
		expect(src).toContain('P101_PROPOSAL_DOCTRINE');
		expect(src).toMatch(/not yet an official record/i);
	});

	it('draft helpers expose P101-05 source ref kinds and validators', () => {
		const src = readFileSync(draftPath, 'utf8');
		expect(src).toContain('P101_SOURCE_REF_KINDS');
		expect(src).toContain('validateSourceRefsStructure');
		expect(src).toContain('parseAndValidateSourceRefsJson');
	});

	it('panel still only creates proposals via Case Engine case-proposals endpoint', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('createCaseProposalManual');
		expect(src).not.toMatch(/\/case-tasks\b/);
		expect(src).not.toMatch(/\/entries\b/);
		expect(src).not.toMatch(/proposal_records/);
	});
});
