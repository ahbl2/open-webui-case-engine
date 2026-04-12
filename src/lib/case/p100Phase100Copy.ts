/**
 * P100-05 — Shared Phase 100 read-only microcopy (Case Understanding + docs alignment).
 *
 * **Limitation (unchanged):** the Case Understanding load path uses **filename text** for file rows only;
 * full extracted text is not ingested here—see P100-04 closure notes.
 */

/** Overview section subline under “Case understanding (read-only)”. */
export const P100_OVERVIEW_SECTION_DECK =
	'Deterministic text patterns from case records already loaded here. Not an assessment, ranking, or investigation guide.';

/** Panel body when Case Engine token is not available (no record text can be loaded). */
export const P100_PANEL_CASE_ENGINE_REQUIRED =
	'Case Engine session required to load record text for this section.';

/**
 * Factual authority line when aggregation has groups (subordinate to Timeline; not a stored record).
 */
export const P100_PANEL_AUTHORITY_LINE =
	'Read-only deterministic pattern matches from Timeline, Tasks, Files, and Notes. Timeline holds the official chronology; this section is context only—not a stored record.';

/** Empty / sparse: extraction found no matching patterns in the text that was loaded. */
export const P100_PANEL_EMPTY_NO_MATCHES =
	'No matching text patterns in the loaded case records for this section. Other case material may still exist.';

/** Documented limitation — filenames only for Files in this view (not “fixed” by hardening). */
export const P100_PANEL_FILE_ROW_LIMITATION =
	'Files use display names only here; full file text is not loaded in this view.';
