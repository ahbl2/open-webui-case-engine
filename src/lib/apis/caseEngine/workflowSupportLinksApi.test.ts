/**
 * P60-04 — support link API client (contract from P60-03).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createWorkflowSupportLink,
	deleteWorkflowSupportLink,
	listWorkflowSupportLinks,
	CaseEngineRequestError
} from './index';

describe('workflow support links API client', () => {
	const origFetch = globalThis.fetch;

	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		globalThis.fetch = origFetch;
	});

	it('listWorkflowSupportLinks returns support_links array', async () => {
		const links = [
			{
				id: 'L1',
				workflow_item_id: 'W1',
				case_id: 'C1',
				target_kind: 'TIMELINE_ENTRY' as const,
				target_id: 'E1',
				display_position: 0,
				created_by: 'u1',
				created_at: '2026-01-01T00:00:00Z',
				target_availability: 'ACTIVE' as const
			}
		];
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(JSON.stringify({ support_links: links }), { status: 200 })
		);
		const out = await listWorkflowSupportLinks('C1', 'W1', 'tok');
		expect(out).toEqual(links);
	});

	it('createWorkflowSupportLink throws CaseEngineRequestError with 409 on duplicate', async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(JSON.stringify({ error: 'Support link already exists for this target' }), {
				status: 409
			})
		);
		await expect(
			createWorkflowSupportLink('C1', 'W1', 'tok', {
				target_kind: 'CASE_FILE',
				target_id: 'F1'
			})
		).rejects.toMatchObject({
			name: 'CaseEngineRequestError',
			httpStatus: 409,
			message: 'Support link already exists for this target'
		});
	});

	it('createWorkflowSupportLink throws CaseEngineRequestError with 400 on max links', async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(JSON.stringify({ error: 'Maximum support links per workflow item (100) reached' }), {
				status: 400
			})
		);
		await expect(
			createWorkflowSupportLink('C1', 'W1', 'tok', {
				target_kind: 'CASE_FILE',
				target_id: 'F1'
			})
		).rejects.toMatchObject({
			name: 'CaseEngineRequestError',
			httpStatus: 400,
			message: 'Maximum support links per workflow item (100) reached'
		});
	});

	it('deleteWorkflowSupportLink surfaces 403 message', async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
			new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 })
		);
		await expect(deleteWorkflowSupportLink('C1', 'W1', 'L1', 'tok')).rejects.toSatisfy(
			(e): e is CaseEngineRequestError =>
				e instanceof CaseEngineRequestError && e.httpStatus === 403 && e.message === 'Access denied'
		);
	});
});
