/**
 * P126-02 — Manual entity creation (static operator copy; no inference; no prefills).
 */

/** Primary entry control on the entities list (user-triggered only). */
export const P126_ENTITY_CREATE_ENTRY_BUTTON = 'Create entity';

export const P126_ENTITY_CREATE_FORM_TITLE = 'Create entity';

/** Doctrine for the create form (no case-data hooks). */
export const P126_ENTITY_CREATE_FORM_SUPPORT =
	'Enter fields manually. No suggestions or prefills from this case. Links are not created automatically.';

export const P126_ENTITY_FIELD_TYPE_LABEL = 'Entity type';

export const P126_ENTITY_FIELD_TYPE_PLACEHOLDER = 'Select a type…';

export const P126_ENTITY_FIELD_VALUE_LABEL = 'Value';

export const P126_ENTITY_FIELD_NOTE_LABEL = 'Note (optional, non-authoritative)';

export const P126_ENTITY_CREATE_SUBMIT = 'Create entity';

export const P126_ENTITY_CREATE_CANCEL = 'Cancel';

export const P126_ENTITY_CREATE_SUBMITTING = 'Creating…';

export const P126_ENTITY_CREATE_TOAST_SUCCESS = 'Entity created.';

/** Fixed, explicit API values (no auto-detection; no dynamic types in P126-02). */
export const P126_ENTITY_TYPE_OPTIONS = [
	{ value: 'person', label: 'Person' },
	{ value: 'phone', label: 'Phone' },
	{ value: 'address', label: 'Address' },
	{ value: 'vehicle', label: 'Vehicle' },
	{ value: 'organization', label: 'Organization' }
] as const;
