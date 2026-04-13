/**
 * P103-04 — Query citation resolution → P103 intent path (same stack as navigateToCitationNavigationPayload).
 */
import { describe, it, expect } from 'vitest';
import type { CaseQueryCitation } from '$lib/apis/caseEngine/caseQueryApi';
import { citationNavigationIntentFromPayload } from './p103CitationNavigationIntent';
import { resolveQueryCitationNavigation } from './p103QueryCitationNavigation';

const caseId = 'case-z';

function intentFromQueryCitation(c: CaseQueryCitation) {
	const r = resolveQueryCitationNavigation(caseId, caseId, c);
	if (r.kind !== 'navigable') return null;
	return citationNavigationIntentFromPayload(r.payload);
}

describe('query citation → P103 intent (integration)', () => {
	it('timeline citation produces timeline intent', () => {
		const i = intentFromQueryCitation({ kind: 'timeline_entry', id: 'e99' });
		expect(i).not.toBeNull();
		expect(i?.route_key).toBe('timeline');
		expect(i?.target_id).toBe('e99');
		expect(i?.case_id).toBe(caseId);
	});

	it('task citation produces tasks intent', () => {
		const i = intentFromQueryCitation({ kind: 'case_task', id: 't42' });
		expect(i).not.toBeNull();
		expect(i?.route_key).toBe('tasks');
		expect(i?.target_id).toBe('t42');
	});

	it('file citation produces files intent without span', () => {
		const i = intentFromQueryCitation({ kind: 'case_file', id: 'f7' });
		expect(i).not.toBeNull();
		if (!i || i.route_key !== 'files') throw new Error('expected files');
		expect(i.citation_kind).toBe('case_file');
		expect('text_span' in i ? i.text_span : undefined).toBeUndefined();
	});

	it('file citation with valid span produces files intent with span', () => {
		const i = intentFromQueryCitation({
			kind: 'case_file',
			id: 'f7',
			text_span: { start: 1, end: 4 }
		});
		expect(i).not.toBeNull();
		if (!i || i.route_key !== 'files') throw new Error('expected files');
		expect(i.text_span).toEqual({ start: 1, end: 4 });
	});

	it('unsupported kinds do not produce navigable payloads', () => {
		expect(
			resolveQueryCitationNavigation(caseId, caseId, { kind: 'notebook_note', id: 'n1' }).kind
		).toBe('unsupported_notebook_or_read_model');
		expect(
			intentFromQueryCitation({ kind: 'notebook_note', id: 'n1' })
		).toBeNull();
	});

	it('P117-04: case_workflow_item does not produce navigation intent', () => {
		expect(resolveQueryCitationNavigation(caseId, caseId, { kind: 'case_workflow_item', id: 'w9' }).kind).toBe(
			'unsupported_case_workflow_item'
		);
		expect(intentFromQueryCitation({ kind: 'case_workflow_item', id: 'w9' })).toBeNull();
	});

	it('wrong envelope case id does not yield intent', () => {
		const c: CaseQueryCitation = { kind: 'timeline_entry', id: 'e1' };
		expect(resolveQueryCitationNavigation(caseId, 'other-case', c).kind).toBe('invalid_case_context');
	});

	it('repeated resolution is stable', () => {
		const c: CaseQueryCitation = { kind: 'case_task', id: 'k' };
		expect(intentFromQueryCitation(c)).toEqual(intentFromQueryCitation(c));
	});
});
