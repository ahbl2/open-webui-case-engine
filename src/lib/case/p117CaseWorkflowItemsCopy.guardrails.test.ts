/**
 * P117-04 — Operator copy guardrails (no prioritization / recommendation framing).
 */
import { describe, expect, it } from 'vitest';
import * as copy from './p117CaseWorkflowItemsCopy';

describe('p117CaseWorkflowItemsCopy guardrails', () => {
	const all = Object.values(copy).filter((v) => typeof v === 'string') as string[];

	it('does not use recommendation or priority language', () => {
		const re = /\b(recommendation|recommended|priority|urgent|insight|suggested action|likely next)\b/i;
		for (const s of all) {
			expect(s).not.toMatch(re);
		}
	});

	it('intro states operational posture vs Timeline', () => {
		expect(copy.P117_CASE_WORKFLOW_INTRO).toMatch(/operational/i);
		expect(copy.P117_CASE_WORKFLOW_INTRO).toMatch(/timeline/i);
	});
});
