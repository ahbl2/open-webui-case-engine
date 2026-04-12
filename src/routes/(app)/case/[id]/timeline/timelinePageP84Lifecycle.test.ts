/**
 * P84-06 — Timeline page lifecycle: case switch + delete cleanup for P84 operational state.
 * Source contract (mount-free); complements card-level P84 tests.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const pagePath = join(dirname(fileURLToPath(import.meta.url)), '+page.svelte');

describe('timeline +page P84-06 lifecycle (source contract)', () => {
	it('resets relate + follow-up state together on case-switch (P28-46)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/caseId !== prevLoadedCaseId/);
		expect(src).toMatch(
			/relationshipPendingId = null;\s*\n\s*relationshipPair = null;\s*\n\s*followUpEntryIds = new Set\(\)/
		);
	});

	it('does not persist P84 operational state to web storage', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).not.toMatch(/followUpEntryIds[\s\S]{0,120}(localStorage|sessionStorage)/);
		expect(src).not.toMatch(/relationshipPair[\s\S]{0,120}(localStorage|sessionStorage)/);
		expect(src).not.toMatch(/relationshipPendingId[\s\S]{0,120}(localStorage|sessionStorage)/);
	});

	it('cleans follow-up and relationship on delete when entry participates', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/P84-03: drop local pairing/);
		expect(src).toMatch(/removeFollowUpEntryId/);
	});
});
