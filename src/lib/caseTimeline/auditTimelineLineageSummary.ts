/**
 * P40-02A — Derive a short operator-facing lineage string from audit `details` without relying on page hint copy.
 */
export function auditTimelineLineageSummary(details: unknown): string | null {
	if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
	const d = details as Record<string, unknown>;
	const direct = d.timeline_audit_lineage_description;
	if (typeof direct === 'string' && direct.trim()) return direct.trim();

	if (d.timeline_derivation_source === 'direct_timeline_log') {
		return 'Direct timeline entry (API log)';
	}
	if (d.timeline_derivation_source === 'committed_proposal_record' || d.timeline_committed_via_proposal === true) {
		const s = d.timeline_commit_origin_summary;
		if (s === 'document_ingest_proposal') return 'Proposal commit: document ingest';
		if (s === 'chat_draft_proposal') return 'Proposal commit: chat intake draft';
		if (s === 'proposal_assisted') return 'Proposal commit: reviewed workflow';
		return 'Proposal commit (timeline)';
	}
	if (d.timeline_entry_origin === 'direct_timeline_log') {
		return 'Direct timeline entry (API log)';
	}
	return null;
}
