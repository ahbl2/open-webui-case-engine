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
 * Assist / AI-action button (teal, semi-transparent, with shimmer affordance).
 *
 * Use for actions that invoke an AI-assisted or AI-powered workflow where the
 * detective reviews the result before saving. Timeline "Improve text" and Notes
 * "Structure Note" are both this role.
 *
 * Reference: Notes "Structure Note" button (N-A1/N-A2 in the P38 audit).
 * Pairs with a `.timeline-assist-shimmer` (or `.notes-workflow-shimmer`) child
 * span for the idle sheen animation — `overflow-hidden` is already included.
 */
export const CASE_ASSIST_BTN_CLASS =
	'relative h-8 px-3 inline-flex items-center gap-1.5 rounded-md border text-xs font-medium overflow-hidden border-teal-400/90 dark:border-teal-600 text-teal-900 dark:text-teal-100 bg-white/70 dark:bg-gray-800/70 hover:bg-teal-50/95 dark:hover:bg-teal-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition';

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
