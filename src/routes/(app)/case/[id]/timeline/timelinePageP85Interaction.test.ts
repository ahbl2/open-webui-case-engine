/**
 * P85-02 — Timeline page operational handlers: synchronous, no debounce (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const pagePath = join(dirname(fileURLToPath(import.meta.url)), '+page.svelte');

describe('timeline +page P85-02 interaction wiring (source contract)', () => {
	it('applies relate transitions via nextRelateState only (single sync reducer)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain('function handleTimelineRelateClick(entryId: string): void {');
		expect(src).toContain('const next = nextRelateState(');
		expect(src).toContain('relationshipPendingId = next.pendingId');
		expect(src).toContain('relationshipPair = next.pair');
		expect(src).not.toMatch(/handleTimelineRelateClick[\s\S]{0,200}setTimeout/);
		expect(src).not.toMatch(/handleTimelineRelateClick[\s\S]{0,200}requestAnimationFrame/);
	});

	it('applies follow-up via toggleFollowUpEntryId synchronously', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain('function handleFollowUpToggle(entryId: string): void {');
		expect(src).toContain('toggleFollowUpEntryId(followUpEntryIds, entryId)');
		expect(src).not.toMatch(/handleFollowUpToggle[\s\S]{0,120}setTimeout/);
	});

	it('uses entry-scoped closures for relate and follow-up (no cross-row handler sharing)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/onRelateClick=\{\(\) => handleTimelineRelateClick\(entry\.id\)\}/);
		expect(src).toMatch(/onFollowUpClick=\{\(\) => handleFollowUpToggle\(entry\.id\)\}/);
	});
});
