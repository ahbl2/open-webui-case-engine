/**
 * P130-01 / P130-02 — AI Workspace framing + read-only ingestion wiring (no direct fetch in panel).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p130AIWorkspaceCopy.ts');
const panelPath = join(__dirname, '../components/case/AIWorkspacePanel.svelte');
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/ai-workspace/+page.svelte');

function assertP130Taboo(lower: string): void {
	expect(lower).not.toMatch(/\bpriorit/);
	expect(lower).not.toMatch(/\brank\b/);
	expect(lower).not.toMatch(/\bscore\b/);
	expect(lower).not.toMatch(/\bbest\b/);
	expect(lower).not.toMatch(/\banalyze\b/);
	expect(lower).not.toMatch(/\brecommend\b/);
	expect(lower).not.toMatch(/\binsight\b/);
}

describe('p130AIWorkspaceCopy (P130-01)', () => {
	it('is static exports only; taboo-free', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P130_AI_WORKSPACE_SURFACE_TITLE/);
		expect(src).toMatch(/P130_NAV_TITLE_AI_WORKSPACE/);
		expect(src).toMatch(/P130_AI_WORKSPACE_DATA_USED_SECTION_TITLE/);
		assertP130Taboo(src.toLowerCase());
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});

	it('labels AI output as non-authoritative (not authoritative)', () => {
		const lower = readFileSync(copyPath, 'utf8').toLowerCase();
		expect(lower).toMatch(/non-authoritative/);
		expect(lower).not.toMatch(/\bai output is the authoritative\b/);
		expect(lower).not.toMatch(/\bai is the authoritative record\b/);
	});
});

describe('AIWorkspacePanel.svelte (P130-01 / P130-02)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('uses ingestion helper + token store; no direct Case Engine API or fetch', () => {
		expect(src).toContain("$lib/case/caseDataIngestion");
		expect(src).toContain('caseEngineToken');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/onMount\b/);
	});

	it('does not issue HTTP mutations from this surface', () => {
		expect(src).not.toMatch(/method:\s*['"]POST['"]/i);
		expect(src).not.toMatch(/method:\s*['"]PUT['"]/i);
		expect(src).not.toMatch(/method:\s*['"]DELETE['"]/i);
	});

	it('exposes required test ids and framing markers', () => {
		expect(src).toContain('data-testid="case-ai-workspace-panel"');
		expect(src).toContain('data-testid="case-ai-workspace-framing"');
		expect(src).toContain('data-testid="case-ai-workspace-case-context"');
		expect(src).toContain('data-testid="case-ai-workspace-session-framing"');
		expect(src).toContain('data-testid="case-ai-workspace-prompt-input"');
		expect(src).toContain('data-testid="case-ai-workspace-output-placeholder"');
		expect(src).toContain('data-testid="case-ai-workspace-retrieve-button"');
		expect(src).toContain('data-testid="case-ai-workspace-data-used"');
		expect(src).toContain('data-testid="case-ai-workspace-data-used-counts"');
		expect(src).toContain('data-p130-ai-workspace="true"');
	});

	it('has no proposal creation or HTTP mutation helpers', () => {
		expect(src).not.toMatch(/Create Proposal|createProposal|commitProposal/i);
		expect(src).not.toMatch(/\b(fetch|axios)\s*\(/);
	});

	it('uses p130 copy module for user-visible strings', () => {
		expect(src).toContain("$lib/caseContext/p130AIWorkspaceCopy");
	});
});

describe('ai-workspace +page (P130-01)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('uses getRouteCaseIdString and mounts AIWorkspacePanel', () => {
		expect(src).toContain('getRouteCaseIdString');
		expect(src).toContain('AIWorkspacePanel');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('does not import Case Engine APIs on the route', () => {
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
	});
});
