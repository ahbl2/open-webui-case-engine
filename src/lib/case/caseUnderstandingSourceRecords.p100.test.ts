import { describe, expect, it } from 'vitest';

import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';
import type { CaseFile, NotebookNote, TimelineEntry } from '$lib/apis/caseEngine';
import { buildCaseUnderstandingSourceRecordsFromReads } from '$lib/case/caseUnderstandingSourceRecords';

describe('buildCaseUnderstandingSourceRecordsFromReads (P100-04)', () => {
	it('maps reads to extraction inputs and skips deleted rows', () => {
		const timeline: TimelineEntry[] = [
			{
				id: 'e1',
				case_id: 'c1',
				occurred_at: '2020-01-01T00:00:00Z',
				created_at: '2020-01-01T00:00:00Z',
				created_by: 'u1',
				type: 'note',
				location_text: 'X',
				tags: [],
				text_original: 'Body',
				text_cleaned: null,
				deleted_at: null
			},
			{
				id: 'e2',
				case_id: 'c1',
				occurred_at: '2020-01-02T00:00:00Z',
				created_at: '2020-01-02T00:00:00Z',
				created_by: 'u1',
				type: 'note',
				location_text: null,
				tags: [],
				text_original: 'gone',
				text_cleaned: null,
				deleted_at: '2020-02-01T00:00:00Z'
			}
		];
		const tasks: CaseEngineCaseTask[] = [
			{
				id: 't1',
				case_id: 'c1',
				title: 'Task A',
				description: 'Desc',
				status: 'open',
				timeline_entry_id: null,
				created_at: '',
				created_by: '',
				updated_at: '',
				updated_by: '',
				completed_at: null,
				completed_by: null,
				archived_at: null,
				archived_by: null,
				deleted_at: null,
				deleted_by: null,
				assignee_user_id: null,
				assignee_display_name: null,
				due_date: null,
				priority: null,
				group_label: null,
				pinned: false,
				cross_refs: []
			}
		];
		const files: CaseFile[] = [{ id: 'f1', original_filename: 'a.pdf', mime_type: null, file_size_bytes: 1, uploaded_by: 'u', uploaded_at: '' }];
		const notes: NotebookNote[] = [
			{
				id: 9,
				case_id: 'c1',
				owner_user_id: 'o',
				title: 'N',
				current_text: 'text',
				created_at: '',
				created_by: '',
				updated_at: '',
				updated_by: '',
				deleted_at: null,
				deleted_by: null
			}
		];

		const rows = buildCaseUnderstandingSourceRecordsFromReads('c1', { timeline, tasks, files, notes });
		expect(rows.filter((r) => r.source_kind === 'timeline_entry')).toHaveLength(1);
		expect(rows.find((r) => r.source_record_id === 'e1')?.text).toContain('Body');
		expect(rows.find((r) => r.source_record_id === 't1')?.text).toContain('Task A');
		expect(rows.find((r) => r.source_record_id === 'f1')?.text).toBe('a.pdf');
		expect(rows.find((r) => r.source_record_id === '9')?.source_kind).toBe('notebook_note');
	});
});
