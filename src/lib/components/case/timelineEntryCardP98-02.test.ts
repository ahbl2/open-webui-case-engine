/**
 * P98-02 — Declared same-case relationship strip was removed from timeline entry cards (product).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard P98-02 declared relationships (surface removed)', () => {
	it('does not embed TimelineEntryDeclaredRelationshipsBlock', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toContain('TimelineEntryDeclaredRelationshipsBlock');
	});

	it('does not introduce workflow or task-creation wording in new P98 surface', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/\bworkflow engine\b|\bcreate task\b|\bautomation\b/i);
	});
});
