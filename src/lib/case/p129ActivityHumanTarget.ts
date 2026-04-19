/**
 * P129 — Compact, factual target lines for activity feed rows (no inference).
 */
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivityTargetLine } from '$lib/case/p129ActivityDisplay';

/** Shorten opaque ids for display (middle elided). */
export function p129ActivityShortId(id: string, head = 6, tail = 4): string {
	const s = String(id ?? '').trim();
	if (s.length <= head + tail + 1) return s;
	return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/**
 * One-line target description: domain noun + short id when useful.
 */
export function p129ActivityHumanTargetSummary(ev: CaseActivityEvent): string {
	const id = ev.target_id?.trim() ?? '';
	const short = id ? p129ActivityShortId(id) : '—';

	switch (ev.target_type) {
		case 'timeline_entry':
			return id ? `Timeline · ${short}` : 'Timeline';
		case 'proposal':
			return id ? `Proposal · ${short}` : 'Proposal';
		case 'case_workflow_item':
			return id ? `Workflow · ${short}` : 'Workflow';
		case 'case_workflow_item_version':
			return id ? `Workflow · ${short}` : 'Workflow';
		case 'case_entity':
			return id ? `Entity · ${short}` : 'Entity';
		case 'case_entity_evidence_link':
			return id ? `Entity link · ${short}` : 'Entity link';
		case 'case_file':
			return id ? `File · ${short}` : 'File';
		default:
			return p129ActivityTargetLine(ev.target_type, ev.target_id);
	}
}

/** Display actor id or email local-part — no inference about identity. */
export function p129ActivityActorDisplay(actorUserId: string | undefined): string {
	const s = String(actorUserId ?? '').trim();
	if (!s) return '—';
	if (s.includes('@')) {
		const local = s.split('@')[0]?.trim();
		return local || s;
	}
	return p129ActivityShortId(s, 8, 6);
}
