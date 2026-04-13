import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createCaseEntity,
	createCaseEntityEvidenceLink,
	getCaseEntitiesList,
	getCaseEntityDetail,
	patchCaseEntity,
	removeCaseEntityEvidenceLink,
	restoreCaseEntity,
	retireCaseEntity
} from './caseEntitiesApi';

describe('caseEntitiesApi (P106-02)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('getCaseEntitiesList GETs case-entities and returns server order (no client sort)', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				expect(url).toContain('/cases/case-a/case-entities');
				expect(url).not.toContain('include_retired');
				return new Response(
					JSON.stringify({
						case_entities: [
							{
								id: 'e2',
								case_id: 'case-a',
								entity_type: 'b',
								display_label: 'Second',
								attributes: {},
								created_at: '2020-01-01T00:00:00.000Z',
								created_by: 'u',
								updated_at: '2020-01-01T00:00:00.000Z',
								updated_by: null,
								deleted_at: null,
								deleted_by: null
							},
							{
								id: 'e1',
								case_id: 'case-a',
								entity_type: 'a',
								display_label: 'First',
								attributes: {},
								created_at: '2020-01-02T00:00:00.000Z',
								created_by: 'u',
								updated_at: '2020-01-02T00:00:00.000Z',
								updated_by: null,
								deleted_at: null,
								deleted_by: null
							}
						]
					}),
					{ status: 200 }
				);
			})
		);

		const list = await getCaseEntitiesList('case-a', 'tok');
		expect(list.map((e) => e.id)).toEqual(['e2', 'e1']);
	});

	it('getCaseEntitiesList filters out rows with mismatched case_id', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response(
					JSON.stringify({
						case_entities: [
							{
								id: 'e1',
								case_id: 'case-a',
								entity_type: 't',
								display_label: 'L',
								attributes: {},
								created_at: '2020-01-01T00:00:00.000Z',
								created_by: 'u',
								updated_at: '2020-01-01T00:00:00.000Z',
								updated_by: null,
								deleted_at: null,
								deleted_by: null
							},
							{
								id: 'bad',
								case_id: 'other',
								entity_type: 't',
								display_label: 'X',
								attributes: {},
								created_at: '2020-01-01T00:00:00.000Z',
								created_by: 'u',
								updated_at: '2020-01-01T00:00:00.000Z',
								updated_by: null,
								deleted_at: null,
								deleted_by: null
							}
						]
					}),
					{ status: 200 }
				)
			)
		);

		const list = await getCaseEntitiesList('case-a', 'tok');
		expect(list.map((e) => e.id)).toEqual(['e1']);
	});

	it('getCaseEntitiesList passes include_retired when requested', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				expect(url).toContain('include_retired=1');
				return new Response(JSON.stringify({ case_entities: [] }), { status: 200 });
			})
		);
		await getCaseEntitiesList('case-a', 'tok', { includeRetired: true });
	});

	it('getCaseEntitiesList surfaces HTTP errors without raw body leakage', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 }))
		);
		await expect(getCaseEntitiesList('case-a', 'tok')).rejects.toThrow(/403|Access denied|Could not load entities/i);
	});

	it('getCaseEntityDetail GETs case-entities/:entityId and preserves evidence link order', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				expect(url).toContain('/cases/case-a/case-entities/e1');
				expect(url).not.toContain('include_retired');
				return new Response(
					JSON.stringify({
						case_entity: {
							id: 'e1',
							case_id: 'case-a',
							entity_type: 'person',
							display_label: 'X',
							attributes: { role: 'witness' },
							created_at: '2020-01-01T00:00:00.000Z',
							created_by: 'u',
							updated_at: '2020-01-01T00:00:00.000Z',
							updated_by: null,
							deleted_at: null,
							deleted_by: null
						},
						evidence_links: [
							{
								id: 'l2',
								case_id: 'case-a',
								case_entity_id: 'e1',
								link_type: 'case_file',
								target_id: 'f1',
								created_at: '2020-01-01T00:00:00.000Z',
								created_by: 'u',
								deleted_at: null,
								deleted_by: null,
								target_label: 'a.pdf',
								target_status: 'active'
							},
							{
								id: 'l1',
								case_id: 'case-a',
								case_entity_id: 'e1',
								link_type: 'timeline_entry',
								target_id: 't1',
								created_at: '2020-01-01T00:00:00.000Z',
								created_by: 'u',
								deleted_at: null,
								deleted_by: null,
								target_label: '2020-01-01 OBS',
								target_status: 'active'
							}
						]
					}),
					{ status: 200 }
				);
			})
		);

		const d = await getCaseEntityDetail('case-a', 'e1', 'tok');
		expect(d.case_entity.display_label).toBe('X');
		expect(d.evidence_links.map((x) => x.id)).toEqual(['l2', 'l1']);
	});
});

