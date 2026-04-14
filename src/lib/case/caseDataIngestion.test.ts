/**
 * P130-02 — buildCaseRetrievalBundle: structure, order, GET-only contracts (mocked APIs).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CaseFile } from '$lib/apis/caseEngine';
import * as caseEngine from '$lib/apis/caseEngine';
import * as caseEntitiesApi from '$lib/apis/caseEngine/caseEntitiesApi';
import * as caseWorkflowItemsApi from '$lib/apis/caseEngine/caseWorkflowItemsApi';
import { buildCaseRetrievalBundle, CASE_RETRIEVAL_LIMITS } from '$lib/case/caseDataIngestion';

vi.mock('$lib/apis/caseEngine', () => ({
	listCaseTimelineEntries: vi.fn(),
	listCaseNotebookNotes: vi.fn(),
	listCaseFilesPage: vi.fn(),
	getCaseFileText: vi.fn()
}));

vi.mock('$lib/apis/caseEngine/caseEntitiesApi', () => ({
	getCaseEntitiesList: vi.fn()
}));

vi.mock('$lib/apis/caseEngine/caseWorkflowItemsApi', () => ({
	listCaseWorkflowItems: vi.fn()
}));

const timelineEntry = (id: string, occurred_at: string) => ({
	id,
	case_id: 'case-a',
	occurred_at,
	created_at: '2020-01-01T00:00:00.000Z',
	created_by: 'u1',
	type: 'note',
	location_text: null,
	tags: [],
	text_original: 't',
	text_cleaned: null,
	deleted_at: null
});

const fileRow = (id: string): CaseFile => ({
	id,
	original_filename: 'a.txt',
	mime_type: 'text/plain',
	file_size_bytes: 1,
	uploaded_by: 'u1',
	uploaded_at: '2020-01-01T00:00:00.000Z'
});

describe('buildCaseRetrievalBundle', () => {
	beforeEach(() => {
		vi.mocked(caseEngine.listCaseTimelineEntries).mockResolvedValue([
			timelineEntry('e1', '2021-01-01T12:00:00.000Z')
		]);
		vi.mocked(caseEngine.listCaseNotebookNotes).mockResolvedValue([
			{
				id: 1,
				case_id: 'case-a',
				owner_user_id: 'u1',
				title: null,
				current_text: 'n',
				created_at: '2020-01-01T00:00:00.000Z',
				created_by: 'u1',
				updated_at: '2020-01-01T00:00:00.000Z',
				updated_by: 'u1',
				deleted_at: null,
				deleted_by: null
			}
		]);
		vi.mocked(caseEngine.listCaseFilesPage).mockResolvedValue({
			files: [fileRow('f1')],
			totalFiles: 1
		});
		vi.mocked(caseEngine.getCaseFileText).mockResolvedValue({
			fileId: 'f1',
			caseId: 'case-a',
			status: 'ok',
			message: null,
			extracted_text: 'hello',
			extracted_at: '2020-01-01T00:00:00.000Z',
			extracted_by: 'u1'
		});
		vi.mocked(caseEntitiesApi.getCaseEntitiesList).mockResolvedValue([
			{
				id: 'ent1',
				case_id: 'case-a',
				entity_type: 'person',
				display_label: 'X',
				attributes: {},
				created_at: '2020-01-01T00:00:00.000Z',
				created_by: 'u1',
				updated_at: '2020-01-01T00:00:00.000Z',
				updated_by: null,
				deleted_at: null,
				deleted_by: null
			}
		]);
		vi.mocked(caseWorkflowItemsApi.listCaseWorkflowItems).mockResolvedValue([
			{
				workflow_item_id: 'w1',
				case_id: 'case-a',
				workflow_type: 'TASK',
				title: 't',
				description: null,
				status: 'OPEN',
				created_at: '2020-01-01T00:00:00.000Z',
				created_by: 'u1',
				updated_at: '2020-01-01T00:00:00.000Z',
				updated_by: 'u1',
				deleted_at: null
			}
		]);
	});

	it('throws when case_id is missing', async () => {
		await expect(buildCaseRetrievalBundle('  ', 'tok')).rejects.toThrow(/case_id is required/);
	});

	it('throws when token is missing', async () => {
		await expect(buildCaseRetrievalBundle('case-a', '  ')).rejects.toThrow(/token is required/i);
	});

	it('returns a bundle with expected shape and trimmed case_id', async () => {
		const bundle = await buildCaseRetrievalBundle('  case-a  ', 'tok', {
			retrievedAtIso: '2026-01-01T00:00:00.000Z'
		});
		expect(bundle.case_id).toBe('case-a');
		expect(bundle.retrieved_at).toBe('2026-01-01T00:00:00.000Z');
		expect(Array.isArray(bundle.sources.timeline)).toBe(true);
		expect(Array.isArray(bundle.sources.notes)).toBe(true);
		expect(Array.isArray(bundle.sources.files)).toBe(true);
		expect(Array.isArray(bundle.sources.entities)).toBe(true);
		expect(Array.isArray(bundle.sources.workflow)).toBe(true);
		expect(bundle.sources.files[0]?.extracted_text).toBe('hello');
	});

	it('calls read APIs in sequential order (timeline → notes → files → text → entities → workflow)', async () => {
		const order: string[] = [];
		vi.mocked(caseEngine.listCaseTimelineEntries).mockImplementation(async () => {
			order.push('timeline');
			return [];
		});
		vi.mocked(caseEngine.listCaseNotebookNotes).mockImplementation(async () => {
			order.push('notes');
			return [];
		});
		vi.mocked(caseEngine.listCaseFilesPage).mockImplementation(async () => {
			order.push('files');
			return { files: [], totalFiles: 0 };
		});
		vi.mocked(caseEntitiesApi.getCaseEntitiesList).mockImplementation(async () => {
			order.push('entities');
			return [];
		});
		vi.mocked(caseWorkflowItemsApi.listCaseWorkflowItems).mockImplementation(async () => {
			order.push('workflow');
			return [];
		});
		await buildCaseRetrievalBundle('case-a', 'tok');
		expect(order).toEqual(['timeline', 'notes', 'files', 'entities', 'workflow']);
	});

	it('truncates timeline to max limit', async () => {
		const many = Array.from({ length: CASE_RETRIEVAL_LIMITS.maxTimelineEntries + 10 }, (_, i) =>
			timelineEntry(`e${i}`, '2021-01-01T12:00:00.000Z')
		);
		vi.mocked(caseEngine.listCaseTimelineEntries).mockResolvedValue(many);
		const bundle = await buildCaseRetrievalBundle('case-a', 'tok');
		expect(bundle.sources.timeline.length).toBe(CASE_RETRIEVAL_LIMITS.maxTimelineEntries);
	});

	it('records file text error without throwing (read-only failure)', async () => {
		vi.mocked(caseEngine.getCaseFileText).mockRejectedValue(new Error('no text'));
		const bundle = await buildCaseRetrievalBundle('case-a', 'tok');
		expect(bundle.sources.files[0]?.file_text_error).toMatch(/no text/);
		expect(bundle.sources.files[0]?.extracted_text).toBeUndefined();
	});

	it('propagates API failure from a required list call', async () => {
		vi.mocked(caseEngine.listCaseNotebookNotes).mockRejectedValue(new Error('notes failed'));
		await expect(buildCaseRetrievalBundle('case-a', 'tok')).rejects.toThrow(/notes failed/);
	});
});
