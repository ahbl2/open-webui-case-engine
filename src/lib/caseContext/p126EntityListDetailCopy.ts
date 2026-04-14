/**
 * P126-03 — Entity list + detail: neutral labels; explicit linked references only (static copy; no inference).
 */

export const P126_ENTITY_LIST_EMPTY_COPY =
	'No entities yet. Create one manually; this list does not auto-populate from Timeline, Notes, or Files.';

/** Muted row chrome: type line, then value line (server order; no grouping). */
export const P126_ENTITY_LIST_ROW_TYPE_LABEL = 'Entity type';

export const P126_ENTITY_LIST_ROW_VALUE_LABEL = 'Value';

export const P126_ENTITY_DETAIL_SECTION_IDENTITY = 'Identity';

export const P126_ENTITY_DETAIL_FIELD_TYPE_LABEL = 'Entity type';

export const P126_ENTITY_DETAIL_FIELD_VALUE_LABEL = 'Value';

export const P126_ENTITY_DETAIL_ATTRIBUTES_EMPTY = 'No stored attributes.';

export const P126_LINKED_REFERENCES_HEADING = 'Linked references';

export const P126_LINKED_REFERENCES_INTRO =
	'Only records explicitly linked in Case Engine appear here. Nothing is inferred from text.';

export const P126_LINKED_REFERENCES_SUB_TIMELINE = 'Timeline entries';

export const P126_LINKED_REFERENCES_SUB_FILES = 'Files';

export const P126_LINKED_REFERENCES_SUB_NOTES = 'Notes';

export const P126_LINKED_REFERENCES_TIMELINE_EMPTY = 'No timeline links.';

export const P126_LINKED_REFERENCES_FILES_EMPTY = 'No file links.';

/** Case Engine case-entity evidence links are timeline + case file only today; notebook links are not in this API. */
export const P126_LINKED_REFERENCES_NOTES_UNAVAILABLE =
	'No notebook links are stored for this entity in Case Engine. Nothing is inferred from Notes.';
