/**
 * P129-04 — Deterministic case-scoped URLs for activity event targets (no search, no inference).
 * Uses only `target_type`, `target_id`, and factual `metadata` keys emitted by Case Engine.
 */
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';

function enc(s: string): string {
	return encodeURIComponent(s);
}

/**
 * Href for the originating record surface, or `null` when no safe direct path exists.
 */
export function p129ActivitySourceHref(caseId: string, ev: CaseActivityEvent): string | null {
	if (!caseId?.trim()) return null;
	const c = enc(caseId.trim());
	const tid = ev.target_id?.trim() ? enc(ev.target_id.trim()) : '';

	switch (ev.target_type) {
		case 'proposal':
			return `/case/${c}/proposals`;
		case 'timeline_entry':
			if (!tid) return null;
			return `/case/${c}/timeline?highlight=${tid}`;
		case 'case_workflow_item':
			if (!tid) return null;
			return `/case/${c}/workflow/witem/${tid}`;
		case 'case_workflow_item_version': {
			const raw = ev.metadata?.workflow_item_id;
			const wid = raw != null && String(raw).trim() !== '' ? enc(String(raw).trim()) : '';
			if (wid) return `/case/${c}/workflow/witem/${wid}`;
			return `/case/${c}/workflow`;
		}
		case 'case_entity':
			if (!tid) return null;
			return `/case/${c}/entities/${tid}`;
		case 'case_entity_evidence_link': {
			const raw = ev.metadata?.case_entity_id;
			const eid = raw != null && String(raw).trim() !== '' ? enc(String(raw).trim()) : '';
			if (eid) return `/case/${c}/entities/${eid}`;
			return `/case/${c}/entities`;
		}
		case 'case_file':
			if (!tid) return null;
			return `/case/${c}/files?file=${tid}`;
		default:
			return null;
	}
}
