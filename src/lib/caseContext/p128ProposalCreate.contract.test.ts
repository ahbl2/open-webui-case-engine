/**
 * P128-02 — Manual proposal create: static copy; no page id; no inference vocabulary; no case prefill.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p128ProposalCreateCopy.ts');
const formPath = join(__dirname, '../components/case/CaseProposalCreateForm.svelte');
const panelPath = join(__dirname, '../components/proposals/ProposalReviewPanel.svelte');

function assertNoTaboo(lower: string): void {
	expect(lower).not.toMatch(/\bsuggested\b/);
	expect(lower).not.toMatch(/\brecommended\b/);
	expect(lower).not.toMatch(/\bdetected\b/);
	expect(lower).not.toMatch(/\bimportant\b/);
	expect(lower).not.toMatch(/\bpriority\b/);
	expect(lower).not.toMatch(/\bbest\b/);
	expect(lower).not.toMatch(/\bscore\b/);
	expect(lower).not.toMatch(/\bmatched\b/);
	expect(lower).not.toMatch(/\bauto\b/);
}

describe('p128ProposalCreateCopy (P128-02)', () => {
	it('is static exports only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P128_CREATE_ENTRY_BUTTON/);
		assertNoTaboo(src.toLowerCase());
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});
});

describe('CaseProposalCreateForm (P128-02)', () => {
	const src = readFileSync(formPath, 'utf8');

	it('calls createProposal only from submit; no case-data prefill', () => {
		expect(src).toContain('createProposal');
		expect(src).toContain('listCaseThreadAssociations');
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$lib\/stores/);
	});

	it('does not use reactive blocks to call createProposal', () => {
		const reactive = src.match(/\$:[^;]+;/g) ?? [];
		expect(reactive.some((b) => b.includes('createProposal'))).toBe(false);
	});
});

describe('ProposalReviewPanel P128 create wiring (P128-02)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('embeds CaseProposalCreateForm for page layout', () => {
		expect(src).toContain('CaseProposalCreateForm');
		expect(src).toContain('proposals-p128-create-open');
		expect(src).toContain("layout === 'page'");
	});

	it('does not use $page.params.id', () => {
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});
