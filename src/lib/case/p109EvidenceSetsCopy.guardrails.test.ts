/**
 * P109-03 — Operator copy must not imply AI, inference-as-output, or completed export/report.
 */
import { describe, expect, it } from 'vitest';
import * as copy from './p109EvidenceSetsCopy';

describe('p109EvidenceSetsCopy guardrails', () => {
	const all = Object.values(copy).filter((v) => typeof v === 'string') as string[];

	it('does not use AI / ML framing', () => {
		const re = /\b(ai|artificial intelligence|machine learning|llm|gpt|inference engine|automated analysis)\b/i;
		for (const s of all) {
			expect(s).not.toMatch(re);
		}
	});

	it('does not promise export or report completion', () => {
		const re = /\b(export ready|report generated|download package|pdf generated)\b/i;
		for (const s of all) {
			expect(s).not.toMatch(re);
		}
	});

	it('success copy states selection clear explicitly (safer duplicate-submit pattern)', () => {
		expect(copy.P109_EVIDENCE_SETS_CREATE_SUCCESS('N', 2)).toMatch(/cleared/i);
	});
});
