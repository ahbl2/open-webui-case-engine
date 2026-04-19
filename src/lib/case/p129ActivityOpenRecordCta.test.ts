import { describe, expect, it } from 'vitest';
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivityOpenRecordCtaLabel } from './p129ActivityOpenRecordCta';

describe('p129ActivityOpenRecordCtaLabel', () => {
	it('returns contextual labels', () => {
		const tl: CaseActivityEvent = {
			event_id: 'e',
			event_type: 'timeline_entry_created',
			case_id: 'c',
			occurred_at: '2026-01-01T12:00:00.000Z',
			recorded_at: '2026-01-01T12:00:00.000Z',
			actor_user_id: 'u',
			target_type: 'timeline_entry',
			target_id: 't1'
		};
		expect(p129ActivityOpenRecordCtaLabel(tl)).toContain('Timeline');
	});
});
