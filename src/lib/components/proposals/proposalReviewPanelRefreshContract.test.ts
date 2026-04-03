/**
 * P38-03 — ProposalReviewPanel refresh discipline contract
 *
 * Dedicated `/case/[id]/proposals` and Case Tools embed must both pass
 * `refreshOnNav={true}` so `afterNavigate` in ProposalReviewPanel refetches
 * after in-app navigation (same load path; no second workflow).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readCaseRoute(rel: string): string {
	return readFileSync(join(process.cwd(), 'src/routes/(app)/case/[id]', rel), 'utf8');
}

describe('P38-03 — ProposalReviewPanel refreshOnNav wiring', () => {
	it('dedicated proposals page passes refreshOnNav true', () => {
		const src = readCaseRoute('proposals/+page.svelte');
		expect(src).toContain('refreshOnNav={true}');
	});

	it('Case Tools embed passes refreshOnNav true immediately after ProposalReviewPanel open tag', () => {
		const src = readCaseRoute('chat/+page.svelte');
		const idx = src.indexOf('<ProposalReviewPanel');
		expect(idx, 'chat page must embed ProposalReviewPanel').toBeGreaterThan(-1);
		const window = src.slice(idx, idx + 450);
		expect(window).toContain('refreshOnNav={true}');
	});
});
