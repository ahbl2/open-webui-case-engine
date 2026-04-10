/**
 * P66-10 — Association API client uses path-only `/case-api` URLs (Stage 2 spine).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

const assocStagingSample = {
	record_class: 'case_intelligence_association_staging',
	authority: 'non_authoritative',
	id: 'as1',
	case_id: 'c1',
	status: 'pending',
	association_kind: 'KNOWS',
	endpoint_a_entity_id: 'e1',
	endpoint_b_entity_id: 'e2',
	assertion_lane: 'HYPOTHESIS',
	proposed_notes: null,
	proposed_attributes: {},
	created_by: 'u1',
	created_at: '2024-01-01T00:00:00Z',
	updated_by: null,
	updated_at: null,
	rejected_at: null,
	rejected_by: null,
	rejection_reason: null,
	committed_at: null,
	committed_by: null,
	result_association_id: null
};

const assocCommittedSample = {
	record_class: 'case_intelligence_association',
	authority: 'authoritative_case_intel',
	id: 'ca1',
	case_id: 'c1',
	association_kind: 'KNOWS',
	endpoint_a_entity_id: 'e1',
	endpoint_b_entity_id: 'e2',
	assertion_lane: 'HYPOTHESIS',
	association_active: true,
	endpoint_a_retired: false,
	endpoint_b_retired: false,
	created_by: 'u1',
	created_at: '2024-01-01T00:00:00Z',
	deleted_at: null,
	deleted_by: null
};

describe('Case Intelligence Stage 2 associations API client', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('listCaseIntelligenceAssociationStaging lists association_staging_records', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ association_staging_records: [assocStagingSample], non_authoritative_intel: true })
		);
		const { listCaseIntelligenceAssociationStaging } = await import('../index');
		const rows = await listCaseIntelligenceAssociationStaging('case-1', 'tok');
		expect(fetchSpy.mock.calls[0][0]).toBe('/case-api/cases/case-1/intelligence/association-staging');
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe('as1');
	});

	it('createCaseIntelligenceAssociationStaging POSTs association-staging', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ association_staging_record: assocStagingSample, non_authoritative_intel: true }, 201)
		);
		const { createCaseIntelligenceAssociationStaging } = await import('../index');
		const row = await createCaseIntelligenceAssociationStaging('case-1', 'tok', {
			association_kind: 'KNOWS',
			endpoint_a_entity_id: 'e1',
			endpoint_b_entity_id: 'e2',
			assertion_lane: 'SETTLED'
		});
		expect(row.id).toBe('as1');
		const [, init] = fetchSpy.mock.calls[0];
		expect((init as RequestInit).method).toBe('POST');
		expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
			association_kind: 'KNOWS',
			assertion_lane: 'SETTLED'
		});
	});

	it('commitCaseIntelligenceAssociationStaging POSTs …/association-staging/:id/commit', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				committed_association: assocCommittedSample,
				association_staging_record: { ...assocStagingSample, status: 'committed' },
				staging_resolution: 'committed'
			})
		);
		const { commitCaseIntelligenceAssociationStaging } = await import('../index');
		const out = await commitCaseIntelligenceAssociationStaging('case-1', 'as1', 'tok');
		expect(out.committed_association.id).toBe('ca1');
		expect(fetchSpy.mock.calls[0][0]).toBe('/case-api/cases/case-1/intelligence/association-staging/as1/commit');
	});

	it('listCaseIntelligenceCommittedAssociations passes include_retired', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				authority: 'authoritative_case_intel',
				list_scope: 'include_retired',
				association_incident_filter: 'all',
				association_kind_filter: null,
				assertion_lane_filter: null,
				committed_associations: [assocCommittedSample]
			})
		);
		const { listCaseIntelligenceCommittedAssociations } = await import('../index');
		const list = await listCaseIntelligenceCommittedAssociations('case-1', 'tok', { includeRetired: true });
		expect(fetchSpy.mock.calls[0][0]).toBe('/case-api/cases/case-1/intelligence/associations?include_retired=true');
		expect(list.list_scope).toBe('include_retired');
		expect(list.committed_associations).toHaveLength(1);
	});

	it('listCaseIntelligenceAssociationsForEntity uses entity adjacency path', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				anchor_entity_id: 'e1',
				authority: 'authoritative_case_intel',
				list_scope: 'active_only',
				association_incident_filter: 'all',
				committed_associations: [assocCommittedSample]
			})
		);
		const { listCaseIntelligenceAssociationsForEntity } = await import('../index');
		const out = await listCaseIntelligenceAssociationsForEntity('case-1', 'e1', 'tok');
		expect(fetchSpy.mock.calls[0][0]).toBe('/case-api/cases/case-1/intelligence/entities/e1/associations');
		expect(out.anchor_entity_id).toBe('e1');
		expect(out.committed_associations).toHaveLength(1);
	});

	it('retireCaseIntelligenceAssociation POSTs retire path', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				committed_association: { ...assocCommittedSample, deleted_at: '2024-02-01T00:00:00Z' },
				lifecycle: 'retired'
			})
		);
		const { retireCaseIntelligenceAssociation } = await import('../index');
		const row = await retireCaseIntelligenceAssociation('case-1', 'ca1', 'tok');
		expect(row.deleted_at).toBeTruthy();
		expect(fetchSpy.mock.calls[0][0]).toBe('/case-api/cases/case-1/intelligence/associations/ca1/retire');
	});
});
