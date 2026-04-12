/**
 * P96-01 — Case synthesis read model: structure, ordering, traceability, determinism, authority.
 */
import { describe, it, expect, vi } from 'vitest';
import type { CaseFile, TimelineEntry } from '$lib/apis/caseEngine';
import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';
import {
	buildCaseSynthesisReadModel,
	buildCaseSynthesisReadModelFromSnapshot,
	caseSynthesisReadModelWithoutGeneratedAt,
	normalizeSynthesisReferenceText
} from './caseSynthesisReadModel';

function entry(partial: Partial<TimelineEntry> & Pick<TimelineEntry, 'id' | 'occurred_at'>): TimelineEntry {
	return {
		case_id: 'case-1',
		created_at: '2025-01-01T00:00:00.000Z',
		created_by: 'u1',
		type: 'note',
		location_text: null,
		tags: [],
		text_original: 'body',
		text_cleaned: null,
		deleted_at: null,
		...partial
	} as TimelineEntry;
}

function task(partial: Partial<CaseEngineCaseTask> & Pick<CaseEngineCaseTask, 'id'>): CaseEngineCaseTask {
	return {
		case_id: 'case-1',
		title: 'T',
		description: null,
		status: 'OPEN',
		timeline_entry_id: null,
		created_at: '2025-01-01T00:00:00.000Z',
		created_by: 'u1',
		updated_at: '2025-01-01T00:00:00.000Z',
		updated_by: 'u1',
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
		cross_refs: [],
		...partial
	} as CaseEngineCaseTask;
}

function file(partial: Partial<CaseFile> & Pick<CaseFile, 'id'>): CaseFile {
	return {
		original_filename: 'a.pdf',
		mime_type: 'application/pdf',
		file_size_bytes: 1,
		uploaded_by: 'u1',
		uploaded_at: '2025-01-01T00:00:00.000Z',
		...partial
	} as CaseFile;
}

describe('buildCaseSynthesisReadModelFromSnapshot (P96-01)', () => {
	it('includes all required sections (empty arrays where applicable)', () => {
		const m = buildCaseSynthesisReadModelFromSnapshot({
			caseId: 'case-1',
			timelineEntries: [],
			tasks: [],
			files: [],
			generatedAtIso: '2026-01-01T00:00:00.000Z'
		});
		expect(m.case_id).toBe('case-1');
		expect(m.generated_at).toBe('2026-01-01T00:00:00.000Z');
		expect(Array.isArray(m.timeline_facts)).toBe(true);
		expect(Array.isArray(m.supporting_context)).toBe(true);
		expect(Array.isArray(m.gaps_and_unknowns)).toBe(true);
		expect(m.trace).toEqual({
			timeline_entry_ids: [],
			task_ids: [],
			file_ids: []
		});
		expect(m.gaps_and_unknowns.length).toBeGreaterThanOrEqual(1);
	});

	it('orders timeline_facts strictly by occurred_at then id (official order)', () => {
		const eLate = entry({
			id: 'b',
			occurred_at: '2026-02-01T12:00:00.000Z',
			text_original: 'late'
		});
		const eEarly = entry({
			id: 'a',
			occurred_at: '2026-01-01T12:00:00.000Z',
			text_original: 'early'
		});
		const m = buildCaseSynthesisReadModelFromSnapshot({
			caseId: 'c1',
			timelineEntries: [eLate, eEarly],
			tasks: [],
			files: [],
			generatedAtIso: '2026-01-01T00:00:00.000Z'
		});
		expect(m.timeline_facts.map((f) => f.entry_id)).toEqual(['a', 'b']);
		const t1 = m.timeline_facts[0]!.occurred_at;
		const t2 = m.timeline_facts[1]!.occurred_at;
		expect(t1 <= t2).toBe(true);
	});

	it('excludes soft-deleted timeline entries from facts and trace', () => {
		const m = buildCaseSynthesisReadModelFromSnapshot({
			caseId: 'c1',
			timelineEntries: [
				entry({ id: 'gone', occurred_at: '2026-01-01T00:00:00.000Z', deleted_at: '2026-02-01T00:00:00.000Z' }),
				entry({ id: 'kept', occurred_at: '2026-01-02T00:00:00.000Z', text_original: 'x' })
			],
			tasks: [],
			files: [],
			generatedAtIso: '2026-01-01T00:00:00.000Z'
		});
		expect(m.timeline_facts.map((f) => f.entry_id)).toEqual(['kept']);
		expect(m.trace.timeline_entry_ids).toEqual(['kept']);
	});

	it('traceability: every timeline fact has entry_id; trace lists match', () => {
		const m = buildCaseSynthesisReadModelFromSnapshot({
			caseId: 'c1',
			timelineEntries: [entry({ id: 'e1', occurred_at: '2026-01-01T00:00:00.000Z', text_original: 'hello' })],
			tasks: [task({ id: 't1', title: 'do thing' })],
			files: [file({ id: 'f1', original_filename: 'doc.txt' })],
			generatedAtIso: '2026-01-01T00:00:00.000Z'
		});
		for (const f of m.timeline_facts) {
			expect(f.entry_id).toMatch(/./);
			expect(f.source_type).toBe('timeline');
		}
		expect(m.trace.timeline_entry_ids).toEqual(m.timeline_facts.map((x) => x.entry_id));
		expect(m.trace.task_ids).toEqual(['t1']);
		expect(m.trace.file_ids).toEqual(['f1']);
		for (const s of m.supporting_context) {
			expect(s.source_id).toMatch(/./);
			expect(s.reference_text.length).toBeGreaterThan(0);
		}
	});

	it('determinism: same inputs produce identical output excluding generated_at', () => {
		const input = {
			caseId: 'c1',
			timelineEntries: [
				entry({ id: 'x', occurred_at: '2026-01-01T00:00:00.000Z', text_original: 'a' }),
				entry({ id: 'y', occurred_at: '2026-01-02T00:00:00.000Z', text_original: 'b' })
			],
			tasks: [task({ id: 't2', title: 'z' })],
			files: [file({ id: 'f9', original_filename: 'n.pdf' })],
			fileExtractedTextByFileId: { f9: 'hello\nworld' },
			generatedAtIso: 'IGNORED-A'
		};
		const a = caseSynthesisReadModelWithoutGeneratedAt(
			buildCaseSynthesisReadModelFromSnapshot({ ...input, generatedAtIso: '2026-04-01T00:00:00.111Z' })
		);
		const b = caseSynthesisReadModelWithoutGeneratedAt(
			buildCaseSynthesisReadModelFromSnapshot({ ...input, generatedAtIso: '2026-04-01T00:00:00.222Z' })
		);
		expect(a).toEqual(b);
	});

	it('authority: tasks never appear in timeline_facts; timeline never in supporting_context', () => {
		const m = buildCaseSynthesisReadModelFromSnapshot({
			caseId: 'c1',
			timelineEntries: [entry({ id: 'e99', occurred_at: '2026-01-01T00:00:00.000Z', text_original: 'fact' })],
			tasks: [task({ id: 'task-1', title: 'ops' })],
			files: [],
			generatedAtIso: '2026-01-01T00:00:00.000Z'
		});
		expect(m.timeline_facts.every((f) => f.source_type === 'timeline')).toBe(true);
		expect(m.timeline_facts.some((f) => f.entry_id === 'task-1')).toBe(false);
		expect(
			m.supporting_context.every(
				(s) => s.source_type === 'task' || s.source_type === 'file' || s.source_type === 'extracted_text'
			)
		).toBe(true);
		expect(m.supporting_context.filter((s) => s.source_type === 'task').map((s) => s.source_id)).toEqual([
			'task-1'
		]);
		expect(m.gaps_and_unknowns).toEqual([]);
	});

	it('includes extracted_text supporting rows when map provided (deterministic cap behavior)', () => {
		const long = 'x'.repeat(5000);
		const m = buildCaseSynthesisReadModelFromSnapshot({
			caseId: 'c1',
			timelineEntries: [entry({ id: 'e1', occurred_at: '2026-01-01T00:00:00.000Z', text_original: 't' })],
			tasks: [],
			files: [file({ id: 'f1' })],
			fileExtractedTextByFileId: { f1: long },
			generatedAtIso: '2026-01-01T00:00:00.000Z'
		});
		const ext = m.supporting_context.filter((s) => s.source_type === 'extracted_text');
		expect(ext).toHaveLength(1);
		expect(ext[0]!.reference_text.length).toBe(4000);
	});
});

