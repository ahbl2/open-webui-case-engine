/**
 * Keyboard shortcut matching for global handlers (see `(app)/+layout.svelte`).
 * Defensive: malformed user/settings-derived shortcut objects must never throw on keydown.
 */
export type ShortcutKeyBinding = {
	keys?: unknown;
};

/**
 * Returns true if `event` matches the modifier + main key requirements of `shortcut`.
 * Returns false if `shortcut` is missing, `keys` is not a string array, or keys are empty.
 */
export function isShortcutMatch(
	event: KeyboardEvent,
	shortcut: ShortcutKeyBinding | null | undefined
): boolean {
	if (!shortcut || !Array.isArray(shortcut.keys)) return false;
	const keys = shortcut.keys.filter(
		(k): k is string => typeof k === 'string' && k.length > 0
	);
	if (!keys.length) return false;

	const normalized = keys.map((k) => k.toLowerCase());
	const needCtrl = normalized.includes('ctrl') || normalized.includes('mod');
	const needShift = normalized.includes('shift');
	const needAlt = normalized.includes('alt');

	const mainKeys = normalized.filter((k) => !['ctrl', 'shift', 'alt', 'mod'].includes(k));

	const keyPressed = (event.key ?? '').toLowerCase();

	if (needShift && !event.shiftKey) return false;

	if (needCtrl && !(event.ctrlKey || event.metaKey)) return false;
	if (!needCtrl && (event.ctrlKey || event.metaKey)) return false;
	if (needAlt && !event.altKey) return false;
	if (!needAlt && event.altKey) return false;

	if (mainKeys.length && !mainKeys.includes(keyPressed)) return false;

	return true;
}
