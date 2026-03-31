import { describe, expect, it } from 'vitest';
import { validateEnhanceOutputDisallowedPatterns } from './noteEnhanceOutputGuardrails';

describe('noteEnhanceOutputGuardrails', () => {
	it('rejects assistant voice (parity with Case Engine)', () => {
		expect(
			validateEnhanceOutputDisallowedPatterns(
				"I'd be happy to help rewrite your note.",
				'Short draft.'
			)
		).toBe('enhance:assistant_voice_detected');
	});

	it('rejects bracket placeholders', () => {
		expect(validateEnhanceOutputDisallowedPatterns('Met on [Date] at noon.', 'Met at noon.')).toBe(
			'enhance:placeholder_detected'
		);
	});
});
