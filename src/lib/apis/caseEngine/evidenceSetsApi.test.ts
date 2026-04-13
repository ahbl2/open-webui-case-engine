import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createEvidenceSet,
	getEvidenceSetDetail,
	getEvidenceSetExpanded,
	getEvidenceSetsList
} from './evidenceSetsApi';

describe('evidenceSetsApi (P109-03 / P109-04)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('getEvidenceSetsList GETs evidence-sets and filters mismatched case_id', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				expect(url).toContain('/cases/case-a/evidence-sets');
				return new Response(
					JSON.stringify({
						evidence_sets: [
							{
								id: 's1',
								case_id: 'case-a',
								name: 'A',
								created_by: 'u1',
								created_at: '2020-01-01T00:00:00.000Z',
								updated_at: '2020-01-01T00:00:00.000Z',
								deleted_at: null
							},
							{
								id: 'bad',
								case_id: 'other',
								name: 'X',
								created_by: 'u1',
								created_at: '2020-01-01T00:00:00.000Z',
								updated_at: '2020-01-01T00:00:00.000Z',
								deleted_at: null
							}
						]
					}),
					{ status: 200 }
				);
			})
		);

		const list = await getEvidenceSetsList('case-a', 'tok');
		expect(list.map((s) => s.id)).toEqual(['s1']);
	});

	it('createEvidenceSet POSTs name and items; returns evidence_set with items', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init: RequestInit) => {
				expect(url).toContain('/cases/case-a/evidence-sets');
				expect(init.method).toBe('POST');
				const body = JSON.parse(String(init.body));
				expect(body.name).toBe('Bundle');
				expect(body.items).toEqual([{ kind: 'timeline_entry', source_id: 'e1' }]);
				return new Response(
					JSON.stringify({
						evidence_set: {
							id: 'new1',
							case_id: 'case-a',
							name: 'Bundle',
							created_by: 'u',
							created_at: '2020-01-02T00:00:00.000Z',
							updated_at: '2020-01-02T00:00:00.000Z',
							deleted_at: null,
							items: [
								{
									id: 'i1',
									evidence_set_id: 'new1',
									case_id: 'case-a',
									item_kind: 'timeline_entry',
									source_id: 'e1',
									created_at: '2020-01-02T00:00:00.000Z'
								}
							]
						}
					}),
					{ status: 201 }
				);
			})
		);

		const created = await createEvidenceSet('case-a', 'tok', {
			name: 'Bundle',
			items: [{ kind: 'timeline_entry', source_id: 'e1' }]
		});
		expect(created.id).toBe('new1');
		expect(created.items).toHaveLength(1);
		expect(created.items[0].source_id).toBe('e1');
	});

	it('getEvidenceSetDetail returns null on 404', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ error: 'Evidence set not found' }), { status: 404 }))
		);
		const d = await getEvidenceSetDetail('case-a', 'set-x', 'tok');
		expect(d).toBeNull();
	});

	it('getEvidenceSetDetail GETs by case and set id and unwraps evidence_set', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				expect(url).toContain('/cases/case-a/evidence-sets/set-1');
				return new Response(
					JSON.stringify({
						evidence_set: {
							id: 'set-1',
							case_id: 'case-a',
							name: 'Bundle',
							created_by: 'u',
							created_at: '2020-01-01T00:00:00.000Z',
							updated_at: '2020-01-01T00:00:00.000Z',
							deleted_at: null,
							items: [
								{
									id: 'i2',
									evidence_set_id: 'set-1',
									case_id: 'case-a',
									item_kind: 'timeline_entry',
									source_id: 't1',
									created_at: '2020-01-01T00:00:00.000Z'
								},
								{
									id: 'i1',
									evidence_set_id: 'set-1',
									case_id: 'case-a',
									item_kind: 'file',
									source_id: 'f1',
									created_at: '2020-01-01T00:00:00.000Z'
								}
							]
						}
					}),
					{ status: 200 }
				);
			})
		);

		const d = await getEvidenceSetDetail('case-a', 'set-1', 'tok');
		expect(d?.id).toBe('set-1');
		expect(d?.items).toHaveLength(2);
	});
});

describe('evidenceSetsApi (P110-02 expanded)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('getEvidenceSetExpanded returns null on 404', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ error: 'Evidence set not found' }), { status: 404 }))
		);
		const x = await getEvidenceSetExpanded('case-a', 'set-x', 'tok');
		expect(x).toBeNull();
	});

	it('getEvidenceSetExpanded GETs expanded path and validates shape', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				expect(url).toContain('/cases/case-a/evidence-sets/set-1/expanded');
				return new Response(
					JSON.stringify({
						evidence_set: {
							id: 'set-1',
							case_id: 'case-a',
							name: 'Bundle',
							created_at: '2020-01-01T00:00:00.000Z',
							created_by: 'u'
						},
						timeline_entries: [
							{
								source_id: 'te1',
								occurred_at: '2020-01-01T00:00:00.000Z',
								created_at: '2020-01-01T00:00:00.000Z',
								created_by: 'u',
								type: 'OBSERVATION',
								text_original: 'Hello'
							}
						],
						files: [
							{
								source_id: 'f1',
								original_filename: 'a.pdf',
								mime_type: 'application/pdf',
								uploaded_by: 'u',
								uploaded_at: '2020-01-02T00:00:00.000Z',
								created_at: '2020-01-02T00:00:00.000Z'
							}
						],
						membership: [
							{ item_kind: 'timeline_entry', source_id: 'te1' },
							{ item_kind: 'file', source_id: 'f1' }
						]
					}),
					{ status: 200 }
				);
			})
		);

		const x = await getEvidenceSetExpanded('case-a', 'set-1', 'tok');
		expect(x?.evidence_set.id).toBe('set-1');
		expect(x?.timeline_entries).toHaveLength(1);
		expect(x?.timeline_entries[0].text_original).toBe('Hello');
		expect(x?.files).toHaveLength(1);
	});

	it('getEvidenceSetExpanded throws on 422', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response(JSON.stringify({ error: 'timeline membership references missing' }), { status: 422 })
			)
		);
		await expect(getEvidenceSetExpanded('case-a', 'set-1', 'tok')).rejects.toThrow(/timeline|422/i);
	});
});
