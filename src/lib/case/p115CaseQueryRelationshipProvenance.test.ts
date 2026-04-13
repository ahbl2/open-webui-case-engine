/**
 * P115-04 — Inclusion labels from Case Engine trace (no client inference).
 */
import { describe, expect, it } from 'vitest';
import type { CaseQueryReferentialFactRow, CaseQueryTrace } from '$lib/apis/caseEngine/caseQueryApi';
import {
	P115_DIRECT_MATCH_LABEL,
	P115_INCLUDED_BY_RELATIONSHIP_LABEL,
	referentialFactInclusionLabel
} from './p115CaseQueryRelationshipProvenance';

function baseTrace(overrides: Partial<CaseQueryTrace> = {}): CaseQueryTrace {
	return {
		supporting_record_refs: [],
		support_coverage: 'full',
		execution_scope: 'THIS_CASE',
		...overrides
	};
}

describe('p115CaseQueryRelationshipProvenance', () => {
	const fact: CaseQueryReferentialFactRow = {
		source_type: 'timeline_entry',
		source_id: 'te-1',
		field_name: 'text_original',
		value: 'x'
	};

	it('returns direct match when relationship_retrieval is absent', () => {
		expect(referentialFactInclusionLabel(fact, baseTrace())).toBe(P115_DIRECT_MATCH_LABEL);
	});

	it('marks rows present in linked_included as explicit relationship inclusion', () => {
		const trace = baseTrace({
			relationship_retrieval: {
				requested: true,
				enabled: true,
				base_match_refs: [{ kind: 'timeline_entry', id: 'te-0' }],
				tuples_considered: [],
				linked_included: [{ kind: 'timeline_entry', id: 'te-1', via_relationship_id: 'r1' }],
				linked_excluded: []
			}
		});
		expect(referentialFactInclusionLabel(fact, trace)).toBe(P115_INCLUDED_BY_RELATIONSHIP_LABEL);
	});

	it('does not label direct-only rows as relationship-linked', () => {
		const trace = baseTrace({
			relationship_retrieval: {
				requested: true,
				enabled: true,
				base_match_refs: [{ kind: 'timeline_entry', id: 'te-1' }],
				tuples_considered: [],
				linked_included: [{ kind: 'timeline_entry', id: 'te-99', via_relationship_id: 'r1' }],
				linked_excluded: []
			}
		});
		expect(referentialFactInclusionLabel(fact, trace)).toBe(P115_DIRECT_MATCH_LABEL);
	});
});
