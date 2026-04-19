/**
 * P129 — Contextual CTA label for opening the activity target’s tab (factual; same case).
 */
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';

export function p129ActivityOpenRecordCtaLabel(ev: CaseActivityEvent): string {
	switch (ev.target_type) {
		case 'timeline_entry':
			return 'View on Timeline';
		case 'proposal':
			return 'View in Proposals';
		case 'case_file':
			return 'View in Files';
		case 'case_workflow_item':
			return 'View workflow item';
		case 'case_workflow_item_version':
			return 'View in Workflow';
		case 'case_entity':
			return 'View entity';
		case 'case_entity_evidence_link':
			return 'View in Entities';
		default:
			return 'Open related tab';
	}
}