describe('buildCaseSynthesisReadModel async (P96-01)', () => {
	it('non-mutation: only read-style deps are invoked (no POST/DELETE paths in deps)', async () => {
		const listTimeline = vi.fn(async () => [] as TimelineEntry[]);
		const listTasks = vi.fn(async () => [] as CaseEngineCaseTask[]);
		const listFiles = vi.fn(async () => [] as CaseFile[]);
		const getFileText = vi.fn(async () => ({ extracted_text: '' }));

		await buildCaseSynthesisReadModel('case-x', 'tok', {
			generatedAtIso: '2026-01-01T00:00:00.000Z',
			deps: { listTimeline, listTasks, listFiles, getFileText }
		});

		expect(listTimeline).toHaveBeenCalledTimes(1);
		expect(listTasks).toHaveBeenCalledTimes(1);
		expect(listFiles).toHaveBeenCalledTimes(1);
		expect(getFileText).not.toHaveBeenCalled();

		await buildCaseSynthesisReadModel('case-x', 'tok', {
			generatedAtIso: '2026-01-01T00:00:00.000Z',
			includeFileExtractedText: true,
			deps: {
				listTimeline,
				listTasks,
				listFiles: async () => [file({ id: 'f1' })],
				getFileText
			}
		});
		expect(getFileText).toHaveBeenCalledWith('f1', 'tok');
	});

	it('aggregates mocked sources into a valid model', async () => {
		const m = await buildCaseSynthesisReadModel('case-z', 'tok', {
			generatedAtIso: '2026-06-01T00:00:00.000Z',
			deps: {
				listTimeline: async () => [
					entry({ id: 'en1', occurred_at: '2026-01-02T00:00:00.000Z', text_original: 'alpha' })
				],
				listTasks: async () => [task({ id: 'tn1', title: 'task title' })],
				listFiles: async () => [file({ id: 'fn1', original_filename: 'z.txt' })],
				getFileText: async () => ({ extracted_text: '' })
			}
		});
		expect(m.timeline_facts).toHaveLength(1);
		expect(m.supporting_context.some((s) => s.source_type === 'task')).toBe(true);
		expect(m.supporting_context.some((s) => s.source_type === 'file')).toBe(true);
	});
});

describe('normalizeSynthesisReferenceText', () => {
	it('trims and collapses whitespace', () => {
		expect(normalizeSynthesisReferenceText('  a \n b  ')).toBe('a b');
	});
});
