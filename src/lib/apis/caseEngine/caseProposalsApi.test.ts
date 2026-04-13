import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCaseProposalManual } from './caseProposalsApi';

describe('caseProposalsApi', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('createCaseProposalManual POSTs manual body to Case Engine', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init?: RequestInit) => {
				expect(url).toContain('/cases/case-1/case-proposals');
				expect(init?.method).toBe('POST');
				const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
				expect(body.creation_mode).toBe('manual');
				expect(body.proposal_type).toBe('task');
				expect((body.payload as { title: string }).title).toBe('T');
				return new Response(JSON.stringify({ case_proposal: { id: 'prop-1' } }), { status: 201 });
			})
		);

		const res = await createCaseProposalManual('case-1', 'tok', {
			creation_mode: 'manual',
			proposal_type: 'task',
			payload: { title: 'T' }
		});
		expect(res.id).toBe('prop-1');
	});

	it('createCaseProposalManual surfaces HTTP errors', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ error: 'bad' }), { status: 400 }))
		);
		await expect(
			createCaseProposalManual('case-1', 'tok', {
				creation_mode: 'manual',
				proposal_type: 'task',
				payload: { title: 'T' }
			})
		).rejects.toThrow(/bad/);
	});
});
