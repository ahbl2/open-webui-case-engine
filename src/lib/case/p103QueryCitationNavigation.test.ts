/**
 * P103-04 — Query citation → P103 navigation resolution (pure).
 */
import { describe, it, expect } from 'vitest';
import type { CaseQueryCitation } from '$lib/apis/caseEngine/caseQueryApi';
import { resolveQueryCitationNavigation } from './p103QueryCitationNavigation';

const cid = 'case-a';

describe('resolveQueryCitationNavigation', () => {
	it('returns navigable timeline payload', () => {
		const c: CaseQueryCitation = { kind: 'timeline_entry', id: 'e1' };
		const r = resolveQueryCitationNavigation(cid, cid, c);
		expect(r.kind).toBe('navigable');
		if (r.kind === 'navigable') {
			expect(r.payload.route_key).toBe('timeline');
			expect(r.payload.citation_kind).toBe('timeline_entry');
			expect(r.payload.target_id).toBe('e1');
			expect(r.payload.case_id).toBe(cid);
		}
	});

	it('returns navigable task payload', () => {
		const c: CaseQueryCitation = { kind: 'case_task', id: 't1' };
		const r = resolveQueryCitationNavigation(cid, cid, c);
		expect(r.kind).toBe('navigable');
		if (r.kind === 'navigable') {
			expect(r.payload.route_key).toBe('tasks');
		}
	});

	it('returns navigable file payload without span', () => {
		const c: CaseQueryCitation = { kind: 'case_file', id: 'f1' };
		const r = resolveQueryCitationNavigation(cid, cid, c);
		expect(r.kind).toBe('navigable');
		if (r.kind === 'navigable') {
			expect(r.payload.route_key).toBe('files');
			expect(r.payload.text_span).toBeUndefined();
		}
	});

	it('returns navigable file payload with valid span', () => {
		const c: CaseQueryCitation = {
			kind: 'case_file',
			id: 'f1',
			text_span: { start: 0, end: 2 }
		};
		const r = resolveQueryCitationNavigation(cid, cid, c);
		expect(r.kind).toBe('navigable');
		if (r.kind === 'navigable') {
			expect(r.payload.text_span).toEqual({ start: 0, end: 2 });
		}
	});

	it('returns invalid_file_span for bad span', () => {
		const c: CaseQueryCitation = {
			kind: 'case_file',
			id: 'f1',
			text_span: { start: 2, end: 1 }
		};
		expect(resolveQueryCitationNavigation(cid, cid, c).kind).toBe('invalid_file_span');
	});

	it('returns unsupported for notebook and read_model', () => {
		expect(
			resolveQueryCitationNavigation(cid, cid, { kind: 'notebook_note', id: 'n1' }).kind
		).toBe('unsupported_notebook_or_read_model');
		expect(
			resolveQueryCitationNavigation(cid, cid, {
				kind: 'case_read_model',
				id: 'r1',
				read_surface: 'understanding'
			}).kind
		).toBe('unsupported_notebook_or_read_model');
	});

	it('P117-04: case_workflow_item citations are not navigable from query', () => {
		expect(
			resolveQueryCitationNavigation(cid, cid, { kind: 'case_workflow_item', id: 'w1' }).kind
		).toBe('unsupported_case_workflow_item');
	});

	it('returns invalid_case_context when envelope case differs', () => {
		const c: CaseQueryCitation = { kind: 'timeline_entry', id: 'e1' };
		expect(resolveQueryCitationNavigation(cid, 'other', c).kind).toBe('invalid_case_context');
	});

	it('returns invalid_citation for empty id', () => {
		const c: CaseQueryCitation = { kind: 'timeline_entry', id: '   ' };
		expect(resolveQueryCitationNavigation(cid, cid, c).kind).toBe('invalid_citation');
	});

	it('is deterministic for same inputs', () => {
		const c: CaseQueryCitation = { kind: 'case_task', id: 'k' };
		expect(resolveQueryCitationNavigation(cid, cid, c)).toEqual(resolveQueryCitationNavigation(cid, cid, c));
	});
});
