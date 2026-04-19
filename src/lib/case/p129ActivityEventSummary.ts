/**
 * P129 — One-line factual summary for activity feed rows (metadata + event fields only; no inference).
 */
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivityMetadataLines } from '$lib/case/p129ActivityDisplay';
import { p129ActivityHumanTargetSummary } from '$lib/case/p129ActivityHumanTarget';

/** Metadata keys already reflected in the summary line (avoid duplicating in the supplement box). */
const SUMMARY_METADATA_KEYS = new Set([
	'proposal_type',
	'original_filename',
	'workflow_type',
	'entity_type',
	'link_type',
	'evidence_target_id',
	'case_entity_id',
	'workflow_item_id',
	'previous_status',
	'status'
]);

/** Remaining metadata lines for the compact “Extra fields” list (read-only). */
export function p129ActivityMetadataSupplementLines(ev: CaseActivityEvent): string[] {
	const lines = p129ActivityMetadataLines(ev.metadata);
	return lines.filter((line) => {
		const k = line.split(':')[0]?.trim();
		if (!k) return true;
		return !SUMMARY_METADATA_KEYS.has(k);
	});
}

function str(v: unknown): string | null {
	if (v == null) return null;
	const s = String(v).trim();
	return s.length ? s : null;
}

/** Human-readable summary line for the main card body. */
export function p129ActivityEventSummary(ev: CaseActivityEvent): string {
	const md = ev.metadata ?? {};

	switch (ev.event_type) {
		case 'timeline_entry_created': {
			// No extra metadata from the API; wall time is shown in the row timestamp line.
			return 'Official Timeline chronology entry (committed record).';
		}
		case 'proposal_created':
		case 'proposal_accepted':
		case 'proposal_rejected': {
			const pt = str(md.proposal_type);
			if (pt) return `Proposal type: ${pt}`;
			return 'Proposal record in this case';
		}
		case 'file_uploaded': {
			const fn = str(md.original_filename);
			if (fn) return `File name: ${fn}`;
			return 'File attached to this case';
		}
		case 'workflow_item_created': {
			const wt = str(md.workflow_type);
			if (wt) return `Workflow type: ${wt}`;
			return 'Workflow item in this case';
		}
		case 'workflow_status_changed': {
			const prev = str(md.previous_status);
			const next = str(md.status);
			if (prev && next) return `Status change: ${prev} → ${next}`;
			return 'Workflow status change';
		}
		case 'entity_created': {
			const et = str(md.entity_type);
			if (et) return `Entity type: ${et}`;
			return 'Entity added to this case';
		}
		case 'entity_link_created': {
			const lt = str(md.link_type);
			if (lt) return `Link type: ${lt}`;
			return 'Entity evidence link';
		}
		default:
			return p129ActivityHumanTargetSummary(ev);
	}
}
