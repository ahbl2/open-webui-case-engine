import { describe, it, expect } from 'vitest';
import {
	isSupportedEntityFocusType,
	buildEntityFocusHref,
	splitEntityEvidenceByCase,
	type EntityFocusEvidenceRow
} from './entityFocus';

describe('entityFocus utils', () => {
	it('accepts only supported entity focus types', () => {
		expect(isSupportedEntityFocusType('phone')).toBe(true);
		expect(isSupportedEntityFocusType('person')).toBe(true);
		expect(isSupportedEntityFocusType('location')).toBe(true);
		expect(isSupportedEntityFocusType('event')).toBe(false);
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

	it('returns null for unsupported route inputs', () => {
		expect(
			buildEntityFocusHref({
				caseId: 'case-1',
				type: 'event',
				normalizedValue: 'x'
			})
		).toBeNull();
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

