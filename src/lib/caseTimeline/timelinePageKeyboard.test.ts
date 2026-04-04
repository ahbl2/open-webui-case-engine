/**
 * Timeline page keyboard shortcut guards and intent resolution.
 */
import { describe, it, expect } from 'vitest';
import {
	isTimelinePageShortcutTargetEditable,
	resolveTimelinePageKeydownIntent,
	timelineEntryBodyOverflowsWhenClamped
} from './timelinePageKeyboard';

function mockEl(partial: Record<string, unknown>): EventTarget {
	return partial as unknown as EventTarget;
}

describe('isTimelinePageShortcutTargetEditable', () => {
	it('returns false for null', () => {
		expect(isTimelinePageShortcutTargetEditable(null)).toBe(false);
	});

	it('returns true for INPUT', () => {
		expect(
			isTimelinePageShortcutTargetEditable(mockEl({ tagName: 'INPUT', isContentEditable: false, closest: () => null }))
		).toBe(true);
	});

	it('returns true for TEXTAREA', () => {
		expect(
			isTimelinePageShortcutTargetEditable(
				mockEl({ tagName: 'TEXTAREA', isContentEditable: false, closest: () => null })
			)
		).toBe(true);
	});

	it('returns true for SELECT', () => {
		expect(
			isTimelinePageShortcutTargetEditable(mockEl({ tagName: 'SELECT', isContentEditable: false, closest: () => null }))
		).toBe(true);
	});

	it('returns true when isContentEditable is true', () => {
		expect(
			isTimelinePageShortcutTargetEditable(mockEl({ tagName: 'DIV', isContentEditable: true, closest: () => null }))
		).toBe(true);
	});

	it('returns true when inside contenteditable ancestor', () => {
		const inner = mockEl({
			tagName: 'SPAN',
			isContentEditable: false,
			closest: (sel: string) => (sel === '[contenteditable="true"]' ? ({} as Element) : null)
		});
		expect(isTimelinePageShortcutTargetEditable(inner)).toBe(true);
	});

	it('returns false for BUTTON', () => {
		expect(
			isTimelinePageShortcutTargetEditable(mockEl({ tagName: 'BUTTON', isContentEditable: false, closest: () => null }))
		).toBe(false);
	});
});

describe('resolveTimelinePageKeydownIntent', () => {
	const base = {
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		targetEditable: false,
		overlayOpen: false,
		composerOpen: false
	};

	it('returns none when overlay is open', () => {
		expect(
			resolveTimelinePageKeydownIntent({ ...base, key: '/', overlayOpen: true })
		).toEqual({ kind: 'none' });
		expect(
			resolveTimelinePageKeydownIntent({ ...base, key: 'n', overlayOpen: true })
		).toEqual({ kind: 'none' });
	});

	it('returns none when target is editable', () => {
		expect(
			resolveTimelinePageKeydownIntent({ ...base, key: '/', targetEditable: true })
		).toEqual({ kind: 'none' });
	});

	it('maps / to focus-search', () => {
		expect(resolveTimelinePageKeydownIntent({ ...base, key: '/' })).toEqual({ kind: 'focus-search' });
	});

	it('maps lowercase n to open-composer', () => {
		expect(resolveTimelinePageKeydownIntent({ ...base, key: 'n' })).toEqual({ kind: 'open-composer' });
	});

	it('does not map uppercase N to open-composer', () => {
		expect(resolveTimelinePageKeydownIntent({ ...base, key: 'N' })).toEqual({ kind: 'none' });
	});

	it('does not map n with ctrl', () => {
		expect(resolveTimelinePageKeydownIntent({ ...base, key: 'n', ctrlKey: true })).toEqual({ kind: 'none' });
	});

	it('maps Escape to cancel-composer when composer open', () => {
		expect(
			resolveTimelinePageKeydownIntent({ ...base, key: 'Escape', composerOpen: true })
		).toEqual({ kind: 'cancel-composer' });
	});

	it('does not map Escape when composer closed', () => {
		expect(resolveTimelinePageKeydownIntent({ ...base, key: 'Escape' })).toEqual({ kind: 'none' });
	});
});

describe('timelineEntryBodyOverflowsWhenClamped', () => {
	it('returns false when heights are equal', () => {
		expect(timelineEntryBodyOverflowsWhenClamped(100, 100)).toBe(false);
	});

	it('returns true when scroll height exceeds client height beyond tolerance', () => {
		expect(timelineEntryBodyOverflowsWhenClamped(120, 100)).toBe(true);
	});
});
