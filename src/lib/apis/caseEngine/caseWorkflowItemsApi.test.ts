/**
 * P117-04 — Case workflow items API client (Phase 117 routes only).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createCaseWorkflowItem,
	listCaseWorkflowItems,
	updateCaseWorkflowItem
} from './caseWorkflowItemsApi';

const here = dirname(fileURLToPath(import.meta.url));
const apiPath = join(here, 'caseWorkflowItemsApi.ts');

describe('caseWorkflowItemsApi.ts (static)', () => {
	const src = readFileSync(apiPath, 'utf8');

	it('targets Phase 117 case-workflow-items only (not legacy P13 workflow-items without case- prefix)', () => {
		expect(src).toContain('case-workflow-items');
		expect(src.match(/\`\/cases\/\$\{[^}]+\}\/workflow-items\`/g) ?? []).toHaveLength(0);
	});

	it('uses GET with safeReadFetch for list', () => {
		expect(src).toContain("method: 'GET'");
		expect(src).toContain('safeReadFetch');
		expect(src).toContain('listCaseWorkflowItems');
	});

	it('createCaseWorkflowItem builds POST body from workflow_type, title, optional description/status only', () => {
		expect(src).toContain('workflow_type: payload.workflow_type');
		expect(src).toContain('title: payload.title');
	});
});

describe('caseWorkflowItemsApi (fetch)', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							case_workflow_items: [
								{
									workflow_item_id: 'w1',
									case_id: 'c1',
									workflow_type: 'TASK',
									title: 'T',
									description: null,
									status: 'OPEN',
									created_at: 'x',
									created_by: 'u1',
									updated_at: 'y',
									updated_by: 'u1',
									deleted_at: null
								}
							]
						}),
						{ status: 200, headers: { 'Content-Type': 'application/json' } }
					)
				)
			)
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('listCaseWorkflowItems GETs case-workflow-items', async () => {
		const rows = await listCaseWorkflowItems('c1', 'tok');
		expect(rows.length).toBe(1);
		expect(rows[0].workflow_item_id).toBe('w1');
		const call = vi.mocked(fetch).mock.calls[0];
		expect(String(call[0])).toMatch(/\/cases\/c1\/case-workflow-items$/);
		expect((call[1] as RequestInit).method).toBe('GET');
	});

	it('createCaseWorkflowItem POSTs workflow_type and title only when status omitted', async () => {
		vi.mocked(fetch).mockImplementationOnce(async () =>
			Promise.resolve(
				new Response(
					JSON.stringify({
						case_workflow_item: {
							workflow_item_id: 'w2',
							case_id: 'c1',
							workflow_type: 'LEAD',
							title: 'L',
							description: null,
							status: 'OPEN',
							created_at: 'x',
							created_by: 'u1',
							updated_at: 'y',
							updated_by: 'u1',
							deleted_at: null
						}
					}),
					{ status: 201, headers: { 'Content-Type': 'application/json' } }
				)
			)
		);
		await createCaseWorkflowItem('c1', 'tok', { workflow_type: 'LEAD', title: 'L' });
		const call = vi.mocked(fetch).mock.calls[vi.mocked(fetch).mock.calls.length - 1];
		expect((call[1] as RequestInit).method).toBe('POST');
		expect(String((call[1] as RequestInit).body)).toBe(JSON.stringify({ workflow_type: 'LEAD', title: 'L' }));
	});

	it('updateCaseWorkflowItem PUTs to /case-workflow-items/:id', async () => {
		vi.mocked(fetch).mockImplementationOnce(async () =>
			Promise.resolve(
				new Response(
					JSON.stringify({
						case_workflow_item: {
							workflow_item_id: 'w2',
							case_id: 'c1',
							workflow_type: 'TASK',
							title: 'U',
							description: null,
							status: 'CLOSED',
							created_at: 'x',
							created_by: 'u1',
							updated_at: 'y',
							updated_by: 'u1',
							deleted_at: null
						}
					}),
					{ status: 200, headers: { 'Content-Type': 'application/json' } }
				)
			)
		);
		await updateCaseWorkflowItem('c1', 'w2', 'tok', { status: 'CLOSED' });
		const call = vi.mocked(fetch).mock.calls[vi.mocked(fetch).mock.calls.length - 1];
		expect(String(call[0])).toMatch(/\/case-workflow-items\/w2$/);
		expect((call[1] as RequestInit).method).toBe('PUT');
		expect(String((call[1] as RequestInit).body)).toBe(JSON.stringify({ status: 'CLOSED' }));
	});
});
