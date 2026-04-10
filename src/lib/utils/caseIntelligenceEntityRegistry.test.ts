import { describe, it, expect } from 'vitest';
import type { CaseIntelligenceCommittedEntity } from '$lib/apis/caseEngine';
import {
	buildRegistrySecondaryLine,
	committedEntityMatchesSearch,
	entityPortraitUrl,
	initialsFromDisplayLabel,
	sortCommittedEntities
} from './caseIntelligenceEntityRegistry';

function ent(partial: Partial<CaseIntelligenceCommittedEntity>): CaseIntelligenceCommittedEntity {
	return {
		record_class: 'case_intelligence_entity',
		authority: 'authoritative_case_intel',
		id: 'e1',
		case_id: 'c1',
		entity_kind: 'PERSON',
		person_identity_posture: 'IDENTIFIED',
		display_label: 'Test Person',
		core_attributes: {},
		committed_from_staging_id: null,
		created_by: 'u1',
		created_at: '2024-01-01T00:00:00.000Z',
		updated_by: null,
		updated_at: null,
		deleted_at: null,
		deleted_by: null,
		...partial
	};
}

describe('caseIntelligenceEntityRegistry (P67-05)', () => {
	it('buildRegistrySecondaryLine composes person posture and dob', () => {
		const line = buildRegistrySecondaryLine(
			'PERSON',
			ent({
				person_identity_posture: 'UNKNOWN_PARTIAL',
				core_attributes: { dob: '1980-04-01' }
			})
		);
		expect(line).toContain('Unknown (partial)');
		expect(line).toContain('DOB:');
	});

	it('buildRegistrySecondaryLine reads vehicle plate and make/model', () => {
		const line = buildRegistrySecondaryLine(
			'VEHICLE',
			ent({
				entity_kind: 'VEHICLE',
				display_label: 'Silver sedan',
				core_attributes: { plate: 'ABC123', plate_state: 'CA', make: 'Toyota', model: 'Camry' }
			})
		);
		expect(line).toContain('ABC123');
		expect(line).toContain('Toyota');
		expect(line).toContain('Camry');
	});

	it('buildRegistrySecondaryLine reads location address', () => {
		const line = buildRegistrySecondaryLine(
			'LOCATION',
			ent({
				entity_kind: 'LOCATION',
				display_label: 'Scene',
				core_attributes: { address: '100 Main St', city: 'Springfield' }
			})
		);
		expect(line).toContain('100 Main St');
		expect(line).toContain('Springfield');
	});

	it('entityPortraitUrl rejects non-http(s) URLs', () => {
		expect(
			entityPortraitUrl({ photo_url: 'https://example.com/p.jpg' })
		).toBe('https://example.com/p.jpg');
		expect(entityPortraitUrl({ photo_url: 'javascript:alert(1)' })).toBe(null);
		expect(entityPortraitUrl({ photo_url: '/relative' })).toBe(null);
	});

	it('initialsFromDisplayLabel returns two-letter initials when possible', () => {
		expect(initialsFromDisplayLabel('Ada Lovelace')).toBe('AL');
		expect(initialsFromDisplayLabel('Madonna')).toBe('MA');
	});

	it('committedEntityMatchesSearch matches display label and attributes', () => {
		const e = ent({
			display_label: 'John Doe',
			core_attributes: { plate: 'XYZ9' }
		});
		expect(committedEntityMatchesSearch(e, 'john')).toBe(true);
		expect(committedEntityMatchesSearch(e, 'XYZ9')).toBe(true);
		expect(committedEntityMatchesSearch(e, 'nomatch')).toBe(false);
	});

	it('sortCommittedEntities sorts by name then created', () => {
		const rows = [
			ent({ id: 'a', display_label: 'Zed', created_at: '2024-01-02T00:00:00.000Z' }),
			ent({ id: 'b', display_label: 'Amy', created_at: '2024-01-01T00:00:00.000Z' }),
			ent({ id: 'c', display_label: 'Amy', created_at: '2024-01-03T00:00:00.000Z' })
		];
		const sorted = sortCommittedEntities(rows, 'name_asc');
		expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a']);
	});

	it('sortCommittedEntities sorts by created descending', () => {
		const rows = [
			ent({ id: 'old', display_label: 'A', created_at: '2020-01-01T00:00:00.000Z' }),
			ent({ id: 'new', display_label: 'B', created_at: '2025-01-01T00:00:00.000Z' })
		];
		const sorted = sortCommittedEntities(rows, 'created_desc');
		expect(sorted[0].id).toBe('new');
	});
});
