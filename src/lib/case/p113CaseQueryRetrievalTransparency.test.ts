/**
 * P113-03 — Retrieval transparency helpers (deterministic; no analytic wording).
 */
import { describe, expect, it } from 'vitest';
import {
	P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_FRAMING,
	P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_TITLE,
	referentialFactsCitationsAligned
} from './p113CaseQueryRetrievalTransparency';
import type { CaseQueryCitation, CaseQueryReferentialFactRow } from '$lib/apis/caseEngine/caseQueryApi';

describe('p113CaseQueryRetrievalTransparency', () => {
	it('referentialFactsCitationsAligned requires equal non-empty lengths', () => {
		const f: CaseQueryReferentialFactRow[] = [
			{ source_type: 'timeline_entry', source_id: 'a', field_name: 'x', value: '1' }
		];
		const c: CaseQueryCitation[] = [{ kind: 'timeline_entry', id: 'a', field_name: 'x' }];
		expect(referentialFactsCitationsAligned(f, c)).toBe(true);
		expect(referentialFactsCitationsAligned([], c)).toBe(false);
		expect(referentialFactsCitationsAligned(f, [])).toBe(false);
		expect(referentialFactsCitationsAligned(undefined, c)).toBe(false);
	});

	it('operator copy avoids analytic or derived-work labels', () => {
		const banned = /\b(summary|report|analysis|narrative)\b/i;
		expect(P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_TITLE).not.toMatch(banned);
		expect(P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_FRAMING).not.toMatch(banned);
	});

	it('title and framing are stable across repeated reads', () => {
		expect(P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_TITLE).toBe(P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_TITLE);
		expect(P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_FRAMING).toBe(P113_CASE_QUERY_RETRIEVAL_TRANSPARENCY_FRAMING);
	});
});
