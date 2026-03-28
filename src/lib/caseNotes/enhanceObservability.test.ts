import { get } from 'svelte/store';
import { describe, it, expect, beforeEach } from 'vitest';
import {
	clearEnhanceObservabilityEvents,
	ENHANCE_OBSERVABILITY_MAX_EVENTS,
	enhanceObservabilityTick,
	getEnhanceObservabilityEvents,
	newEnhanceCorrelationId,
	reasonCodesFromEnhanceReasons,
	reasonCodesFromIntegrityFailureDetails,
	recordEnhanceObservabilityEvent
} from './enhanceObservability';

describe('enhanceObservability', () => {
	beforeEach(() => {
		clearEnhanceObservabilityEvents();
	});

	it('records enhance_requested without note text fields', () => {
		recordEnhanceObservabilityEvent({
			caseId: 'case-1',
			noteContext: { kind: 'create' },
			correlationId: 'corr-a',
			eventType: 'enhance_requested',
			validationMode: null,
			outcome: 'pipeline_started',
			reasonCodes: [],
			metadata: { draftCharCount: 42, paragraphBlockCount: 2, modelId: 'm1' }
		});
		const evs = getEnhanceObservabilityEvents();
		expect(evs).toHaveLength(1);
		const e = evs[0]!;
		expect(e.eventType).toBe('enhance_requested');
		expect(e.metadata?.draftCharCount).toBe(42);
		expect(JSON.stringify(e)).not.toMatch(/secret|note body|paragraph text/i);
	});

	it('records validation rejection with stable reason codes only', () => {
		recordEnhanceObservabilityEvent({
			caseId: 'c',
			noteContext: { kind: 'edit', noteId: 'n1' },
			correlationId: 'corr-b',
			eventType: 'enhance_validation_outcome',
			validationMode: 'strict',
			outcome: 'rejected',
			reasonCodes: reasonCodesFromEnhanceReasons([
				{ code: 'fabrication_possible', message: 'Human text must not appear in telemetry' }
			])
		});
		const e = getEnhanceObservabilityEvents()[0]!;
		expect(e.reasonCodes).toEqual(['fabrication_possible']);
		expect(JSON.stringify(e)).not.toContain('Human text');
	});

	it('reasonCodesFromIntegrityFailureDetails parses CE-shaped details', () => {
		const codes = reasonCodesFromIntegrityFailureDetails({
			reasons: [{ code: 'coverage_key_terms', message: 'msg' }]
		});
		expect(codes).toEqual(['coverage_key_terms']);
	});

	it('reasonCodesFromEnhanceReasons dedupes', () => {
		expect(
			reasonCodesFromEnhanceReasons([
				{ code: 'a', message: 'x' },
				{ code: 'a', message: 'y' }
			])
		).toEqual(['a']);
	});

	it('clearEnhanceObservabilityEvents empties buffer and bumps tick', () => {
		recordEnhanceObservabilityEvent({
			caseId: 'c',
			noteContext: { kind: 'create' },
			correlationId: 'x',
			eventType: 'enhance_requested',
			validationMode: null,
			outcome: 'pipeline_started',
			reasonCodes: []
		});
		const t0 = get(enhanceObservabilityTick);
		clearEnhanceObservabilityEvents();
		expect(getEnhanceObservabilityEvents()).toHaveLength(0);
		expect(get(enhanceObservabilityTick)).toBeGreaterThan(t0);
	});

	it('newEnhanceCorrelationId returns non-empty string', () => {
		const a = newEnhanceCorrelationId();
		const b = newEnhanceCorrelationId();
		expect(a.length).toBeGreaterThan(4);
		expect(a).not.toBe(b);
	});

	it('ring buffer trims oldest events', () => {
		for (let i = 0; i < ENHANCE_OBSERVABILITY_MAX_EVENTS + 5; i++) {
			recordEnhanceObservabilityEvent({
				caseId: 'c',
				noteContext: { kind: 'create' },
				correlationId: `id-${i}`,
				eventType: 'enhance_requested',
				validationMode: null,
				outcome: 'pipeline_started',
				reasonCodes: []
			});
		}
		expect(getEnhanceObservabilityEvents().length).toBe(ENHANCE_OBSERVABILITY_MAX_EVENTS);
	});
});
