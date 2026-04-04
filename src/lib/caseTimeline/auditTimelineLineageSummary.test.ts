import { describe, expect, it } from 'vitest';
import { auditTimelineLineageSummary } from './auditTimelineLineageSummary';

describe('auditTimelineLineageSummary (P40-02A)', () => {
	it('prefers timeline_audit_lineage_description when present', () => {
		expect(
			auditTimelineLineageSummary({
				timeline_audit_lineage_description: 'Timeline row committed from proposal — reviewed workflow'
			})
		).toBe('Timeline row committed from proposal — reviewed workflow');
	});

	it('maps committed_proposal_record summaries when description omitted', () => {
		expect(
			auditTimelineLineageSummary({
				timeline_derivation_source: 'committed_proposal_record',
				timeline_commit_origin_summary: 'document_ingest_proposal'
			})
		).toBe('Proposal commit: document ingest');
		expect(
			auditTimelineLineageSummary({
				timeline_committed_via_proposal: true,
				timeline_commit_origin_summary: 'chat_draft_proposal'
			})
		).toBe('Proposal commit: chat intake draft');
	});

	it('maps direct timeline log metadata', () => {
		expect(
			auditTimelineLineageSummary({
				timeline_derivation_source: 'direct_timeline_log'
			})
		).toBe('Direct timeline entry (API log)');
		expect(
			auditTimelineLineageSummary({
				timeline_entry_origin: 'direct_timeline_log'
			})
		).toBe('Direct timeline entry (API log)');
	});

	it('returns null when no timeline lineage keys', () => {
		expect(auditTimelineLineageSummary({ case_id: 'x' })).toBeNull();
	});
});
