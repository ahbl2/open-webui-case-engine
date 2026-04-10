/**
 * P76-03 — Wave 3 case shell strangler flag parsing.
 */
import { describe, expect, it } from 'vitest';
import { parseWave3CaseShellFlag } from './detectiveWave3CaseShell';

describe('detectiveWave3CaseShell (P76-03)', () => {
	it('defaults on when unset or empty', () => {
		expect(parseWave3CaseShellFlag(undefined)).toBe(true);
		expect(parseWave3CaseShellFlag('')).toBe(true);
	});

	it('disables for explicit off tokens', () => {
		expect(parseWave3CaseShellFlag('0')).toBe(false);
		expect(parseWave3CaseShellFlag('false')).toBe(false);
		expect(parseWave3CaseShellFlag('FALSE')).toBe(false);
		expect(parseWave3CaseShellFlag('off')).toBe(false);
		expect(parseWave3CaseShellFlag('no')).toBe(false);
	});

	it('enables for other values', () => {
		expect(parseWave3CaseShellFlag('1')).toBe(true);
		expect(parseWave3CaseShellFlag('true')).toBe(true);
		expect(parseWave3CaseShellFlag('yes')).toBe(true);
	});
});
