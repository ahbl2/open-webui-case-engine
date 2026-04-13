/**
 * P103 — One-shot history-state intent for citation → surface navigation (read-only).
 * Surfaces: timeline, tasks, files (optional explicit `text_span` on files per P103-01).
 */
import { goto } from '$app/navigation';
import { normalizeCaseIdForCompare } from '$lib/case/p102CaseQueryPresentation';
import type { CitationNavigationPayload } from './p103CitationNavigationTypes';
import { P103_CITATION_NAVIGATION_CONTRACT_VERSION } from './p103CitationNavigationTypes';

export type P103CitationNavigationIntent =
	| {
			readonly v: 1;
			readonly contract_version: typeof P103_CITATION_NAVIGATION_CONTRACT_VERSION;
			readonly case_id: string;
			readonly route_key: 'timeline';
			readonly citation_kind: 'timeline_entry';
			readonly target_id: string;
	  }
	| {
			readonly v: 1;
			readonly contract_version: typeof P103_CITATION_NAVIGATION_CONTRACT_VERSION;
			readonly case_id: string;
			readonly route_key: 'tasks';
			readonly citation_kind: 'case_task';
			readonly target_id: string;
	  }
	| {
			readonly v: 1;
			readonly contract_version: typeof P103_CITATION_NAVIGATION_CONTRACT_VERSION;
			readonly case_id: string;
			readonly route_key: 'files';
			readonly citation_kind: 'case_file';
			readonly target_id: string;
			readonly text_span?: { start: number; end: number };
	  };

function trim(s: string): string {
	return typeof s === 'string' ? s.trim() : '';
}

function isValidExplicitTextSpan(span: { start: number; end: number }): boolean {
	const { start, end } = span;
	if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
	if (start < 0 || start >= end) return false;
	return true;
}

/**
 * Build a one-shot intent from a Case Engine payload, or null if this route/kind pair is not handled yet.
 */
export function citationNavigationIntentFromPayload(
	payload: CitationNavigationPayload
): P103CitationNavigationIntent | null {
	if (payload.contract_version !== P103_CITATION_NAVIGATION_CONTRACT_VERSION) return null;
	const case_id = trim(payload.case_id);
	const target_id = trim(payload.target_id);
	if (!case_id || !target_id) return null;
	if (payload.route_key === 'timeline' && payload.citation_kind === 'timeline_entry') {
		return {
			v: 1,
			contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
			case_id,
			route_key: 'timeline',
			citation_kind: 'timeline_entry',
			target_id
		};
	}
	if (payload.route_key === 'tasks' && payload.citation_kind === 'case_task') {
		return {
			v: 1,
			contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
			case_id,
			route_key: 'tasks',
			citation_kind: 'case_task',
			target_id
		};
	}
	if (payload.route_key === 'files' && payload.citation_kind === 'case_file') {
		const base: P103CitationNavigationIntent = {
			v: 1,
			contract_version: P103_CITATION_NAVIGATION_CONTRACT_VERSION,
			case_id,
			route_key: 'files',
			citation_kind: 'case_file',
			target_id
		};
		if (payload.text_span !== undefined) {
			const ts = payload.text_span;
			if (!isValidExplicitTextSpan(ts)) return null;
			return { ...base, text_span: { start: ts.start, end: ts.end } };
		}
		return base;
	}
	return null;
}

export function isP103TimelineNavigationIntent(
	x: unknown,
	currentCaseId: string
): x is P103CitationNavigationIntent {
	if (!x || typeof x !== 'object') return false;
	const o = x as Record<string, unknown>;
	if (o.v !== 1) return false;
	if (o.contract_version !== P103_CITATION_NAVIGATION_CONTRACT_VERSION) return false;
	const cid = normalizeCaseIdForCompare(String(o.case_id ?? ''));
	const cur = normalizeCaseIdForCompare(currentCaseId);
	if (!cid || !cur || cid !== cur) return false;
	if (o.route_key !== 'timeline') return false;
	if (o.citation_kind !== 'timeline_entry') return false;
	const tid = trim(String(o.target_id ?? ''));
	return tid.length > 0;
}

