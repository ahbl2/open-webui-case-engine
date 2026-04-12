/**
 * P84-04 — Timeline page follow-up Set wiring.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const pagePath = join(dirname(fileURLToPath(import.meta.url)), '+page.svelte');

describe('timeline +page P84-04 follow-up (source contract)', () => {
	it('uses Set + toggle helper and passes props to cards', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/toggleFollowUpEntryId/);
		expect(src).toMatch(/removeFollowUpEntryId/);
		expect(src).toMatch(/let followUpEntryIds = new Set/);
		expect(src).toMatch(/entryNeedsFollowUp=\{followUpEntryIds\.has\(entry\.id\)\}/);
		expect(src).toMatch(/onFollowUpClick=\{\(\) => handleFollowUpToggle\(entry\.id\)\}/);
	});

	it('clears follow-up Set on case-switch reset', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/followUpEntryIds = new Set\(\)/);
	});

	it('removes follow-up id when an entry is deleted', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/followUpEntryIds\.has\(entryId\)/);
		expect(src).toMatch(/removeFollowUpEntryId/);
	});
});
