/**
 * P102-05 — Presentation helpers for case query (deterministic labels; case match).
 */
import { describe, expect, it } from 'vitest';
import type { CaseQueryCitation } from '$lib/apis/caseEngine/caseQueryApi';
import {
	caseQueryResponseMatchesActiveCase,
	caseQueryStatusHeadline,
	formatCaseQueryCitationLabel,
	normalizeCaseIdForCompare,
	P102_CASE_QUERY_SCOPE_COPY
} from './p102CaseQueryPresentation';

describe('p102CaseQueryPresentation', () => {
	it('scope copy states single-case read-only posture', () => {
		expect(P102_CASE_QUERY_SCOPE_COPY).toMatch(/this case only/i);
		expect(P102_CASE_QUERY_SCOPE_COPY).toMatch(/Case Engine/i);
		expect(P102_CASE_QUERY_SCOPE_COPY).not.toMatch(/cross-case/i);
	});

	it('normalizeCaseIdForCompare trims', () => {
		expect(normalizeCaseIdForCompare('  abc  ')).toBe('abc');
	});

	it('caseQueryResponseMatchesActiveCase rejects mismatch', () => {
		expect(caseQueryResponseMatchesActiveCase('a', 'a')).toBe(true);
		expect(caseQueryResponseMatchesActiveCase('a', 'b')).toBe(false);
		expect(caseQueryResponseMatchesActiveCase(' x ', 'x')).toBe(true);
	});

	it('caseQueryStatusHeadline does not praise degraded/refused as success', () => {
		expect(caseQueryStatusHeadline('ok')).toMatch(/cited/i);
		expect(caseQueryStatusHeadline('degraded')).toMatch(/partial|review/i);
		expect(caseQueryStatusHeadline('refused')).toMatch(/no answer|not supported|no matching/i);
		expect(caseQueryStatusHeadline('refused')).not.toMatch(/^success$/i);
	});

	it('formatCaseQueryCitationLabel is stable for each kind', () => {
		const samples: CaseQueryCitation[] = [
			{ kind: 'timeline_entry', id: 'te1' },
			{ kind: 'case_task', id: 't1' },
			{ kind: 'case_file', id: 'f1' },
			{ kind: 'notebook_note', id: '99' },
			{ kind: 'case_read_model', id: 'rm1', read_surface: 'synthesis' }
		];
		for (const c of samples) {
			const a = formatCaseQueryCitationLabel(c);
			const b = formatCaseQueryCitationLabel(c);
			expect(a).toBe(b);
			expect(a.length).toBeGreaterThan(5);
		}
	});

	it('formatCaseQueryCitationLabel includes field_name when present (P113)', () => {
		const c: CaseQueryCitation = { kind: 'timeline_entry', id: 'e1', field_name: 'text_original' };
		expect(formatCaseQueryCitationLabel(c)).toMatch(/field text_original/);
	});
});
