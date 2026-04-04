/**
 * Source contract — Timeline entry actions menu parity with Notes (no mount).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard actions menu', () => {
	it('uses Notes-style DropdownMenu + EllipsisVertical trigger with stable test ids', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/import \{ DropdownMenu \} from 'bits-ui'/);
		expect(src).toMatch(/import \{ flyAndScale \} from '\$lib\/utils\/transitions'/);
		expect(src).toMatch(/timeline-entry-actions-menu-trigger/);
		expect(src).toMatch(/timeline-entry-menu-version-history/);
		expect(src).toMatch(/timeline-entry-menu-export-txt/);
		expect(src).toMatch(/timeline-entry-menu-export-md/);
	});

	it('does not offer Duplicate in the timeline entry menu', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/DocumentDuplicate/);
		expect(src).not.toMatch(/Duplicate/);
	});

	it('destructive menu item is labeled Remove and reuses delete test id for soft-delete wiring', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/timeline-entry-delete-button/);
		expect(src).toMatch(/>Remove</);
		expect(src).toMatch(/requestRemoveFromMenu/);
		expect(src).toMatch(/onDeleteRequest\(\)/);
	});

	it('wires version history menu to the same expand path as the edited badge', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/openVersionHistoryFromMenu/);
		expect(src).toMatch(/expandHistoryPanel/);
	});

	it('exports use shared download helper', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/downloadTimelineEntryExport/);
		expect(src).toMatch(/exportEntryFromMenu/);
	});
});
