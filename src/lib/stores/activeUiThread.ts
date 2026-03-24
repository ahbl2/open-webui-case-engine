import { writable } from 'svelte/store';

export type ActiveUiThread =
	| { scope: 'desktop'; threadId: string }
	| { scope: 'case'; caseId: string; threadId: string }
	| null;

/**
 * Canonical in-memory source of truth for which thread is currently active in the UI.
 *
 * Set by the page that successfully binds a thread (desktop or case).
 * Read by thread list components to derive active-state highlighting.
 * Survives component re-mounts within the same browser session because it lives
 * outside the component tree.
 *
 * Cleared to null on case change or when leaving a bound context.
 */
export const activeUiThread = writable<ActiveUiThread>(null);
