/**
 * P106-04 — Entity evidence → Phase 103 citation payload (explicit targets only).
 */
import { describe, expect, it } from 'vitest';
import type { CaseEngineEvidenceLinkReadItem } from '$lib/apis/caseEngine/caseEntitiesApi';
import { citationNavigationPayloadFromEntityEvidenceLink } from './p106EntityEvidenceCitationNavigation';
import { P103_CITATION_NAVIGATION_CONTRACT_VERSION } from './p103CitationNavigationTypes';

function baseLink(overrides: Partial<CaseEngineEvidenceLinkReadItem>): CaseEngineEvidenceLinkReadItem {
	return {
		id: 'el-1',
		case_id: 'case-alpha',
		case_entity_id: 'ent-1',
		link_type: 'timeline_entry',
		target_id: 'te-99',
		created_at: '2020-01-01T00:00:00Z',
		created_by: 'user-1',
		deleted_at: null,
		deleted_by: null,
		target_label: 'Label',
		target_status: 'active',
		...overrides
	};
}

describe('citationNavigationPayloadFromEntityEvidenceLink', () => {
	it('maps active timeline_entry to timeline route + timeline_entry kind', () => {
		const p = citationNavigationPayloadFromEntityEvidenceLink(
			'case-alpha',
			baseLink({ link_type: 'timeline_entry', target_id: 'te-99' })
		);
		expect(p).toEqual({
			contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
			case_id: 'case-alpha',
			citation_kind: 'timeline_entry',
			target_id: 'te-99',
			route_key: 'timeline'
		});
	});

	it('maps active case_file to files route + case_file kind', () => {
		const p = citationNavigationPayloadFromEntityEvidenceLink(
			'case-alpha',
			baseLink({ link_type: 'case_file', target_id: 'file-7' })
		);
		expect(p).toEqual({
			contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
			case_id: 'case-alpha',
			citation_kind: 'case_file',
			target_id: 'file-7',
			route_key: 'files'
		});
	});

	it('returns null when target is unavailable', () => {
		expect(
			citationNavigationPayloadFromEntityEvidenceLink(
				'case-alpha',
				baseLink({ target_status: 'unavailable', link_type: 'timeline_entry' })
			)
		).toBeNull();
	});

	it('returns null when evidence case_id does not match current case', () => {
		expect(
			citationNavigationPayloadFromEntityEvidenceLink(
				'case-alpha',
				baseLink({ case_id: 'other-case', link_type: 'timeline_entry' })
			)
		).toBeNull();
	});

	it('returns null for unsupported link_type (defensive)', () => {
		const link = {
			...baseLink({ link_type: 'timeline_entry' }),
			link_type: 'other_surface'
		} as CaseEngineEvidenceLinkReadItem;
		expect(citationNavigationPayloadFromEntityEvidenceLink('case-alpha', link)).toBeNull();
	});
});
