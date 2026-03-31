/**
 * P34-29 — Shared logic for loading a structured rendered draft into the note editor
 * without persisting. Accept Draft and Edit Draft both use this path; Save note remains
 * the sole persistence boundary (`saveStructuredNotesEditedDraft` / normal create).
 */

export type NotesWorkspaceMode = 'idle' | 'view' | 'edit' | 'create';

export interface StructuredDraftHydrationNoteContext {
	id: number;
	title?: string | null;
	updated_at: string;
}

export type StructuredDraftHydrationPlan =
	| { ok: false; reason: 'empty' | 'unsupported_mode' }
	| { ok: true; branch: 'create'; createText: string }
	| { ok: true; branch: 'edit_existing'; editText: string }
	| {
			ok: true;
			branch: 'view_to_edit';
			noteId: number;
			editTitle: string;
			editText: string;
			editExpectedUpdatedAt: string;
	  };

/**
 * Pure: how to hydrate the workspace editor from `renderedText` for the current mode.
 */
export function computeStructuredDraftHydration(
	mode: NotesWorkspaceMode,
	renderedText: string,
	selectedNote: StructuredDraftHydrationNoteContext | null
): StructuredDraftHydrationPlan {
	if (!renderedText.trim()) {
		return { ok: false, reason: 'empty' };
	}
	if (mode === 'create') {
		return { ok: true, branch: 'create', createText: renderedText };
	}
	if (mode === 'edit' && selectedNote) {
		return { ok: true, branch: 'edit_existing', editText: renderedText };
	}
	if (mode === 'view' && selectedNote) {
		return {
			ok: true,
			branch: 'view_to_edit',
			noteId: selectedNote.id,
			editTitle: selectedNote.title ?? '',
			editText: renderedText,
			editExpectedUpdatedAt: selectedNote.updated_at
		};
	}
	return { ok: false, reason: 'unsupported_mode' };
}
