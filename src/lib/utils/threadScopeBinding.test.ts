/**
 * P19-08 — Thread scope binding utility tests.
 *
 * These tests verify the pure, stateless helper functions in threadScopeBinding.ts.
 * No browser, Svelte runtime, or network calls are required — these run in Vitest Node.
 *
 * What is covered:
 *   - classifyBindError maps each error kind correctly and deterministically
 *   - each error kind classification is exhaustive (no silent unknown fallthrough)
 *   - message helpers return non-empty strings with accurate content
 *   - bindErrorMessage delegates correctly per kind
 *   - ThreadBindResult type shape: success and failure branches are mutually exclusive
 *   - No binding result can be both success and failure simultaneously
 */
import { describe, it, expect } from 'vitest';
import {
	classifyBindError,
	scopeConflictMessage,
	accessDeniedMessage,
	backendUnavailableMessage,
	notFoundMessage,
	bindErrorMessage
} from './threadScopeBinding';
import type { ThreadBindResult, ThreadBindSuccess, ThreadBindFailure } from './threadScopeBinding';

// ─────────────────────────────────────────────────────────────────────────────
// 1. classifyBindError — HTTP status codes embedded in error messages
// ─────────────────────────────────────────────────────────────────────────────
describe('classifyBindError — HTTP status code patterns', () => {
	it('classifies (400) as scope_conflict', () => {
		expect(classifyBindError(new Error('Failed to bind thread to case (400)'))).toBe(
			'scope_conflict'
		);
	});

	it('classifies (403) as access_denied', () => {
		expect(classifyBindError(new Error('You do not have access (403)'))).toBe('access_denied');
	});

	it('classifies (404) as not_found', () => {
		expect(classifyBindError(new Error('Case not found (404)'))).toBe('not_found');
	});

	it('classifies (500) and unknown status as unknown', () => {
		expect(classifyBindError(new Error('Internal server error (500)'))).toBe('unknown');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. classifyBindError — semantic message patterns
// ─────────────────────────────────────────────────────────────────────────────
describe('classifyBindError — semantic message patterns', () => {
	it('classifies "Scope conflict" message as scope_conflict', () => {
		expect(
			classifyBindError(
				new Error(
					'Scope conflict: this thread is already active as a personal thread and cannot simultaneously be a case thread.'
				)
			)
		).toBe('scope_conflict');
	});

	it('classifies "scope conflict" (lowercase) as scope_conflict', () => {
		expect(classifyBindError(new Error('scope conflict detected'))).toBe('scope_conflict');
	});

	it('classifies "access denied" as access_denied', () => {
		expect(classifyBindError(new Error('access denied for this resource'))).toBe('access_denied');
	});

	it('classifies "forbidden" as access_denied', () => {
		expect(classifyBindError(new Error('Forbidden: insufficient permissions'))).toBe(
			'access_denied'
		);
	});

	it('classifies "not found" as not_found', () => {
		expect(classifyBindError(new Error('Resource not found'))).toBe('not_found');
	});

	it('classifies "Failed to fetch" as backend_unavailable', () => {
		expect(classifyBindError(new Error('Failed to fetch'))).toBe('backend_unavailable');
	});

	it('classifies "network" error as backend_unavailable', () => {
		expect(classifyBindError(new Error('network error occurred'))).toBe('backend_unavailable');
	});

	it('classifies "ECONNREFUSED" as backend_unavailable', () => {
		expect(classifyBindError(new Error('connect ECONNREFUSED 127.0.0.1:3010'))).toBe(
			'backend_unavailable'
		);
	});

	it('classifies "load failed" as backend_unavailable', () => {
		expect(classifyBindError(new Error('load failed'))).toBe('backend_unavailable');
	});

	it('classifies unexpected error message as unknown', () => {
		expect(classifyBindError(new Error('something completely unexpected happened'))).toBe(
			'unknown'
		);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. classifyBindError — TypeError (network failure)
// ─────────────────────────────────────────────────────────────────────────────
describe('classifyBindError — TypeError (fetch/network failures)', () => {
	it('classifies TypeError as backend_unavailable', () => {
		expect(classifyBindError(new TypeError('Failed to fetch'))).toBe('backend_unavailable');
	});

	it('classifies any TypeError as backend_unavailable (message is irrelevant)', () => {
		expect(classifyBindError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(
			'backend_unavailable'
		);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. classifyBindError — non-Error inputs
// ─────────────────────────────────────────────────────────────────────────────
describe('classifyBindError — non-Error inputs', () => {
	it('classifies plain string as unknown if no pattern matches', () => {
		expect(classifyBindError('some random string')).toBe('unknown');
	});

	it('classifies plain string with scope conflict as scope_conflict', () => {
		expect(classifyBindError('scope conflict: thread already registered')).toBe('scope_conflict');
	});

	it('classifies null as unknown', () => {
		expect(classifyBindError(null)).toBe('unknown');
	});

	it('classifies undefined as unknown', () => {
		expect(classifyBindError(undefined)).toBe('unknown');
	});

	it('classifies numeric error code (not TypeError) as unknown', () => {
		expect(classifyBindError(404)).toBe('unknown');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. classifyBindError — determinism
// ─────────────────────────────────────────────────────────────────────────────
describe('classifyBindError — determinism', () => {
	it('returns the same result on repeated calls with the same input', () => {
		const err = new Error('Scope conflict: thread is already active as a personal thread (400)');
		const first = classifyBindError(err);
		const second = classifyBindError(err);
		expect(first).toBe(second);
		expect(first).toBe('scope_conflict');
	});

	it('same error class, different message → different kind', () => {
		expect(classifyBindError(new Error('Failed to bind (403)'))).toBe('access_denied');
		expect(classifyBindError(new Error('Failed to bind (404)'))).toBe('not_found');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Message helpers — non-empty strings with correct content
// ─────────────────────────────────────────────────────────────────────────────
describe('scopeConflictMessage', () => {
	it('returns a non-empty string for case scope', () => {
		const msg = scopeConflictMessage('case');
		expect(typeof msg).toBe('string');
		expect(msg.length).toBeGreaterThan(0);
	});

	it('returns a non-empty string for personal scope', () => {
		const msg = scopeConflictMessage('personal');
		expect(typeof msg).toBe('string');
		expect(msg.length).toBeGreaterThan(0);
	});

	it('case message mentions personal (thread is already personal)', () => {
		expect(scopeConflictMessage('case').toLowerCase()).toContain('personal');
	});

	it('personal message mentions case (thread is already case)', () => {
		expect(scopeConflictMessage('personal').toLowerCase()).toContain('case');
	});

	it('case and personal messages are different', () => {
		expect(scopeConflictMessage('case')).not.toBe(scopeConflictMessage('personal'));
	});
});

describe('accessDeniedMessage', () => {
	it('returns a non-empty string', () => {
		const msg = accessDeniedMessage();
		expect(typeof msg).toBe('string');
		expect(msg.length).toBeGreaterThan(0);
	});
});

describe('backendUnavailableMessage', () => {
	it('returns a non-empty string', () => {
		const msg = backendUnavailableMessage();
		expect(typeof msg).toBe('string');
		expect(msg.length).toBeGreaterThan(0);
	});

	it('mentions that chat is blocked (not silently open)', () => {
		expect(backendUnavailableMessage().toLowerCase()).toContain('blocked');
	});
});

describe('notFoundMessage', () => {
	it('returns a non-empty string', () => {
		const msg = notFoundMessage();
		expect(typeof msg).toBe('string');
		expect(msg.length).toBeGreaterThan(0);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. bindErrorMessage — delegates per kind
// ─────────────────────────────────────────────────────────────────────────────
describe('bindErrorMessage', () => {
	it('delegates scope_conflict to scopeConflictMessage', () => {
		expect(bindErrorMessage('scope_conflict', 'case')).toBe(scopeConflictMessage('case'));
		expect(bindErrorMessage('scope_conflict', 'personal')).toBe(scopeConflictMessage('personal'));
	});

	it('delegates access_denied to accessDeniedMessage', () => {
		expect(bindErrorMessage('access_denied')).toBe(accessDeniedMessage());
	});

	it('delegates backend_unavailable to backendUnavailableMessage', () => {
		expect(bindErrorMessage('backend_unavailable')).toBe(backendUnavailableMessage());
	});

	it('delegates not_found to notFoundMessage', () => {
		expect(bindErrorMessage('not_found')).toBe(notFoundMessage());
	});

	it('returns a non-empty string for unknown', () => {
		const msg = bindErrorMessage('unknown');
		expect(typeof msg).toBe('string');
		expect(msg.length).toBeGreaterThan(0);
	});

	it('surfaces originalMessage when unknown and provided', () => {
		const backendErr = 'Failed to bind thread to case (500)';
		expect(bindErrorMessage('unknown', 'case', backendErr)).toBe(backendErr);
		expect(bindErrorMessage('unknown', 'personal', backendErr)).toBe(backendErr);
	});

	it('uses case scope as default for scope_conflict when scope is absent', () => {
		expect(bindErrorMessage('scope_conflict')).toBe(scopeConflictMessage('case'));
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. ThreadBindResult type shape — success and failure are mutually exclusive
// ─────────────────────────────────────────────────────────────────────────────
describe('ThreadBindResult shape contract', () => {
	it('success result has success: true and a scope', () => {
		const result: ThreadBindSuccess = { success: true, scope: 'case', caseId: 'case-1' };
		expect(result.success).toBe(true);
		expect(result.scope).toBe('case');
		if (result.scope === 'case') {
			expect(result.caseId).toBe('case-1');
		}
	});

	it('personal success result has success: true and scope personal', () => {
		const result: ThreadBindSuccess = { success: true, scope: 'personal' };
		expect(result.success).toBe(true);
		expect(result.scope).toBe('personal');
	});

	it('failure result has success: false and a kind + message', () => {
		const result: ThreadBindFailure = {
			success: false,
			kind: 'scope_conflict',
			message: 'conflict'
		};
		expect(result.success).toBe(false);
		expect(result.kind).toBe('scope_conflict');
		expect(result.message.length).toBeGreaterThan(0);
	});

	it('success and failure branches are distinguishable by success field', () => {
		const success: ThreadBindResult = { success: true, scope: 'personal' };
		const failure: ThreadBindResult = { success: false, kind: 'unknown', message: 'err' };
		expect(success.success).toBe(true);
		expect(failure.success).toBe(false);
		// They cannot both be true simultaneously — type narrowing works correctly
		if (success.success) {
			expect(success.scope).toBeDefined();
		}
		if (!failure.success) {
			expect(failure.kind).toBeDefined();
			expect(failure.message).toBeDefined();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Doctrine — no binding result is ambiguous or open-ended
// ─────────────────────────────────────────────────────────────────────────────
describe('doctrine — fail-closed binding classification', () => {
	it('every error kind maps to a non-empty user message via bindErrorMessage', () => {
		const kinds: Array<import('./threadScopeBinding').ThreadScopeErrorKind> = [
			'scope_conflict',
			'access_denied',
			'not_found',
			'backend_unavailable',
			'unknown'
		];
		for (const kind of kinds) {
			const msg = bindErrorMessage(kind);
			expect(typeof msg).toBe('string');
			expect(msg.length).toBeGreaterThan(0);
		}
	});

	it('no error kind silently falls through to an empty message', () => {
		const kinds: Array<import('./threadScopeBinding').ThreadScopeErrorKind> = [
			'scope_conflict',
			'access_denied',
			'not_found',
			'backend_unavailable',
			'unknown'
		];
		for (const kind of kinds) {
			expect(bindErrorMessage(kind)).not.toBe('');
		}
	});

	it('backend_unavailable message explicitly blocks chat — never permits ambiguous open', () => {
		const msg = backendUnavailableMessage();
		expect(msg.toLowerCase()).toContain('blocked');
	});
});
