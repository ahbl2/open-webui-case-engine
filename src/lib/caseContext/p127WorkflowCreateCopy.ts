/**
 * P127-02 — Workflow item creation (static copy; manual, explicit; no inference vocabulary).
 */

export const P127_WORKFLOW_CREATE_ENTRY_BUTTON = 'Create workflow item';

/** Shown on the main Workflow tab next to the Phase 117 list (distinct from legacy planning items). */
export const P127_WORKFLOW_P117_LIST_SECTION_TITLE = 'Operational workflow items';

export const P127_WORKFLOW_P117_LIST_EMPTY = 'No operational workflow items yet.';

export const P127_WORKFLOW_P117_LIST_LOADING = 'Loading operational workflow items…';

export const P127_WORKFLOW_CREATE_MODAL_TITLE = 'Create workflow item';

export const P127_WORKFLOW_CREATE_SECTION_LABEL = 'New workflow item';

export const P127_WORKFLOW_FIELD_TYPE_LABEL = 'Workflow type';

export const P127_WORKFLOW_FIELD_TITLE_LABEL = 'Title';

export const P127_WORKFLOW_FIELD_DESCRIPTION_LABEL = 'Description (non-authoritative)';

export const P127_WORKFLOW_FIELD_STATUS_LABEL = 'Status';

export const P127_WORKFLOW_TYPE_TASK = 'Task';

export const P127_WORKFLOW_TYPE_LEAD = 'Lead';

export const P127_WORKFLOW_STATUS_OPEN = 'Open';

export const P127_WORKFLOW_STATUS_IN_PROGRESS = 'In progress';

export const P127_WORKFLOW_STATUS_CLOSED = 'Closed';

export const P127_WORKFLOW_CREATE_SUBMIT = 'Create workflow item';

export const P127_WORKFLOW_CREATE_SUBMITTING = 'Creating…';

export const P127_WORKFLOW_CREATE_CANCEL = 'Cancel';

export const P127_WORKFLOW_CREATE_SUCCESS_TOAST = 'Workflow item created.';

export const P127_WORKFLOW_VALIDATION_TITLE_REQUIRED = 'Enter a title.';

/** Case Engine allows TASK and LEAD only for workflow_type today; use the title for other follow-up wording. */
export const P127_WORKFLOW_TYPE_SCOPE_NOTE =
	'Types are Task and Lead only—name follow-ups or actions in the title.';
