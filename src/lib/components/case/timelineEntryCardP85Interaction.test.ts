/**
 * P85-02 — TimelineEntryCard: local flag + ops clicks isolated (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard P85-02 rapid input / isolation (source contract)', () => {
	it('toggles review flag with synchronous boolean flip (no async queue)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/function toggleEntryFlag\(\)[\s\S]*?entryFlagged = !entryFlagged/);
	});

	it('stops propagation on operational control clicks to avoid accidental parent activation', () => {
		const src = readFileSync(cardPath, 'utf8');
		const flag = (src.match(/on:click\|stopPropagation=\{toggleEntryFlag\}/g) ?? []).length;
		expect(flag).toBeGreaterThanOrEqual(2);
		expect(src).toMatch(/on:click\|stopPropagation=\{onRelateClick\}/);
		expect(src).toMatch(/on:click\|stopPropagation=\{onFollowUpClick\}/);
	});

	it('does not hoist flag state to a store (per-row instance only)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/let entryFlagged = false/);
		expect(src).not.toMatch(/writable\(\s*false\s*\)[\s\S]{0,80}entryFlagged/);
	});
});
