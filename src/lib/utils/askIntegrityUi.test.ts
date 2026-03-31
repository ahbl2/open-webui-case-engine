/**
 * P33-07 — Ask integrity UI metadata and normalization (deterministic, no DOM).
 */
import { describe, expect, it } from 'vitest';
import {
	askIntegrityPresentationMeta,
	normalizeAskFactInferenceArrays
} from './askIntegrityUi';

describe('askIntegrityPresentationMeta', () => {
	it('uses distinct badge labels for SUPPORTED vs DEGRADED vs NOT_APPLICABLE', () => {
		const s = askIntegrityPresentationMeta('SUPPORTED');
		const d = askIntegrityPresentationMeta('DEGRADED');
		const n = askIntegrityPresentationMeta('NOT_APPLICABLE');
		expect(s?.badgeLabel).toBeTruthy();
		expect(d?.badgeLabel).toBeTruthy();
		expect(n?.badgeLabel).toBeTruthy();
		expect(new Set([s?.badgeLabel, d?.badgeLabel, n?.badgeLabel]).size).toBe(3);
	});

	it('uses distinct panel classes so supported is not confused with degraded', () => {
		const s = askIntegrityPresentationMeta('SUPPORTED');
		const d = askIntegrityPresentationMeta('DEGRADED');
		expect(s?.panelClass).toContain('emerald');
		expect(d?.panelClass).toContain('amber');
		expect(s?.panelClass).not.toEqual(d?.panelClass);
	});

	it('NOT_APPLICABLE is visually distinct from SUPPORTED (slate vs emerald)', () => {
		const s = askIntegrityPresentationMeta('SUPPORTED');
		const n = askIntegrityPresentationMeta('NOT_APPLICABLE');
		expect(n?.panelClass).toContain('slate');
		expect(s?.panelClass).not.toEqual(n?.panelClass);
	});

	it('returns null when presentation is missing', () => {
		expect(askIntegrityPresentationMeta(undefined)).toBeNull();
		expect(askIntegrityPresentationMeta(null)).toBeNull();
	});
});

describe('normalizeAskFactInferenceArrays', () => {
	it('keeps empty layouts stable', () => {
		expect(normalizeAskFactInferenceArrays(undefined, undefined)).toEqual({
			facts: [],
			inferences: []
		});
		expect(normalizeAskFactInferenceArrays([], [])).toEqual({ facts: [], inferences: [] });
	});

	it('parses valid rows and drops malformed entries', () => {
		const { facts, inferences } = normalizeAskFactInferenceArrays(
			[
				{ text: 'Witness saw sedan', supporting_citation_ids: ['e1', 'e2'] },
				{ text: 'bad', supporting_citation_ids: 'nope' }
			],
			[{ text: 'Pattern suggests X', anchored_citation_ids: ['e1'] }, null]
		);
		expect(facts).toHaveLength(1);
		expect(facts[0].text).toBe('Witness saw sedan');
		expect(inferences).toHaveLength(1);
		expect(inferences[0].text).toBe('Pattern suggests X');
	});

	it('does not inject withheld answer text', () => {
		const { facts } = normalizeAskFactInferenceArrays(
			[{ text: 'SECRET_MODEL_ANSWER_LEAK', supporting_citation_ids: [] }],
			[]
		);
		expect(facts[0].text).toBe('SECRET_MODEL_ANSWER_LEAK');
	});
});
