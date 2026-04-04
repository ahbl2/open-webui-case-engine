/**
 * Case-surface button class constants.
 *
 * These constants define the visual-role patterns used across case surfaces
 * (Timeline, Notes, Proposals, etc.). The **Notes surface** is the reference
 * standard — styles sourced from and aligned with
 * `routes/(app)/case/[id]/notes/+page.svelte`.
 *
 * Usage:
 *   1. Identify the action role (cancel, primary save, destructive, etc.).
 *   2. Use the corresponding constant when the role matches exactly.
 *   3. If no constant covers the role, treat the Notes surface as the
 *      reference and add a constant here before using it elsewhere.
 *
 * Do not use these constants for non-case UI (e.g. settings, model
 * management). Case-surface consistency is the goal, not a global override.
 *
 * Intentionally not centralized (documented here as reference only):
 *   - Primary save buttons differ by surface intentionally:
 *       Notes:    dark gray filled (bg-gray-800 …) — neutral authoritative
 *       Timeline: blue filled (bg-blue-600 …)      — official log action
 *       Timeline: amber filled (bg-amber-600 …)    — inline edit save
 *   - Card-level action buttons (Edit / Remove / Restore in TimelineEntryCard)
 *     are inline footer controls, not form cancel/save equivalents — deferred.
 *   - Assistive-input controls (Dictate, Import, Clean up, Transcribe audio)
 *     are Timeline-composer-specific with no Notes-surface equivalent.
 */

/**
 * Cancel / abandon form button (non-destructive).
 *
 * Use when the user exits a create or edit form without saving.
 * Reference: Notes "Cancel" on the new-note and edit-note footers
 * (`routes/(app)/case/[id]/notes/+page.svelte`, N-C1 / N-C2).
 *
 * Visual intent: lighter than a filled primary — text-only, enough padding
 * for a comfortable tap target, fades on disable, shows not-allowed cursor
 * so users understand the action is temporarily unavailable (e.g. mid-save).
 */
export const CASE_CANCEL_BTN_CLASS =
	'px-3 py-1.5 rounded text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition';
