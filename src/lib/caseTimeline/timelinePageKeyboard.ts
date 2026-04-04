/**
 * Timeline route keyboard shortcuts (local to Case Timeline +page only).
 *
 * Shortcuts:
 *   `/` — focus timeline search (when target is not an editable surface)
 *   `n` — open bottom composer (same as + Log entry)
 *   `Escape` — cancel/close composer via existing requestCancelComposer flow
 *
 * Guards: never activate while focus is in INPUT, TEXTAREA, SELECT, contenteditable,
 * or inside [contenteditable="true"]. When a confirm overlay is open, all shortcuts noop.
 */

export function isTimelinePageShortcutTargetEditable(target: EventTarget | null): boolean {
	if (!target || typeof target !== 'object') return false;
	const el = target as Partial<HTMLElement> & { closest?: (sel: string) => Element | null };
	if (el.isContentEditable === true) return true;
	const tag = el.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
	if (typeof el.closest === 'function') {
		try {
			if (el.closest('[contenteditable="true"]') != null) return true;
		} catch {
			/* ignore */
		}
	}
	return false;
}

export type TimelinePageKeydownIntent =
	| { kind: 'none' }
	| { kind: 'focus-search' }
	| { kind: 'open-composer' }
	| { kind: 'cancel-composer' };

/**
 * Pure resolver for unit tests and the page keydown handler.
 */
export function resolveTimelinePageKeydownIntent(params: {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	targetEditable: boolean;
	overlayOpen: boolean;
	composerOpen: boolean;
}): TimelinePageKeydownIntent {
	if (params.overlayOpen) return { kind: 'none' };
	if (params.targetEditable) return { kind: 'none' };

	if (params.key === '/') {
		return { kind: 'focus-search' };
	}
	if (params.key === 'n' && !params.ctrlKey && !params.metaKey && !params.altKey) {
		return { kind: 'open-composer' };
	}
	if (params.key === 'Escape' && params.composerOpen) {
		return { kind: 'cancel-composer' };
	}
	return { kind: 'none' };
}

/**
 * True when a line-clamped block's content height exceeds the visible box (same check used in the card).
 */
export function timelineEntryBodyOverflowsWhenClamped(scrollHeight: number, clientHeight: number): boolean {
	return scrollHeight > clientHeight + 2;
}
