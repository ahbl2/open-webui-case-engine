/**
 * P64-10 — Case Intelligence Stage 1 client uses path-only `/case-api` URLs (no `new URL` without base).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

const stagingSample = {
	record_class: 'case_intelligence_staging',
	authority: 'non_authoritative',
	id: 's1',
	case_id: 'c1',
	status: 'draft',
	entity_kind: 'VEHICLE',
	person_identity_posture: null,
	proposed_display_label: 'V',
	proposed_core_attributes: {},
	created_by: 'u1',
	created_at: '2024-01-01T00:00:00Z',
	updated_by: null,
	updated_at: null,
	rejected_at: null,
	rejected_by: null,
	rejection_reason: null,
	committed_at: null,
	committed_by: null,
	result_entity_id: null
};

const entitySample = {
	record_class: 'case_intelligence_entity',
	authority: 'authoritative_case_intel',
	id: 'e1',
	case_id: 'c1',
	entity_kind: 'VEHICLE',
	person_identity_posture: null,
	display_label: 'V',
	core_attributes: {},
	committed_from_staging_id: 's1',
	created_by: 'u1',
	created_at: '2024-01-01T00:00:00Z',
	updated_by: null,
	updated_at: null,
	deleted_at: null,
	deleted_by: null
};

describe('Case Intelligence Stage 1 API client', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('listCaseIntelligenceStaging uses path-only URL and parses staging_records', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ staging_records: [stagingSample], non_authoritative_intel: true }));

		const { listCaseIntelligenceStaging } = await import('../index');
		const rows = await listCaseIntelligenceStaging('case-1', 'tok');
		const [url, init] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/case-1/intelligence/staging');
		expect((init as RequestInit).method).toBeUndefined();
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe('s1');
	});

	it('listCaseIntelligenceStaging appends status query when provided', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ staging_records: [] }));

		const { listCaseIntelligenceStaging } = await import('../index');
		await listCaseIntelligenceStaging('case-1', 'tok', { status: 'draft,pending' });
		const [url] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/case-1/intelligence/staging?status=draft%2Cpending');
	});

	it('createCaseIntelligenceStaging POSTs JSON body', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ staging_record: stagingSample, non_authoritative_intel: true }, 201));

		const { createCaseIntelligenceStaging } = await import('../index');
		const row = await createCaseIntelligenceStaging('case-1', 'tok', {
			entity_kind: 'VEHICLE',
			proposed_display_label: 'Test',
			proposed_core_attributes: { a: 1 }
		});
		expect(row.id).toBe('s1');
		const [, init] = fetchSpy.mock.calls[0];
		expect((init as RequestInit).method).toBe('POST');
		expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
			entity_kind: 'VEHICLE',
			proposed_display_label: 'Test',
			proposed_core_attributes: { a: 1 }
		});
	});

	it('commitCaseIntelligenceStaging POSTs to …/commit', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				committed_entity: entitySample,
				staging_record: { ...stagingSample, status: 'committed' },
				staging_resolution: 'committed'
			})
		);

		const { commitCaseIntelligenceStaging } = await import('../index');
		const out = await commitCaseIntelligenceStaging('case-1', 's1', 'tok');
		expect(out.committed_entity.id).toBe('e1');
		const [url] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/case-1/intelligence/staging/s1/commit');
	});

	it('getCaseIntelligenceCommittedEntity GETs entity detail path', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				authority: 'authoritative_case_intel',
				read_scope: 'include_retired',
				committed_entity: entitySample
			})
		);

		const { getCaseIntelligenceCommittedEntity } = await import('../index');
		const out = await getCaseIntelligenceCommittedEntity('case-1', 'e1', 'tok', { includeRetired: true });
		const [url] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/case-1/intelligence/entities/e1?include_retired=true');
		expect(out.committed_entity.id).toBe('e1');
		expect(out.read_scope).toBe('include_retired');
	});

	it('listCaseIntelligenceCommittedEntities passes include_retired and parses committed_entities', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				authority: 'authoritative_case_intel',
				list_scope: 'include_retired',
				entity_kind_filter: null,
				committed_entities: [entitySample]
			})
		);

		const { listCaseIntelligenceCommittedEntities } = await import('../index');
		const list = await listCaseIntelligenceCommittedEntities('case-1', 'tok', { includeRetired: true });
		const [url] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/case-1/intelligence/entities?include_retired=true');
		expect(list.list_scope).toBe('include_retired');
		expect(list.committed_entities).toHaveLength(1);
	});

	it('retireCaseIntelligenceEntity POSTs retire path', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				committed_entity: { ...entitySample, deleted_at: '2024-01-02T00:00:00Z' },
				lifecycle: 'retired',
				authority: 'authoritative_case_intel'
			})
		);

		const { retireCaseIntelligenceEntity } = await import('../index');
		const ent = await retireCaseIntelligenceEntity('case-1', 'e1', 'tok');
		expect(ent.deleted_at).toBeTruthy();
		const [url, init] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/case-1/intelligence/entities/e1/retire');
		expect((init as RequestInit).method).toBe('POST');
	});
});
