/**
 * P68-05 — Direct committed entity create client (`POST …/intelligence/entities`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

const directEntityPerson = {
	record_class: 'case_intelligence_entity',
	authority: 'authoritative_case_intel',
	id: 'ent-new',
	case_id: 'case-1',
	entity_kind: 'PERSON',
	person_identity_posture: 'IDENTIFIED',
	display_label: 'Jane',
	core_attributes: {},
	committed_from_staging_id: null,
	created_by: 'u1',
	created_at: '2024-01-01T00:00:00Z',
	updated_by: null,
	updated_at: null,
	deleted_at: null,
	deleted_by: null
};

describe('createCaseIntelligenceCommittedEntityDirect (P68-05)', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('POSTs committed-field body to …/intelligence/entities', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				authority: 'authoritative_case_intel',
				creation_mode: 'direct',
				committed_entity: directEntityPerson
			}, 201)
		);

		const { createCaseIntelligenceCommittedEntityDirect } = await import('../index');
		const out = await createCaseIntelligenceCommittedEntityDirect('case-1', 'tok', {
			entity_kind: 'PERSON',
			display_label: 'Jane',
			core_attributes: { phone: '+1' },
			person_identity_posture: 'IDENTIFIED'
		});
		expect(out.committed_entity.id).toBe('ent-new');
		expect(out.creation_mode).toBe('direct');
		const [url, init] = fetchSpy.mock.calls[0];
		expect(url).toBe('/case-api/cases/case-1/intelligence/entities');
		expect((init as RequestInit).method).toBe('POST');
		expect(JSON.parse((init as RequestInit).body as string)).toEqual({
			entity_kind: 'PERSON',
			display_label: 'Jane',
			core_attributes: { phone: '+1' },
			person_identity_posture: 'IDENTIFIED'
		});
	});

	it('VEHICLE payload uses person_identity_posture null', async () => {
		const veh = {
			...directEntityPerson,
			id: 'v1',
			entity_kind: 'VEHICLE',
			person_identity_posture: null,
			display_label: 'ABC-123'
		};
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				authority: 'authoritative_case_intel',
				creation_mode: 'direct',
				committed_entity: veh
			}, 201)
		);

		const { createCaseIntelligenceCommittedEntityDirect } = await import('../index');
		await createCaseIntelligenceCommittedEntityDirect('case-1', 'tok', {
			entity_kind: 'VEHICLE',
			display_label: 'ABC-123',
			core_attributes: {},
			person_identity_posture: null
		});
		const [, init] = fetchSpy.mock.calls[0];
		expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
			entity_kind: 'VEHICLE',
			person_identity_posture: null
		});
	});

	it('throws with nested API error message on failure', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ success: false, error: { message: 'display_label is required' } }, 400)
		);

		const { createCaseIntelligenceCommittedEntityDirect } = await import('../index');
		await expect(
			createCaseIntelligenceCommittedEntityDirect('case-1', 'tok', {
				entity_kind: 'LOCATION',
				display_label: 'X',
				core_attributes: {},
				person_identity_posture: null
			})
		).rejects.toThrow(/display_label is required/);
	});
});
