/**
 * P84-03 — Timeline page wires local-only relate state into TimelineEntryCard.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const pagePath = join(dirname(fileURLToPath(import.meta.url)), '+page.svelte');

describe('timeline +page P84-03 relate wiring (source contract)', () => {
	it('imports nextRelateState and holds relationship state on the page', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/nextRelateState/);
		expect(src).toMatch(/relationshipPendingId/);
		expect(src).toMatch(/relationshipPair/);
		expect(src).toMatch(/handleTimelineRelateClick/);
	});

	it('passes relate props into TimelineEntryCard', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/relationshipPendingId=\{relationshipPendingId\}/);
		expect(src).toMatch(/relationshipPair=\{relationshipPair\}/);
		expect(src).toMatch(/onRelateClick=\{\(\) => handleTimelineRelateClick\(entry\.id\)\}/);
	});

	it('clears relate state on case-switch reset', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/relationshipPendingId = null;\s*\n\s*relationshipPair = null;/);
	});

	it('clears relate state when a paired or pending entry is deleted', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/isEntryInRelationPair/);
		expect(src).toMatch(/P84-03: drop local pairing/);
	});
});
