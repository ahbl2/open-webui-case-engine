/**
 * P103 — Citation navigation intent contract tests (timeline / tasks / files).
 */
import { describe, it, expect } from 'vitest';
import {
	citationNavigationIntentFromPayload,
	isP103FileNavigationIntent,
	isP103TaskNavigationIntent,
	isP103TimelineNavigationIntent,
	isStaleP103NavigationIntentShape,
	validateP103TextSpanAgainstExtractedText
} from './p103CitationNavigationIntent';
import type { CitationNavigationPayload } from './p103CitationNavigationTypes';

const timelinePayload = (caseId: string, targetId: string): CitationNavigationPayload => ({
	contract_version: 'p103.1',
	case_id: caseId,
	citation_kind: 'timeline_entry',
	target_id: targetId,
	route_key: 'timeline'
});

const taskPayload = (caseId: string, targetId: string): CitationNavigationPayload => ({
	contract_version: 'p103.1',
	case_id: caseId,
	citation_kind: 'case_task',
	target_id: targetId,
	route_key: 'tasks'
});

const filePayload = (
	caseId: string,
	targetId: string,
	span?: { start: number; end: number }
): CitationNavigationPayload => ({
	contract_version: 'p103.1',
	case_id: caseId,
	citation_kind: 'case_file',
	target_id: targetId,
	route_key: 'files',
	...(span !== undefined ? { text_span: span } : {})
});

describe('p103CitationNavigationIntent', () => {
	it('builds timeline intent from payload', () => {
		const i = citationNavigationIntentFromPayload(timelinePayload('c1', 'e1'));
		expect(i).not.toBeNull();
		expect(i?.route_key).toBe('timeline');
		expect(i?.citation_kind).toBe('timeline_entry');
		expect(i?.target_id).toBe('e1');
		expect(i?.case_id).toBe('c1');
	});

	it('builds task intent from payload', () => {
		const i = citationNavigationIntentFromPayload(taskPayload('c1', 'k1'));
		expect(i).not.toBeNull();
		expect(i?.route_key).toBe('tasks');
		expect(i?.citation_kind).toBe('case_task');
		expect(i?.target_id).toBe('k1');
	});

	it('builds file intent without span', () => {
		const i = citationNavigationIntentFromPayload(filePayload('c1', 'f1'));
		expect(i).not.toBeNull();
		if (!i || i.route_key !== 'files') throw new Error('expected files');
		expect(i.citation_kind).toBe('case_file');
		expect(i.target_id).toBe('f1');
		expect('text_span' in i ? i.text_span : undefined).toBeUndefined();
	});

	it('builds file intent with explicit text_span', () => {
		const i = citationNavigationIntentFromPayload(filePayload('c1', 'f1', { start: 0, end: 3 }));
		expect(i).not.toBeNull();
		if (!i || i.route_key !== 'files') throw new Error('expected files');
		expect(i.text_span).toEqual({ start: 0, end: 3 });
	});

	it('returns null for invalid explicit span in payload', () => {
		expect(citationNavigationIntentFromPayload(filePayload('c1', 'f1', { start: 2, end: 1 }))).toBeNull();
	});

	it('isP103FileNavigationIntent validates case and optional span', () => {
		const i = citationNavigationIntentFromPayload(filePayload('c1', 'f1', { start: 1, end: 2 }));
		expect(i).not.toBeNull();
		expect(isP103FileNavigationIntent(i, 'c1')).toBe(true);
		expect(isP103FileNavigationIntent(i, 'c2')).toBe(false);
	});

	it('validateP103TextSpanAgainstExtractedText rejects out-of-range and invalid', () => {
		expect(validateP103TextSpanAgainstExtractedText({ start: 0, end: 2 }, 'ab').ok).toBe(true);
		expect(validateP103TextSpanAgainstExtractedText({ start: 0, end: 3 }, 'ab').ok).toBe(false);
		expect(validateP103TextSpanAgainstExtractedText({ start: 1, end: 1 }, 'ab').ok).toBe(false);
	});

	it('returns null for unsupported route/kind pairs (notes)', () => {
		const p: CitationNavigationPayload = {
			contract_version: 'p103.1',
			case_id: 'c1',
			citation_kind: 'notebook_note',
			target_id: 'n1',
			route_key: 'notes'
		};
		expect(citationNavigationIntentFromPayload(p)).toBeNull();
	});

	it('isP103TimelineNavigationIntent rejects case mismatch (cross-case)', () => {
		const intent = citationNavigationIntentFromPayload(timelinePayload('c1', 'e1'));
		expect(intent).not.toBeNull();
		expect(isP103TimelineNavigationIntent(intent, 'c1')).toBe(true);
		expect(isP103TimelineNavigationIntent(intent, 'c2')).toBe(false);
	});

	it('isP103TaskNavigationIntent rejects wrong surface', () => {
		const intent = citationNavigationIntentFromPayload(taskPayload('c1', 'k1'));
		expect(intent).not.toBeNull();
		expect(isP103TaskNavigationIntent(intent, 'c1')).toBe(true);
		expect(isP103TimelineNavigationIntent(intent, 'c1')).toBe(false);
	});

	it('same payload validates deterministically', () => {
		const p = timelinePayload('c', 'x');
		expect(citationNavigationIntentFromPayload(p)).toEqual(citationNavigationIntentFromPayload(p));
	});

	it('isStaleP103NavigationIntentShape detects version wrapper only', () => {
		expect(isStaleP103NavigationIntentShape({ v: 1, contract_version: 'p103.1' })).toBe(true);
		expect(isStaleP103NavigationIntentShape({ v: 2, contract_version: 'p103.1' })).toBe(false);
	});

	it('isP103TimelineNavigationIntent matches trimmed case ids (P103-05)', () => {
		const intent = citationNavigationIntentFromPayload(timelinePayload('c1', 'e1'));
		expect(intent).not.toBeNull();
		expect(isP103TimelineNavigationIntent(intent, '  c1  ')).toBe(true);
		expect(isP103TimelineNavigationIntent(intent, 'c2')).toBe(false);
	});

	it('isP103TaskNavigationIntent matches trimmed case ids (P103-05)', () => {
		const intent = citationNavigationIntentFromPayload(taskPayload('c1', 'k1'));
		expect(intent).not.toBeNull();
		expect(isP103TaskNavigationIntent(intent, ' c1 ')).toBe(true);
	});

	it('isP103FileNavigationIntent matches trimmed case ids (P103-05)', () => {
		const intent = citationNavigationIntentFromPayload(filePayload('c1', 'f1'));
		expect(intent).not.toBeNull();
		expect(isP103FileNavigationIntent(intent, 'c1\n')).toBe(true);
	});
});
