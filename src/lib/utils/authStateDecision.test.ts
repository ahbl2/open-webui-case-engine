/**
 * P19-05: Unit tests for the auth-state routing decision logic.
 *
 * These tests verify that the gating rules are correct and exhaustive:
 * - only 'active' proceeds into the workspace
 * - every other state (including 'unavailable') is blocked
 * - there is no fail-open path
 * - each blocked state routes to the correct dedicated screen
 * - unknown/null/undefined states default to the pending gate (conservative)
 */
import { describe, it, expect } from 'vitest';
import { resolveAuthStateDecision, blockedRedirectPath } from './authStateDecision';

describe('resolveAuthStateDecision', () => {
	it('returns proceed only for active', () => {
		expect(resolveAuthStateDecision('active')).toBe('proceed');
	});

	it('returns disabled for disabled state', () => {
		expect(resolveAuthStateDecision('disabled')).toBe('disabled');
	});

	it('returns unavailable for unavailable state', () => {
		expect(resolveAuthStateDecision('unavailable')).toBe('unavailable');
	});

	it('returns transient_ce for HTTP-classified browser-resolve failures (redirect handled separately)', () => {
		expect(resolveAuthStateDecision('rate_limited')).toBe('transient_ce');
		expect(resolveAuthStateDecision('auth_http_error')).toBe('transient_ce');
		expect(resolveAuthStateDecision('ce_server_error')).toBe('transient_ce');
		expect(resolveAuthStateDecision('ce_client_error')).toBe('transient_ce');
	});

	it('returns pending for pending state', () => {
		expect(resolveAuthStateDecision('pending')).toBe('pending');
	});

	it('returns pending for denied_no_profile', () => {
		expect(resolveAuthStateDecision('denied_no_profile')).toBe('pending');
	});

	it('returns pending (blocked) for null — conservative default', () => {
		expect(resolveAuthStateDecision(null)).toBe('pending');
	});

	it('returns pending (blocked) for undefined — conservative default', () => {
		expect(resolveAuthStateDecision(undefined)).toBe('pending');
	});

	it('returns pending (blocked) for any unknown string — no fail-open', () => {
		expect(resolveAuthStateDecision('unknown_future_state')).toBe('pending');
		expect(resolveAuthStateDecision('')).toBe('pending');
	});
});

describe('blockedRedirectPath', () => {
	it('returns null only for proceed — workspace access is allowed', () => {
		expect(blockedRedirectPath('proceed')).toBeNull();
	});

	it('routes pending to /access-pending', () => {
		expect(blockedRedirectPath('pending')).toBe('/access-pending');
	});

	it('routes disabled to /access-disabled', () => {
		expect(blockedRedirectPath('disabled')).toBe('/access-disabled');
	});

	it('routes unavailable to /access-unavailable — not to workspace', () => {
		expect(blockedRedirectPath('unavailable')).toBe('/access-unavailable');
	});

	it('routes transient_ce to /access-unavailable (P20-PRE-01 — no shell without CE linkage)', () => {
		expect(blockedRedirectPath('transient_ce')).toBe('/access-unavailable');
	});
});

describe('gating completeness — no state is allowed to reach the workspace unblocked', () => {
	const allNonActiveStates: Array<string | null | undefined> = [
		'pending',
		'disabled',
		'denied_no_profile',
		'unavailable',
		null,
		undefined,
		'',
		'anything_unknown'
	];

	it('every hard-gated non-active state produces a blocked decision with a non-null redirect path', () => {
		for (const state of allNonActiveStates) {
			const decision = resolveAuthStateDecision(state);
			expect(decision).not.toBe('proceed');
			const path = blockedRedirectPath(decision);
			expect(path).not.toBeNull();
			expect(typeof path).toBe('string');
		}
	});

	it('only proceed (active) has null redirect — shell may render', () => {
		expect(blockedRedirectPath(resolveAuthStateDecision('active'))).toBeNull();
		expect(blockedRedirectPath('transient_ce')).toBe('/access-unavailable');
	});
});
