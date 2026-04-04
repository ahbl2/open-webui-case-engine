import { describe, it, expect } from 'vitest';
import { buildNotebookNoteExportTxtContent, notebookNoteExportFilename } from './noteExportDocument';

describe('noteExportDocument', () => {
	it('buildNotebookNoteExportTxtContent matches legacy TXT layout', () => {
		const note = {
			id: 42,
			case_id: 'case-x',
			title: 'My title',
			created_at: '2026-01-01',
			updated_at: '2026-01-02',
			created_by: 'a',
			updated_by: 'b',
			current_text: 'Body here'
		};
		const s = buildNotebookNoteExportTxtContent(note, 'Alice', 'Bob');
		expect(s).toBe(
			'Title: My title\n' +
				'Note ID: 42\n' +
				'Case ID: case-x\n' +
				'Created: 2026-01-01\n' +
				'Created by: Alice\n' +
				'Updated: 2026-01-02\n' +
				'Updated by: Bob\n\n' +
				'Body here'
		);
	});

	it('notebookNoteExportFilename', () => {
		expect(notebookNoteExportFilename(1, 'hello', 'txt')).toBe('case-note-1-hello.txt');
		expect(notebookNoteExportFilename(1, 'hello', 'pdf')).toBe('case-note-1-hello.pdf');
	});
});
