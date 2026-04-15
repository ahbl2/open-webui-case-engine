/**
 * P130-05 — Static / pattern guardrails for AI Workspace boundary enforcement.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, '../components/case/AIWorkspacePanel.svelte');
const guardPath = join(here, 'aiWorkspaceGuardrails.ts');
const ingestionPath = join(here, 'caseDataIngestion.ts');
const mapperPath = join(here, 'aiWorkspaceToProposalMapper.ts');

describe('P130-05 AI Workspace boundary (static)', () => {
	it('AIWorkspacePanel only imports Case Engine via caseProposalsApi', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain("$lib/apis/caseEngine/caseProposalsApi");
		const segments = src.split('$lib/apis/caseEngine');
		expect(segments.length - 1).toBe(1);
		expect(src).toContain('caseProposalsApi');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine\/caseEntitiesApi/);
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine\/caseWorkflowItemsApi/);
	});

	it('AIWorkspacePanel has no onMount, timers, or reactive AI execution', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\bonMount\s*\(/);
		expect(src).not.toMatch(/\bsetInterval\s*\(/);
		expect(src).not.toMatch(/\bsetTimeout\s*\(/);
		expect(src).not.toMatch(/\$:[^\n]*runAiSend/);
		expect(src).not.toMatch(/\$:[^\n]*runRetrieval/);
	});

	it('AIWorkspacePanel wires guardrail module', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain("$lib/case/aiWorkspaceGuardrails");
		expect(src).toContain('assertNoMutationAllowed');
		expect(src).toContain('validateAiWorkspaceOutputIntegrity');
	});

	it('aiWorkspaceGuardrails does not call fetch or import case engine clients', () => {
		const src = readFileSync(guardPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
	});

	it('caseDataIngestion is GET-only (no POST/PUT/PATCH/DELETE to Case Engine)', () => {
		const src = readFileSync(ingestionPath, 'utf8');
		expect(src).not.toMatch(/method:\s*['"]POST['"]/i);
		expect(src).not.toMatch(/method:\s*['"]PUT['"]/i);
		expect(src).not.toMatch(/method:\s*['"]PATCH['"]/i);
		expect(src).not.toMatch(/method:\s*['"]DELETE['"]/i);
	});

	it('mapper has no fetch and no timeline mutation paths', () => {
		const src = readFileSync(mapperPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/\/cases\/[^\s"']+\/entries/);
	});

	it('AIWorkspacePanel does not reference timeline/note mutation routes', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\/notebook-notes[^\s"']*['"]?\s*,\s*\{[^}]*method:\s*['"]POST/);
		expect(src).not.toMatch(/\/timeline-entries/);
		expect(src).not.toMatch(/\/case-tasks/);
	});

	it('createCaseProposalManual only after confirmProposalSubmit', () => {
		const src = readFileSync(panelPath, 'utf8');
		const confirmIdx = src.indexOf('async function confirmProposalSubmit');
		const awaitIdx = src.indexOf('await createCaseProposalManual');
		expect(confirmIdx).toBeGreaterThan(-1);
		expect(awaitIdx).toBeGreaterThan(confirmIdx);
	});
});
