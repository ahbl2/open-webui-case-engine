/**
 * P20-PRE-04 — Map Case Engine client errors to explicit UI states (in-scope paths only).
 */
import {
	BrowserResolveFailure,
	CaseEngineRequestError
} from '$lib/apis/caseEngine';

export type CaseEngineUiState =
	| 'loading'
	| 'success'
	| 'validation_error'
	| 'integrity_refused'
	| 'dependency_unavailable'
	| 'timeout'
	| 'unknown_error';

const LABEL: Record<Exclude<CaseEngineUiState, 'loading' | 'success'>, string> = {
	validation_error: 'Validation',
	integrity_refused: 'Integrity refusal',
	dependency_unavailable: 'Unavailable',
	timeout: 'Timeout',
	unknown_error: 'Error'
};

/**
 * P20-PRE-04: single source of truth for Case Engine ask rows (THIS_CASE + cross-case).
 * Chat merges these into assistant messages; placeholder is replaced in-place (same id) on success/failure.
 */
export const P20_CASE_ENGINE_ASK_UI = {
	loading: {
		caseEngineUiState: 'loading' as const,
		done: false as const,
		content: '' as const
	},
	success: {
		caseEngineUiState: 'success' as const,
		done: true as const
	}
} as const;

/** P20-PRE-04: `/case/[id]` shell header — explicit phase for tests and `data-case-engine-ui-state`. */
export function caseShellHeaderDataUiState(params: {
	loading: boolean;
	hasActiveCaseMeta: boolean;
	loadError: string;
	loadUiState: CaseEngineUiState | null;
}): CaseEngineUiState | '' {
	if (params.loading && !params.hasActiveCaseMeta) return 'loading';
	if (params.loadError && params.loadUiState) return params.loadUiState;
	if (params.hasActiveCaseMeta && !params.loading && params.loadUiState === 'success') return 'success';
	return '';
}

/** User-visible line: deterministic prefix + server/transport message (no fabricated fields). */
export function formatCaseEngineUiMessage(state: CaseEngineUiState, userMessage: string): string {
	if (state === 'loading' || state === 'success') return userMessage;
	return `[Case Engine · ${LABEL[state]}] ${userMessage}`;
}

export function classifyCaseEngineFailure(err: unknown): { state: CaseEngineUiState; userMessage: string } {
	const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

	if (err instanceof CaseEngineRequestError) {
		const st = err.httpStatus;
		const code = err.errorCode ?? '';
		const m = err.message;
		if (code === 'ASK_INTEGRITY_REFUSED') {
			return { state: 'integrity_refused', userMessage: m };
		}
		if (
			code === 'INVALID_ENVELOPE' ||
			/invalid envelope|invalid response body/i.test(m)
		) {
			return { state: 'validation_error', userMessage: m };
		}
		if (st === 422 || code === 'ASK_VALIDATION_FAILED') {
			return { state: 'validation_error', userMessage: m };
		}
		if (st === 400) {
			return { state: 'validation_error', userMessage: m };
		}
		if (st === 502 || st === 503 || st === 504) {
			return { state: 'dependency_unavailable', userMessage: m };
		}
		if (st != null && st >= 500 && st <= 599) {
			return { state: 'dependency_unavailable', userMessage: m };
		}
		return { state: 'unknown_error', userMessage: m };
	}

	if (err instanceof BrowserResolveFailure) {
		if (err.classification === 'network_unreachable') {
			return { state: 'dependency_unavailable', userMessage: err.message };
		}
		if (err.classification === 'server_error') {
			return { state: 'dependency_unavailable', userMessage: err.message };
		}
		if (err.httpStatus === 502 || err.httpStatus === 503 || err.httpStatus === 504) {
			return { state: 'dependency_unavailable', userMessage: err.message };
		}
		return { state: 'unknown_error', userMessage: err.message };
	}

	if (err instanceof DOMException && err.name === 'AbortError') {
		return { state: 'timeout', userMessage: err.message || 'Request aborted' };
	}
	if (err instanceof Error && err.name === 'AbortError') {
		return { state: 'timeout', userMessage: err.message || 'Request aborted' };
	}

	if (err instanceof TypeError) {
		const m = err.message;
		if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) {
			return { state: 'dependency_unavailable', userMessage: m };
		}
	}

	return { state: 'unknown_error', userMessage: msg(err) };
}
