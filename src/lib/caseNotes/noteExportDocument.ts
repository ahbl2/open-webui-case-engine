/**
 * Shared plain-text document for notebook note exports (TXT and PDF use the same string).
 */
export interface NotebookNoteExportSource {
	id: number;
	case_id: string;
	title: string | null;
	created_at: string;
	updated_at: string;
	created_by: string;
	updated_by: string;
	current_text: string | null;
}

export function buildNotebookNoteExportTxtContent(
	note: NotebookNoteExportSource,
	createdByDisplay: string,
	updatedByDisplay: string
): string {
	const title = note.title?.trim() || 'Untitled';
	const text = note.current_text ?? '';
	return (
		`Title: ${title}\n` +
		`Note ID: ${note.id}\n` +
		`Case ID: ${note.case_id}\n` +
		`Created: ${note.created_at}\n` +
		`Created by: ${createdByDisplay}\n` +
		`Updated: ${note.updated_at}\n` +
		`Updated by: ${updatedByDisplay}\n\n` +
		text
	);
}

export function notebookNoteExportFilename(noteId: number, titleSlug: string, ext: 'txt' | 'pdf'): string {
	return `case-note-${noteId}-${titleSlug}.${ext}`;
}
