/**
 * P75-03 — Wave 2 shell strangler flag parsing.
 */
import { describe, expect, it } from 'vitest';
import { parseWave2AppShellFlag } from './detectiveWave2Shell';

describe('detectiveWave2Shell (P75-03)', () => {
	it('defaults on when unset or empty', () => {
		expect(parseWave2AppShellFlag(undefined)).toBe(true);
		expect(parseWave2AppShellFlag('')).toBe(true);
	});

	it('disables for explicit off tokens', () => {
		expect(parseWave2AppShellFlag('0')).toBe(false);
		expect(parseWave2AppShellFlag('false')).toBe(false);
		expect(parseWave2AppShellFlag('FALSE')).toBe(false);
		expect(parseWave2AppShellFlag('off')).toBe(false);
		expect(parseWave2AppShellFlag('no')).toBe(false);
	});

	it('enables for other values', () => {
		expect(parseWave2AppShellFlag('1')).toBe(true);
		expect(parseWave2AppShellFlag('true')).toBe(true);
		expect(parseWave2AppShellFlag('yes')).toBe(true);
	});
});