export function isP103TaskNavigationIntent(
	x: unknown,
	currentCaseId: string
): x is P103CitationNavigationIntent {
	if (!x || typeof x !== 'object') return false;
	const o = x as Record<string, unknown>;
	if (o.v !== 1) return false;
	if (o.contract_version !== P103_CITATION_NAVIGATION_CONTRACT_VERSION) return false;
	const cid = normalizeCaseIdForCompare(String(o.case_id ?? ''));
	const cur = normalizeCaseIdForCompare(currentCaseId);
	if (!cid || !cur || cid !== cur) return false;
	if (o.route_key !== 'tasks') return false;
	if (o.citation_kind !== 'case_task') return false;
	const tid = trim(String(o.target_id ?? ''));
	return tid.length > 0;
}

export function isP103FileNavigationIntent(
	x: unknown,
	currentCaseId: string
): x is P103CitationNavigationIntent & { route_key: 'files'; citation_kind: 'case_file' } {
	if (!x || typeof x !== 'object') return false;
	const o = x as Record<string, unknown>;
	if (o.v !== 1) return false;
	if (o.contract_version !== P103_CITATION_NAVIGATION_CONTRACT_VERSION) return false;
	const cid = normalizeCaseIdForCompare(String(o.case_id ?? ''));
	const cur = normalizeCaseIdForCompare(currentCaseId);
	if (!cid || !cur || cid !== cur) return false;
	if (o.route_key !== 'files') return false;
	if (o.citation_kind !== 'case_file') return false;
	const tid = trim(String(o.target_id ?? ''));
	if (tid.length === 0) return false;
	if (o.text_span !== undefined) {
		if (!o.text_span || typeof o.text_span !== 'object') return false;
		const ts = o.text_span as Record<string, unknown>;
		if (typeof ts.start !== 'number' || typeof ts.end !== 'number') return false;
		if (!isValidExplicitTextSpan({ start: ts.start, end: ts.end })) return false;
	}
	return true;
}

/**
 * Validate contract-bound span coordinates against extracted text length (read-only; no repair).
 */
export function validateP103TextSpanAgainstExtractedText(
	span: { start: number; end: number },
	rawText: string
): { ok: true } | { ok: false } {
	const { start, end } = span;
	if (!Number.isFinite(start) || !Number.isFinite(end)) return { ok: false };
	if (start < 0 || end > rawText.length || start >= end) return { ok: false };
	return { ok: true };
}

/**
 * True when `x` looks like a P103 intent object but is not valid for the expected surface — caller should clear state.
 */
export function isStaleP103NavigationIntentShape(x: unknown): boolean {
	if (!x || typeof x !== 'object') return false;
	const o = x as Record<string, unknown>;
	return o.v === 1 && o.contract_version === P103_CITATION_NAVIGATION_CONTRACT_VERSION;
}

/**
 * Navigate to timeline, tasks, or files and pass a one-shot P103 intent.
 */
export async function navigateToCitationNavigationPayload(
	payload: CitationNavigationPayload,
	currentCaseId: string
): Promise<{ ok: true } | { ok: false; reason: 'CASE_ID_MISMATCH' | 'UNSUPPORTED_PAYLOAD' }> {
	const cid = normalizeCaseIdForCompare(currentCaseId);
	if (!cid || normalizeCaseIdForCompare(payload.case_id) !== cid) {
		return { ok: false, reason: 'CASE_ID_MISMATCH' };
	}
	const intent = citationNavigationIntentFromPayload(payload);
	if (!intent) return { ok: false, reason: 'UNSUPPORTED_PAYLOAD' };
	const path =
		intent.route_key === 'timeline'
			? `/case/${cid}/timeline`
			: intent.route_key === 'tasks'
				? `/case/${cid}/tasks`
				: `/case/${cid}/files`;
	await goto(path, {
		state: { p103CitationNavigationIntent: intent }
	});
	return { ok: true };
}
