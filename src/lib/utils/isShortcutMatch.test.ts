/**
 * Regression: global keydown handler must never throw on malformed shortcut.keys (undefined entries, non-arrays).
 */
import { describe, it, expect } from 'vitest';
import { isShortcutMatch } from './isShortcutMatch';

function ev(partial: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
	return partial as KeyboardEvent;
}

describe('isShortcutMatch', () => {
	it('returns false for undefined shortcut', () => {
		expect(isShortcutMatch(ev({ key: 'k' }), undefined)).toBe(false);
	});

	it('returns false when keys is not an array', () => {
		expect(isShortcutMatch(ev({ key: 'k' }), { keys: 'mod+k' as unknown as string[] })).toBe(false);
	});

	it('returns false when keys is empty after filtering', () => {
		expect(isShortcutMatch(ev({ key: 'k' }), { keys: [undefined, null, '', 1] as unknown as string[] })).toBe(
			false
		);
	});

	it('does not throw when keys contains undefined entries', () => {
		const keys = ['mod', undefined, 'k'] as unknown as string[];
		expect(() => isShortcutMatch(ev({ key: 'k', ctrlKey: true }), { keys })).not.toThrow();
		expect(isShortcutMatch(ev({ key: 'k', ctrlKey: true }), { keys })).toBe(true);
	});

	it('matches mod+k', () => {
		expect(
			isShortcutMatch(ev({ key: 'k', ctrlKey: true, shiftKey: false, altKey: false }), {
				keys: ['mod', 'K']
			})
		).toBe(true);
		expect(
			isShortcutMatch(ev({ key: 'k', ctrlKey: false, metaKey: true }), { keys: ['mod', 'k'] })
		).toBe(true);
	});

	it('treats missing event.key as empty string', () => {
		expect(
			isShortcutMatch(ev({ key: undefined as unknown as string, ctrlKey: true }), {
				keys: ['mod', 'k']
			})
		).toBe(false);
	});
});
