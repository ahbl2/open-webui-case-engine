/**
 * P130-04 — Source-level guardrails: AI Workspace proposal path uses case-proposals only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, '../components/case/AIWorkspacePanel.svelte');
const proposalClientPath = join(here, 'aiWorkspaceCaseProposalClient.ts');

describe('P130-04 AI Workspace proposal guardrails (source)', () => {
	it('AIWorkspacePanel uses the manual proposal client only (no timeline entry POST)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const client = readFileSync(proposalClientPath, 'utf8');
		expect(src).toContain("from '$lib/case/aiWorkspaceCaseProposalClient'");
		expect(client).toContain('createCaseProposalManual');
		expect(client).toContain('$lib/apis/caseEngine/caseProposalsApi');
		expect(src).toContain("proposal_type: 'timeline_entry'");
		expect(src).toContain("creation_mode: 'manual'");
		expect(src).not.toMatch(/\/cases\/[^\s"']+\/entries/);
		expect(src).not.toMatch(/\/timeline-entries/);
		expect(src).not.toMatch(/proposal_records/);
	});

	it('await submitManualCaseProposal appears only after confirmProposalSubmit (explicit handler)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const confirmIdx = src.indexOf('async function confirmProposalSubmit');
		const awaitIdx = src.indexOf('await submitManualCaseProposal');
		expect(confirmIdx).toBeGreaterThan(-1);
		expect(awaitIdx).toBeGreaterThan(-1);
		expect(awaitIdx > confirmIdx).toBe(true);
	});

	it('Create Proposal Draft button is gated by readyForProposalReview', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('disabled={!readyForProposalReview');
		expect(src).toContain('case-ai-workspace-proposal-create-button');
	});

	it('mapper module has no fetch or timeline routes', () => {
		const mapperPath = join(here, 'aiWorkspaceToProposalMapper.ts');
		const src = readFileSync(mapperPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/\/entries/);
	});
});
