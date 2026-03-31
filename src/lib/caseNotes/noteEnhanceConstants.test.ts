import { describe, expect, it } from 'vitest';
import {
	SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO,
	SAFE_MODE_MAX_LENGTH_GROWTH_RATIO,
	SAFE_MODE_SHORT_NOTE_THRESHOLD_CHARS,
	safeModeCoarseLengthAllowanceChars,
	safeModeLengthGuardSignals
} from './noteEnhanceConstants';

describe('noteEnhanceConstants', () => {
	it('SAFE_MODE_MAX_LENGTH_GROWTH_RATIO is only a legacy alias of the long-note ratio (not the shorthand rule)', () => {
		expect(SAFE_MODE_MAX_LENGTH_GROWTH_RATIO).toBe(SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO);
		expect(SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO).toBe(1.25);
	});

	it('shorthand branch uses max(doubled, orig + absolute) below threshold', () => {
		const o = 40;
		expect(safeModeCoarseLengthAllowanceChars(o)).toBe(
			Math.ceil(Math.max(o * 2, o + 100))
		);
	});

	it('long-note branch uses ratio at and above threshold', () => {
		const o = SAFE_MODE_SHORT_NOTE_THRESHOLD_CHARS;
		expect(safeModeCoarseLengthAllowanceChars(o)).toBe(
			Math.ceil(o * SAFE_MODE_LONG_NOTE_LENGTH_GROWTH_RATIO)
		);
	});

	it('safeModeLengthGuardSignals marks short input and growth ratio', () => {
		const sig = safeModeLengthGuardSignals('short note', 'short note expanded for readability here');
		expect(sig.isShortInput).toBe(true);
		expect(sig.growthRatio).toBeGreaterThan(1);
		expect(sig.allowedLength).toBe(safeModeCoarseLengthAllowanceChars('short note'.length));
	});
});
