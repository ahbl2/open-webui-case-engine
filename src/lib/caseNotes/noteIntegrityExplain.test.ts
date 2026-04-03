import { describe, expect, it } from 'vitest';
import {
	buildSaveBlockedExplain,
	integrityReasonsFromInternalKeys,
	parseIntegrityFailureDetails
} from './noteIntegrityExplain';

describe('P31-03 noteIntegrityExplain', () => {
	it('parseIntegrityFailureDetails reads contract objects from API', () => {
		const r = parseIntegrityFailureDetails({
			reasons: [
				{ code: 'fabrication_possible', message: 'Custom server message for fabrication.' }
			]
		});
		expect(r).toEqual([
			{ code: 'fabrication_possible', message: 'Custom server message for fabrication.' }
		]);
	});

	it('parseIntegrityFailureDetails maps legacy string reasons', () => {
		const r = parseIntegrityFailureDetails({ reasons: ['fabrication'] });
		expect(r[0]?.code).toBe('fabrication_possible');
		expect(r[0]?.message.length).toBeGreaterThan(10);
	});

	it('buildSaveBlockedExplain uses API bullets when present', () => {
		const b = buildSaveBlockedExplain(
			{ reasons: [{ code: 'x', message: 'Reason one' }] },
			'Fallback top message'
		);
		expect(b.heading).toBe('Save blocked by integrity checks');
		expect(b.bullets).toEqual(['Reason one']);
		expect(b.guidance.length).toBeGreaterThanOrEqual(2);
	});

	it('buildSaveBlockedExplain falls back when reasons absent', () => {
		const b = buildSaveBlockedExplain({}, '');
		expect(b.bullets.length).toBe(1);
		expect(b.bullets[0]).toContain('integrity');
	});

	it('buildSaveBlockedExplain uses API message as single bullet when reasons absent', () => {
		const b = buildSaveBlockedExplain({}, 'Note failed integrity validation.');
		expect(b.bullets).toEqual(['Note failed integrity validation.']);
	});

	it('integrityReasonsFromInternalKeys dedupes by code', () => {
		const r = integrityReasonsFromInternalKeys(['fabrication', 'fabrication']);
		expect(r).toHaveLength(1);
	});

	it('alignment:expansion explains safe expansion limits without numeric thresholds', () => {
		const r = integrityReasonsFromInternalKeys(['alignment:expansion']);
		expect(r[0]?.code).toBe('alignment_expansion');
		expect(r[0]?.message.toLowerCase()).toContain('safe expansion');
		expect(r[0]?.message).toMatch(/^[^0-9]*$/);
	});
});
