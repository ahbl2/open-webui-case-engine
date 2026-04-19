import { describe, expect, it } from 'vitest';
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivityActorDisplay, p129ActivityHumanTargetSummary, p129ActivityShortId } from './p129ActivityHumanTarget';

describe('p129ActivityHumanTarget', () => {
	it('shortens long opaque ids', () => {
		expect(p129ActivityShortId('abcdefghijklmnop')).toMatch(/…/);
	});

	it('summarizes targets factually', () => {
		const ev: CaseActivityEvent = {
			event_id: 'e',
			event_type: 'file_uploaded',
			case_id: 'c',
			occurred_at: '2026-01-01T12:00:00.000Z',
			recorded_at: '2026-01-01T12:00:00.000Z',
			actor_user_id: 'a',
			target_type: 'case_file',
			target_id: 'file-uuid-1234567890'
		};
		expect(p129ActivityHumanTargetSummary(ev)).toContain('File');
	});

	it('shows email local-part for actor display', () => {
		expect(p129ActivityActorDisplay('jane.doe@unit.gov')).toBe('jane.doe');
	});
});
