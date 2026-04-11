import { describe, it, expect } from 'vitest';
import {
	isSupportedEntityFocusType,
	buildEntityFocusHref,
	entityFocusEvidenceBackendSupportsRouteType,
	committedEntityEvidenceFocusGate,
	entityEvidenceFocusControlLabel,
	looksLikePhoneDigitsQuery,
	splitEntityEvidenceByCase,
	type EntityFocusEvidenceRow
} from './entityFocus';
import type { CaseIntelligenceCommittedEntity } from '$lib/apis/caseEngine';

describe('entityFocus utils', () => {
	it('accepts supported entity focus route types (incl. vehicle UI route)', () => {
		expect(isSupportedEntityFocusType('phone')).toBe(true);
		expect(isSupportedEntityFocusType('person')).toBe(true);
		expect(isSupportedEntityFocusType('location')).toBe(true);
		expect(isSupportedEntityFocusType('vehicle')).toBe(true);
		expect(isSupportedEntityFocusType('VEHICLE')).toBe(true);
		expect(isSupportedEntityFocusType('event')).toBe(false);
	});

	it('flags backend evidence support only for person, location, phone', () => {
		expect(entityFocusEvidenceBackendSupportsRouteType('phone')).toBe(true);
		expect(entityFocusEvidenceBackendSupportsRouteType('person')).toBe(true);
		expect(entityFocusEvidenceBackendSupportsRouteType('location')).toBe(true);
		expect(entityFocusEvidenceBackendSupportsRouteType('vehicle')).toBe(false);
	});

	it('builds entity focus href for supported types', () => {
		const href = buildEntityFocusHref({
			caseId: 'case-1',
			type: 'phone',
			normalizedValue: '5551234567',
			scope: 'CID'
		});
		expect(href).toBe('/case/case-1/intelligence/entity/phone/5551234567?scope=CID');
	});

	it('builds vehicle entity focus href (UI route; evidence may be gated on page)', () => {
		const href = buildEntityFocusHref({
			caseId: 'c1',
			type: 'vehicle',
			normalizedValue: 'ABC123'
		});
		expect(href).toBe('/case/c1/intelligence/entity/vehicle/ABC123');
	});

	it('returns null for unsupported route inputs', () => {
		expect(
			buildEntityFocusHref({
				caseId: 'case-1',
				type: 'event',
				normalizedValue: 'x'
			})
		).toBeNull();
	});

	it('committedEntityEvidenceFocusGate: vehicle is unsupported; person navigates when normalized id present', () => {
		const vehicle = {
			id: 'e1',
			case_id: 'case-a',
			entity_kind: 'VEHICLE' as const,
			display_label: 'Test car',
			core_attributes: { normalized_id: 'PLATE1' },
			person_identity_posture: null,
			deleted_at: null
		} as unknown as CaseIntelligenceCommittedEntity;
		expect(committedEntityEvidenceFocusGate(vehicle)).toEqual({ outcome: 'vehicle_unsupported' });

		const person = {
			id: 'e2',
			case_id: 'case-a',
			entity_kind: 'PERSON' as const,
			display_label: 'Jane',
			core_attributes: { normalized_id: 'person-key-1' },
			person_identity_posture: null,
			deleted_at: null
		} as unknown as CaseIntelligenceCommittedEntity;
		expect(committedEntityEvidenceFocusGate(person)).toEqual({
			outcome: 'navigate',
			href: '/case/case-a/intelligence/entity/person/person-key-1'
		});
	});

	it('looksLikePhoneDigitsQuery is a digit-length heuristic', () => {
		expect(looksLikePhoneDigitsQuery('(555) 123-4567')).toBe(true);
		expect(looksLikePhoneDigitsQuery('555123456')).toBe(false);
		expect(looksLikePhoneDigitsQuery('abc')).toBe(false);
	});

	it('entityEvidenceFocusControlLabel highlights phone rows', () => {
		expect(entityEvidenceFocusControlLabel('phone')).toBe('Phone evidence focus');
		expect(entityEvidenceFocusControlLabel('PHONE')).toBe('Phone evidence focus');
		expect(entityEvidenceFocusControlLabel('person')).toBe('Entity intelligence focus');
	});

	it('splits current-case evidence from other-case evidence', () => {
		const rows: EntityFocusEvidenceRow[] = [
			{
				case: { id: 'case-1', case_number: 'CID-1', title: 'A', unit: 'CID' },
				source: { kind: 'timeline_entry', id: 'e1' },
				match: { excerpt: 'x' },
				citation: { label: 'L1', case_id: 'case-1', source_kind: 'timeline_entry', source_id: 'e1' }
			},
			{
				case: { id: 'case-2', case_number: 'CID-2', title: 'B', unit: 'CID' },
				source: { kind: 'case_file', id: 'f1' },
				match: { excerpt: 'y' },
				citation: { label: 'L2', case_id: 'case-2', source_kind: 'case_file', source_id: 'f1' }
			}
		];
		const out = splitEntityEvidenceByCase(rows, 'case-1');
		expect(out.currentCaseEvidence).toHaveLength(1);
		expect(out.otherCaseEvidence).toHaveLength(1);
	});
});

