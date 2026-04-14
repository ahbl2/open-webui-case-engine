/**
 * P129-03 — Factual labels for Case Engine activity event types (static mapping only).
 */
import type { CaseActivityEventType } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';

const LABELS: Record<CaseActivityEventType, string> = {
	proposal_created: 'Proposal created',
	proposal_accepted: 'Proposal accepted',
	proposal_rejected: 'Proposal rejected',
	timeline_entry_created: 'Timeline entry created',
	workflow_item_created: 'Workflow item created',
	workflow_status_changed: 'Workflow status changed',
	entity_created: 'Entity created',
	entity_link_created: 'Entity link created',
	file_uploaded: 'File uploaded'
};

/** Human-readable label for a stored event_type value; unknown types pass through unchanged. */
export function p129ActivityEventTypeLabel(eventType: string): string {
	const hit = LABELS[eventType as CaseActivityEventType];
	return hit ?? eventType;
}

/** Factual target line: type and id as returned by the server. */
export function p129ActivityTargetLine(targetType: string, targetId: string): string {
	return `${targetType}: ${targetId}`;
}

/**
 * Deterministic metadata lines (sorted keys) — scalar values only, no narrative.
 */
export function p129ActivityMetadataLines(
	metadata: Record<string, string | number | boolean | null> | undefined
): string[] {
	if (metadata == null || typeof metadata !== 'object') return [];
	const keys = Object.keys(metadata).sort();
	const out: string[] = [];
	for (const k of keys) {
		const v = metadata[k];
		if (v === undefined) continue;
		out.push(`${k}: ${v === null ? '' : String(v)}`);
	}
	return out;
}
