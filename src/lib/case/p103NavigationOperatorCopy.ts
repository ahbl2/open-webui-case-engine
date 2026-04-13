/**
 * P103-05 — Shared operator-facing copy for citation-driven navigation (read-only surfaces).
 * Keeps not-found, span, and query wiring messages aligned across timeline, tasks, files, and query.
 */

/** Timeline: synthesis or P103 reveal could not locate the target in the loaded list. */
export const P103_REVEAL_NOT_FOUND_TIMELINE_COPY =
	'This Timeline entry is not in the current list. It may be filtered out, not loaded yet, or no longer available in this view. Adjust filters if needed—the official Timeline record is unchanged.';

/** Tasks: synthesis or P103 reveal could not locate the task in the loaded list. */
export const P103_REVEAL_NOT_FOUND_TASKS_COPY =
	'This task is not in the current list. It may be filtered out, not loaded yet, or not visible in the current section. Adjust filters if needed—operational tasks are supporting only; they are not Timeline entries.';

/** Files: P97 synthesis navigation could not locate the file in the loaded list. */
export const P103_REVEAL_NOT_FOUND_FILES_SYNTHESIS_COPY =
	'This file is not in the current list. It may be filtered out, not loaded yet, or not visible in this view. Adjust search or filters if needed—case files are supporting evidence only; they are not the Timeline.';

/** Files: P103 citation navigation could not locate the file in the loaded list. */
export const P103_REVEAL_NOT_FOUND_FILES_CITATION_COPY =
	'Citation target file is not in the current list. It may be filtered out, not loaded yet, or not in this view. Adjust search or filters—no alternate file was selected.';

export const P103_FILES_SPAN_INVALID_COPY =
	'The citation text span does not fit the extracted text for this file (out of range or invalid). No text region was highlighted.';

export const P103_FILES_SPAN_UNAVAILABLE_COPY =
	'Extracted text is not available for this file, so the citation span cannot be shown. Open the file or run extraction when supported.';

/** Query panel: navigator rejected case alignment. */
export const P103_QUERY_NAVIGATION_CASE_MISMATCH_COPY =
	'Navigation did not match this case. Nothing was opened.';

/** Query panel: payload could not become a navigable intent. */
export const P103_QUERY_NAVIGATION_FAILED_COPY =
	'Navigation could not be started for this citation.';

/** Query: citation kind has no delivered navigation target (notebook / read model). */
export const P103_QUERY_CITATION_UNSUPPORTED_COPY =
	'Navigation for this citation type is not available in this build.';

/** Query: invalid file span on citation. */
export const P103_QUERY_CITATION_INVALID_SPAN_COPY =
	'This citation text span cannot be opened safely.';

/** Query: envelope case id does not match active case. */
export const P103_QUERY_CITATION_INVALID_CASE_COPY =
	'Citation cannot be opened safely for this case.';

/** Query: missing or blank citation id. */
export const P103_QUERY_CITATION_INVALID_ID_COPY =
	'This citation is missing a valid record id.';
