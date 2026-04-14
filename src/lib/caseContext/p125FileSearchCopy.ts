/**
 * P125-04 — Case-scoped file search framing (static operator copy; source-only; not rescored).
 */

/** Shown while a server-backed search term is active (this case only; Case Engine order). */
export const P125_FILE_SEARCH_ACTIVE_FRAMING =
	'Search applies only to this case. Results list files from Case Engine in upload order (newest first within each page) — not rescored or summarized. Matching uses file name, type, tags, and stored extracted text from the server.';

/** Empty list when the only constraint is the search box (no mime/tag filter). */
export const P125_FILE_SEARCH_EMPTY_DESCRIPTION =
	'No files in this case matched that search string against name, type, tag, or stored extracted text. Clear the search box to list all files again.';
