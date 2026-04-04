/**
 * Contract tests for caseButtonClasses.
 *
 * These tests lock the structural properties of each role constant so that
 * accidental drift from the Notes reference standard is caught immediately.
 * They do not test visual appearance — they test that the constants contain
 * the tokens that define each role's behavior.
 */
import { describe, it, expect } from 'vitest';
import { CASE_CANCEL_BTN_CLASS } from './caseButtonClasses';

describe('CASE_CANCEL_BTN_CLASS (cancel / abandon form)', () => {
	it('is a non-empty string', () => {
		expect(typeof CASE_CANCEL_BTN_CLASS).toBe('string');
		expect(CASE_CANCEL_BTN_CLASS.trim().length).toBeGreaterThan(0);
	});

	it('includes rounded corners', () => {
		expect(CASE_CANCEL_BTN_CLASS).toContain('rounded');
	});

	it('uses the standard disabled opacity (50, matching Notes reference)', () => {
		expect(CASE_CANCEL_BTN_CLASS).toContain('disabled:opacity-50');
		expect(CASE_CANCEL_BTN_CLASS).not.toContain('disabled:opacity-40');
	});

	it('includes disabled cursor-not-allowed (regression: was missing in Timeline)', () => {
		expect(CASE_CANCEL_BTN_CLASS).toContain('disabled:cursor-not-allowed');
	});

	it('includes transition for smooth state changes', () => {
		expect(CASE_CANCEL_BTN_CLASS).toContain('transition');
	});

	it('uses gray-500 base text (non-emphasis, subordinate to primary action)', () => {
		expect(CASE_CANCEL_BTN_CLASS).toContain('text-gray-500');
	});

	it('does not include a filled background (cancel is text-only, not filled)', () => {
		expect(CASE_CANCEL_BTN_CLASS).not.toMatch(/bg-(?!transparent)[a-z]+-\d{3}/);
	});
});
