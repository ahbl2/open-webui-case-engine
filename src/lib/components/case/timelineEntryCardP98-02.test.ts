/**
 * P98-02 — Timeline declared relationships strip (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard P98-02 declared relationships (source contract)', () => {
	it('embeds P98-02 block after inline context and before body / AI row', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain("import TimelineEntryDeclaredRelationshipsBlock from './TimelineEntryDeclaredRelationshipsBlock.svelte'");
		expect(src).toMatch(/TimelineEntryDeclaredRelationshipsBlock\s*\{caseId\}\s*\{entry\}/);
		const blockPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryDeclaredRelationshipsBlock.svelte');
		const block = readFileSync(blockPath, 'utf8');
		expect(block).toMatch(/data-testid="timeline-entry-p98-declared-relationships"/);
		expect(block).toContain('P98_DECLARED_RELATIONSHIP_REGION_ARIA');
		expect(block).not.toMatch(/aria-label="Declared same-case connections"/);
	});

	it('P98-04 wires same-case navigation via goto + declared-relationship navigator (Phase 97 handoff)', () => {
		const blockPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryDeclaredRelationshipsBlock.svelte');
		const block = readFileSync(blockPath, 'utf8');
		expect(block).toMatch(/from '\$app\/navigation'/);
		expect(block).toContain('navigateFromDeclaredRelationshipRow');
		expect(block).toContain('data-testid="timeline-entry-p98-declared-navigate"');
	});

	it('does not introduce workflow or task-creation wording in new P98 surface', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/\bworkflow engine\b|\bcreate task\b|\bautomation\b/i);
	});
});
