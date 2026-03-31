import { describe, expect, it, beforeEach } from 'vitest';
import {
	clearStructuredNotesObservabilityEvents,
	getStructuredNotesObservabilityEvents,
	newStructuredNotesCorrelationId,
	recordStructuredNotesObservabilityEvent
} from './structuredNotesObservability';

describe('structuredNotesObservability (P34-20)', () => {
	beforeEach(() => {
		clearStructuredNotesObservabilityEvents();
	});

	it('records metadata-only events with correlation and case id', () => {
		const cid = newStructuredNotesCorrelationId();
		expect(cid.length).toBeGreaterThan(8);
		recordStructuredNotesObservabilityEvent({
			correlationId: cid,
			caseId: 'case-1',
			eventType: 'structured_notes_preview_requested',
			noteId: '42',
			success: true
		});
		const evs = getStructuredNotesObservabilityEvents();
		expect(evs).toHaveLength(1);
		expect(evs[0].eventType).toBe('structured_notes_preview_requested');
		expect(evs[0].caseId).toBe('case-1');
		expect(evs[0].noteId).toBe('42');
		expect(evs[0].correlationId).toBe(cid);
	});

	it('supports traceability event type discriminator', () => {
		recordStructuredNotesObservabilityEvent({
			correlationId: 'x',
			caseId: 'c',
			eventType: 'structured_notes_traceability_used',
			traceabilityInteractionType: 'statement_row'
		});
		expect(getStructuredNotesObservabilityEvents()[0].traceabilityInteractionType).toBe('statement_row');
	});
});
