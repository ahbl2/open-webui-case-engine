/**
 * P85-03 — TimelineEntryCard: local UI cleanup when row becomes soft-deleted in place (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard P85-03 soft-delete lifecycle (source contract)', () => {
	it('clears local-only state on transition to deleted (in-place) so flag does not leak', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('P85-03');
		expect(src).toMatch(/isDeleted && !prevIsDeleted/);
		expect(src).toMatch(/entryFlagged = false/);
		expect(src).toMatch(/prevIsDeleted = isDeleted/);
	});

	it('resets body expand, version history panel, menus, and AI-original toggle on that transition', () => {
		const src = readFileSync(cardPath, 'utf8');
		const block = src.slice(src.indexOf('P85-03'), src.indexOf('</script>'));
		expect(block).toContain('bodyExpanded = false');
		expect(block).toContain('historyExpanded = false');
		expect(block).toContain('showOriginal = false');
		expect(block).toContain('actionsMenuOpen = false');
		expect(block).toContain('linkedImagesViewerOpen = false');
	});
});
