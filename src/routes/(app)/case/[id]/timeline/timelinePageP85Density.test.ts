/**
 * P85-01 — Timeline page list density & pagination stress (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const pagePath = join(dirname(fileURLToPath(import.meta.url)), '+page.svelte');

describe('timeline +page P85-01 density & list stability (source contract)', () => {
	it('keys the chronological list by entry.id for stable reconciliation under load', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/\{#each entries as entry \(entry\.id\)\}/);
	});

	it('uses incremental chunk sizes suitable for dense timelines (initial + load-more)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/const TIMELINE_INITIAL_CHUNK = 50/);
		expect(src).toMatch(/const TIMELINE_CHUNK_SIZE = 25/);
	});

	it('keeps vertical rhythm with flex column + gap between rows', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/<ol class="flex flex-col gap-3"/);
	});

	it('places scroll sentinel inside the list flow to avoid eager load-more under density', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/P41-43: sentinel placed INSIDE/);
		expect(src).toMatch(/data-testid="timeline-scroll-sentinel"/);
	});

	it('wires P84 operational props per entry id (follow-up Set + relate handlers)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/entryNeedsFollowUp=\{followUpEntryIds\.has\(entry\.id\)\}/);
		expect(src).toMatch(/onFollowUpClick=\{\(\) => handleFollowUpToggle\(entry\.id\)\}/);
		expect(src).toMatch(/onRelateClick=\{\(\) => handleTimelineRelateClick\(entry\.id\)\}/);
	});
});
