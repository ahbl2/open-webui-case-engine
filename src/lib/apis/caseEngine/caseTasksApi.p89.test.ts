/**
 * P89-07 — case tasks API client (mocked fetch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	listCaseTasks,
	createCaseTask,
	patchCaseTaskContent,
	postCaseTaskComplete,
	postCaseTaskSoftDelete,
	postCaseTaskRestore
} from './caseTasksApi';

describe('P89-07 caseTasksApi', () => {
	const origFetch = globalThis.fetch;

	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string | URL, init?: RequestInit) => {
				const u = String(url);
				if (
					u.includes('/case-api/cases/c1/case-tasks') &&
					!u.includes('/case-tasks/') &&
					(!init || init.method === undefined)
				) {
					return new Response(
						JSON.stringify({
							case_tasks: [
								{
									id: 'x',
									case_id: 'c1',
									title: 'T',
									description: null,
									status: 'OPEN',
									timeline_entry_id: null,
									created_at: 'a',
									created_by: 'u',
									updated_at: 'a',
									updated_by: 'u',
									completed_at: null,
									completed_by: null,
									archived_at: null,
									archived_by: null,
									deleted_at: null,
									deleted_by: null,
									assignee_user_id: null,
									assignee_display_name: null,
									due_date: null,
									priority: null
								}
							]
						}),
						{ status: 200 }
					);
				}
				if (u.endsWith('/case-api/cases/c1/case-tasks') && init?.method === 'POST') {
					return new Response(
						JSON.stringify({
							case_task: {
								id: 'new',
								case_id: 'c1',
								title: 'T',
								description: null,
								status: 'OPEN',
								timeline_entry_id: null,
								created_at: 'a',
								created_by: 'u',
								updated_at: 'a',
								updated_by: 'u',
								completed_at: null,
								completed_by: null,
								archived_at: null,
								archived_by: null,
								deleted_at: null,
								deleted_by: null,
								assignee_user_id: null,
								assignee_display_name: null,
								due_date: null,
								priority: null
							}
						}),
						{ status: 201 }
					);
				}
				if (u.includes('/case-tasks/t1') && init?.method === 'PATCH') {
					return new Response(JSON.stringify({ case_task: { id: 't1', title: 'Up' } }), { status: 200 });
				}
				if (u.includes('/complete')) {
					return new Response(JSON.stringify({ case_task: { id: 't1', status: 'COMPLETED' } }), { status: 200 });
				}
				if (u.includes('/delete')) {
					return new Response(JSON.stringify({ case_task: { id: 't1', deleted_at: 'd' } }), { status: 200 });
				}
				if (u.includes('/restore')) {
					return new Response(JSON.stringify({ case_task: { id: 't1', deleted_at: null } }), { status: 200 });
				}
				return new Response(JSON.stringify({ error: 'denied' }), { status: 403 });
			}) as typeof fetch
		);
	});

	afterEach(() => {
		globalThis.fetch = origFetch;
		vi.unstubAllGlobals();
	});

	it('listCaseTasks returns case_tasks array', async () => {
		const rows = await listCaseTasks('c1', 'tok');
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe('x');
	});

	it('listCaseTasks includeDeleted appends query param', async () => {
		const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
		await listCaseTasks('c1', 'tok', { includeDeleted: true });
		const url = String(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0]);
		expect(url).toContain('include_deleted=1');
	});

	it('createCaseTask returns case_task', async () => {
		const row = await createCaseTask('c1', 'tok', { title: 'T' });
		expect(row.id).toBe('new');
	});

	it('patchCaseTaskContent returns case_task', async () => {
		const row = await patchCaseTaskContent('c1', 't1', 'tok', { title: 'Up' });
		expect(row.title).toBe('Up');
	});

	it('postCaseTaskComplete returns payload', async () => {
		const row = await postCaseTaskComplete('c1', 't1', 'tok');
		expect(row.status).toBe('COMPLETED');
	});

	it('throws on failed list', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ error: 'denied' }), { status: 403 })) as typeof fetch
		);
		await expect(listCaseTasks('c1', 'tok')).rejects.toThrow();
	});

	it('soft delete and restore', async () => {
		const d = await postCaseTaskSoftDelete('c1', 't1', 'tok');
		expect(d.deleted_at).toBe('d');
		const r = await postCaseTaskRestore('c1', 't1', 'tok');
		expect(r.deleted_at).toBeNull();
	});
});
