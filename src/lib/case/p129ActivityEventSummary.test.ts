import { describe, expect, it } from 'vitest';
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivityEventSummary, p129ActivityMetadataSupplementLines } from './p129ActivityEventSummary';

describe('p129ActivityEventSummary', () => {
	it('describes timeline entries without duplicating the row timestamp', () => {
		const ev: CaseActivityEvent = {
			event_id: 'e',
			event_type: 'timeline_entry_created',
			case_id: 'c',
			occurred_at: '2026-03-15T14:30:00.000Z',
			recorded_at: '2026-03-15T15:00:00.000Z',
			actor_user_id: 'u',
			target_type: 'timeline_entry',
			target_id: 'tl-1'
		};
		expect(p129ActivityEventSummary(ev)).toMatch(/Timeline/i);
	});

	it('uses file metadata when present', () => {
		const ev: CaseActivityEvent = {
			event_id: 'e',
			event_type: 'file_uploaded',
			case_id: 'c',
			occurred_at: '2026-01-01T12:00:00.000Z',
			recorded_at: '2026-01-01T12:00:00.000Z',
			actor_user_id: 'u',
			target_type: 'case_file',
			target_id: 'f1',
			metadata: { original_filename: 'photo.jpg' }
		};
		expect(p129ActivityEventSummary(ev)).toContain('photo.jpg');
	});

	it('filters supplement metadata to avoid duplicate keys', () => {
		const ev: CaseActivityEvent = {
			event_id: 'e',
			event_type: 'proposal_created',
			case_id: 'c',
			occurred_at: '2026-01-01T12:00:00.000Z',
			recorded_at: '2026-01-01T12:00:00.000Z',
			actor_user_id: 'u',
			target_type: 'proposal',
			target_id: 'p1',
			metadata: { proposal_type: 'timeline', extra_note: 'x' }
		};
		const sup = p129ActivityMetadataSupplementLines(ev);
		expect(sup.some((l) => l.startsWith('proposal_type:'))).toBe(false);
		expect(sup.some((l) => l.startsWith('extra_note:'))).toBe(true);
	});
});
