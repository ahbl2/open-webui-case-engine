import { describe, expect, it } from 'vitest';
import { computeEnhanceAuditDiffStats, mapReasonCodesToAuditGuards } from './enhancePipelineAudit';

describe('mapReasonCodesToAuditGuards', () => {
	it('maps known integrity-style codes to coarse guard buckets', () => {
		expect(
			mapReasonCodesToAuditGuards([
				'fabrication_risk',
				'directive_dropped',
				'certainty_violation',
				'entity_role_swap',
				'token-count',
				'coverage_alignment'
			]).sort()
		).toEqual(
			[
				'certainty-qualifier',
				'coverage-alignment',
				'directive-preservation',
				'entity-role',
				'output-guardrails',
				'token-count'
			].sort()
		);
	});

	it('tags unknown codes as other', () => {
		expect(mapReasonCodesToAuditGuards(['custom_xyz'])).toContain('other:custom_xyz');
	});
});

describe('computeEnhanceAuditDiffStats', () => {
	it('computes length, percent change, and coarse token deltas', () => {
		const a = 'one two three.';
		const b = 'one two four five.';
		const s = computeEnhanceAuditDiffStats(a, b);
		expect(s).not.toBeNull();
		expect(s!.inputLen).toBe(a.length);
		expect(s!.outputLen).toBe(b.length);
		expect(s!.pctChange).toBeGreaterThan(0);
		expect(s!.wordDelta).toBe(1);
		expect(s!.addedTokens).toBeGreaterThanOrEqual(1);
		expect(s!.removedTokens).toBeGreaterThanOrEqual(0);
	});

	it('returns null when output is nullish', () => {
		expect(computeEnhanceAuditDiffStats('a', null)).toBeNull();
		expect(computeEnhanceAuditDiffStats('a', undefined)).toBeNull();
	});
});
