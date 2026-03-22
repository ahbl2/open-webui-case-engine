/**
 * P20-PRE-04 — deterministic UI state mapping for Case Engine failures.
 */
import { describe, it, expect } from 'vitest';
import {
	BrowserResolveFailure,
	CaseEngineRequestError
} from '$lib/apis/caseEngine';
import {
	caseShellHeaderDataUiState,
	classifyCaseEngineFailure,
	formatCaseEngineUiMessage,
	P20_CASE_ENGINE_ASK_UI
} from './caseEngineUiState';

describe('classifyCaseEngineFailure (P20-PRE-04)', () => {
	it('maps 422 CaseEngineRequestError to validation_error', () => {
		const e = new CaseEngineRequestError('bad ask', 422, 'ASK_VALIDATION_FAILED');
		expect(classifyCaseEngineFailure(e)).toEqual({
			state: 'validation_error',
			userMessage: 'bad ask'
		});
	});

	it('P20-PRE-07: 422 with requestId still maps to validation_error (explicit state, not blank success)', () => {
		const e = new CaseEngineRequestError('bad ask', 422, 'ASK_VALIDATION_FAILED', undefined, 'req-abc');
		expect(classifyCaseEngineFailure(e)).toEqual({
			state: 'validation_error',
			userMessage: 'bad ask'
		});
	});

	it('maps INVALID_ENVELOPE to validation_error', () => {
		const e = new CaseEngineRequestError('getCaseById: invalid envelope', 200, 'INVALID_ENVELOPE');
		expect(classifyCaseEngineFailure(e).state).toBe('validation_error');
	});

	it('maps 502/503/504 to dependency_unavailable', () => {
		expect(classifyCaseEngineFailure(new CaseEngineRequestError('x', 502)).state).toBe(
			'dependency_unavailable'
		);
		expect(classifyCaseEngineFailure(new CaseEngineRequestError('x', 503)).state).toBe(
			'dependency_unavailable'
		);
		expect(classifyCaseEngineFailure(new CaseEngineRequestError('x', 504)).state).toBe(
			'dependency_unavailable'
		);
	});

	it('maps other 5xx to dependency_unavailable', () => {
		expect(classifyCaseEngineFailure(new CaseEngineRequestError('x', 500)).state).toBe(
			'dependency_unavailable'
		);
	});

	it('maps 404 to unknown_error', () => {
		expect(classifyCaseEngineFailure(new CaseEngineRequestError('missing', 404)).state).toBe(
			'unknown_error'
		);
	});

	it('maps AbortError to timeout', () => {
		const e = new DOMException('Aborted', 'AbortError');
		expect(classifyCaseEngineFailure(e).state).toBe('timeout');
	});

	it('maps TypeError failed to fetch to dependency_unavailable', () => {
		const e = new TypeError('Failed to fetch');
		expect(classifyCaseEngineFailure(e).state).toBe('dependency_unavailable');
	});

	it('maps BrowserResolveFailure network_unreachable to dependency_unavailable', () => {
		const e = new BrowserResolveFailure('network_unreachable', 'offline');
		expect(classifyCaseEngineFailure(e).state).toBe('dependency_unavailable');
	});
});

describe('formatCaseEngineUiMessage', () => {
	it('prefixes non-success states', () => {
		expect(formatCaseEngineUiMessage('validation_error', 'Details')).toContain('Validation');
		expect(formatCaseEngineUiMessage('validation_error', 'Details')).toContain('Details');
	});
});

describe('P20-PRE-04 explicit loading / success markers', () => {
	it('ask placeholder uses loading + empty content contract', () => {
		expect(P20_CASE_ENGINE_ASK_UI.loading.caseEngineUiState).toBe('loading');
		expect(P20_CASE_ENGINE_ASK_UI.loading.done).toBe(false);
		expect(P20_CASE_ENGINE_ASK_UI.loading.content).toBe('');
		expect(P20_CASE_ENGINE_ASK_UI.success.caseEngineUiState).toBe('success');
		expect(P20_CASE_ENGINE_ASK_UI.success.done).toBe(true);
	});

	it('case shell header exposes loading then success via caseShellHeaderDataUiState', () => {
		expect(
			caseShellHeaderDataUiState({
				loading: true,
				hasActiveCaseMeta: false,
				loadError: '',
				loadUiState: 'loading'
			})
		).toBe('loading');
		expect(
			caseShellHeaderDataUiState({
				loading: false,
				hasActiveCaseMeta: true,
				loadError: '',
				loadUiState: 'success'
			})
		).toBe('success');
		expect(
			caseShellHeaderDataUiState({
				loading: false,
				hasActiveCaseMeta: false,
				loadError: '[Case Engine · Validation] bad',
				loadUiState: 'validation_error'
			})
		).toBe('validation_error');
	});
});