describe('caseEntitiesApi (P107-01)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('createCaseEntity POSTs /cases/:id/case-entities with body fields', async () => {
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			expect(url).toContain('/cases/case-a/case-entities');
			expect(url).not.toContain('/case-entities/');
			expect(init?.method).toBe('POST');
			expect(init?.body).toBe(
				JSON.stringify({
					entity_type: 'person',
					display_label: 'Label',
					attributes: { role: 'witness' }
				})
			);
			return new Response(
				JSON.stringify({
					case_entity: {
						id: 'new-id',
						case_id: 'case-a',
						entity_type: 'person',
						display_label: 'Label',
						attributes: { role: 'witness' },
						created_at: '2020-01-01T00:00:00.000Z',
						created_by: 'u',
						updated_at: '2020-01-01T00:00:00.000Z',
						updated_by: null,
						deleted_at: null,
						deleted_by: null
					}
				}),
				{ status: 201 }
			);
		});
		vi.stubGlobal('fetch', fetchMock);

		const e = await createCaseEntity('case-a', 'tok', {
			entity_type: 'person',
			display_label: 'Label',
			attributes: { role: 'witness' }
		});
		expect(e.id).toBe('new-id');
		expect(e.case_id).toBe('case-a');
	});

	it('patchCaseEntity PATCHes /cases/:id/case-entities/:entityId', async () => {
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			expect(url).toContain('/cases/case-a/case-entities/e1');
			expect(init?.method).toBe('PATCH');
			expect(init?.body).toBe(
				JSON.stringify({
					entity_type: 'person',
					display_label: 'X',
					attributes: {}
				})
			);
			return new Response(
				JSON.stringify({
					case_entity: {
						id: 'e1',
						case_id: 'case-a',
						entity_type: 'person',
						display_label: 'X',
						attributes: {},
						created_at: '2020-01-01T00:00:00.000Z',
						created_by: 'u',
						updated_at: '2020-01-02T00:00:00.000Z',
						updated_by: 'u',
						deleted_at: null,
						deleted_by: null
					},
					mutated: true
				}),
				{ status: 200 }
			);
		});
		vi.stubGlobal('fetch', fetchMock);

		const r = await patchCaseEntity('case-a', 'e1', 'tok', {
			entity_type: 'person',
			display_label: 'X',
			attributes: {}
		});
		expect(r.case_entity.display_label).toBe('X');
		expect(r.mutated).toBe(true);
	});

	it('createCaseEntity rejects mismatched case_id in response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response(
					JSON.stringify({
						case_entity: {
							id: 'x',
							case_id: 'other',
							entity_type: 't',
							display_label: 'L',
							attributes: {},
							created_at: '2020-01-01T00:00:00.000Z',
							created_by: 'u',
							updated_at: '2020-01-01T00:00:00.000Z',
							updated_by: null,
							deleted_at: null,
							deleted_by: null
						}
					}),
					{ status: 201 }
				)
			)
		);
		await expect(
			createCaseEntity('case-a', 'tok', { entity_type: 't', display_label: 'L', attributes: {} })
		).rejects.toThrow(/did not match this case/i);
	});

	it('getCaseEntityDetail passes include_retired=1 when requested', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				expect(url).toContain('include_retired=1');
				return new Response(
					JSON.stringify({
						case_entity: {
							id: 'e1',
							case_id: 'case-a',
							entity_type: 't',
							display_label: 'L',
							attributes: {},
							created_at: '2020-01-01T00:00:00.000Z',
							created_by: 'u',
							updated_at: '2020-01-01T00:00:00.000Z',
							updated_by: null,
							deleted_at: '2020-01-02T00:00:00.000Z',
							deleted_by: 'u'
						},
						evidence_links: []
					}),
					{ status: 200 }
				);
			})
		);
		const d = await getCaseEntityDetail('case-a', 'e1', 'tok', { includeRetired: true });
		expect(d.case_entity.deleted_at).not.toBeNull();
	});

	it('retireCaseEntity POSTs retire with empty JSON body', async () => {
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			expect(url).toContain('/cases/case-a/case-entities/e1/retire');
			expect(init?.method).toBe('POST');
			expect(init?.body).toBe('{}');
			return new Response(
				JSON.stringify({
					case_entity: {
						id: 'e1',
						case_id: 'case-a',
						entity_type: 't',
						display_label: 'L',
						attributes: {},
						created_at: '2020-01-01T00:00:00.000Z',
						created_by: 'u',
						updated_at: '2020-01-02T00:00:00.000Z',
						updated_by: 'u',
						deleted_at: '2020-01-02T00:00:00.000Z',
						deleted_by: 'u'
					}
				}),
				{ status: 200 }
			);
		});
		vi.stubGlobal('fetch', fetchMock);
		const e = await retireCaseEntity('case-a', 'e1', 'tok');
		expect(e.deleted_at).not.toBeNull();
	});

	it('restoreCaseEntity POSTs restore with empty JSON body', async () => {
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			expect(url).toContain('/cases/case-a/case-entities/e1/restore');
			expect(init?.method).toBe('POST');
			expect(init?.body).toBe('{}');
			return new Response(
				JSON.stringify({
					case_entity: {
						id: 'e1',
						case_id: 'case-a',
						entity_type: 't',
						display_label: 'L',
						attributes: {},
						created_at: '2020-01-01T00:00:00.000Z',
						created_by: 'u',
						updated_at: '2020-01-03T00:00:00.000Z',
						updated_by: 'u',
						deleted_at: null,
						deleted_by: null
					}
				}),
				{ status: 200 }
			);
		});
		vi.stubGlobal('fetch', fetchMock);
		const e = await restoreCaseEntity('case-a', 'e1', 'tok');
		expect(e.deleted_at).toBeNull();
	});

	it('createCaseEntityEvidenceLink POSTs only link_type and target_id', async () => {
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			expect(url).toContain('/cases/case-a/case-entities/e1/evidence-links');
			expect(url).not.toContain('/evidence-links/');
			expect(init?.method).toBe('POST');
			expect(init?.body).toBe(JSON.stringify({ link_type: 'timeline_entry', target_id: 't1' }));
			return new Response(
				JSON.stringify({
					evidence_link: {
						id: 'L1',
						case_id: 'case-a',
						case_entity_id: 'e1',
						link_type: 'timeline_entry',
						target_id: 't1',
						created_at: '2020-01-01T00:00:00.000Z',
						created_by: 'u',
						deleted_at: null,
						deleted_by: null
					}
				}),
				{ status: 201 }
			);
		});
		vi.stubGlobal('fetch', fetchMock);
		const r = await createCaseEntityEvidenceLink('case-a', 'e1', 'tok', {
			link_type: 'timeline_entry',
			target_id: 't1'
		});
		expect(r.evidence_link.target_id).toBe('t1');
		expect(r.idempotent).toBe(false);
	});

	it('removeCaseEntityEvidenceLink POSTs remove with empty body', async () => {
		const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
			expect(url).toContain('/cases/case-a/case-entities/e1/evidence-links/L1/remove');
			expect(init?.method).toBe('POST');
			expect(init?.body).toBe('{}');
			return new Response(
				JSON.stringify({
					evidence_link: {
						id: 'L1',
						case_id: 'case-a',
						case_entity_id: 'e1',
						link_type: 'timeline_entry',
						target_id: 't1',
						created_at: '2020-01-01T00:00:00.000Z',
						created_by: 'u',
						deleted_at: '2020-01-02T00:00:00.000Z',
						deleted_by: 'u'
					}
				}),
				{ status: 200 }
			);
		});
		vi.stubGlobal('fetch', fetchMock);
		const row = await removeCaseEntityEvidenceLink('case-a', 'e1', 'L1', 'tok');
		expect(row.id).toBe('L1');
		expect(row.deleted_at).not.toBeNull();
	});
});
