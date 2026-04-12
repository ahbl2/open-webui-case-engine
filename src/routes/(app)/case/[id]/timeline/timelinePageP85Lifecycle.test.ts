/**
 * P85-03 — Timeline page: case switch + delete cleanup for all UI-only state (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const pagePath = join(dirname(fileURLToPath(import.meta.url)), '+page.svelte');

describe('timeline +page P85-03 case-switch lifecycle (source contract)', () => {
	it('increments load epoch and clears entries immediately on case id change (route reuse)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/caseId !== prevLoadedCaseId/);
		expect(src).toMatch(/timelineLoadMoreEpoch \+= 1;\s*\n\s*prevLoadedCaseId = caseId;\s*\n\s*entries = \[\]/);
	});

	it('clears P84 relate + follow-up and editing/composer state in the same reactive block', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(
			/relationshipPendingId = null;\s*\n\s*relationshipPair = null;\s*\n\s*followUpEntryIds = new Set\(\)/
		);
		expect(src).toMatch(/editingEntryId = null/);
		expect(src).toMatch(/composerDraft = null/);
	});

	it('does not persist timeline UI-only state to web storage', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).not.toMatch(/followUpEntryIds[\s\S]{0,120}(localStorage|sessionStorage)/);
		expect(src).not.toMatch(/relationshipPair[\s\S]{0,120}(localStorage|sessionStorage)/);
	});
});

describe('timeline +page P85-03 delete lifecycle (source contract)', () => {
	it('drops relate pair or pending when deleted entry participates (P84-03)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/P84-03: drop local pairing/);
		expect(src).toMatch(/isEntryInRelationPair\(entryId, relationshipPair\)/);
		expect(src).toMatch(/relationshipPendingId === entryId/);
	});

	it('removes follow-up id when deleted entry was marked', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/followUpEntryIds\.has\(entryId\)/);
		expect(src).toMatch(/removeFollowUpEntryId/);
	});
});

describe('timeline +page P85-06 delete vs inline edit (source contract)', () => {
	it('cancels inline edit when the entry being edited is removed', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/if \(editingEntryId === entryId\) cancelEdit\(\)/);
	});
});
