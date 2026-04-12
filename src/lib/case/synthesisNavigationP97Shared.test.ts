import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./synthesisNavigationClear', () => ({
	clearSynthesisNavigationPageState: vi.fn(() => Promise.resolve())
}));

import { clearSynthesisNavigationPageState } from './synthesisNavigationClear';
import {
	P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS,
	parseFilesSourceKindFromIntent,
	scheduleStaleSynthesisIntentClear
} from './synthesisNavigationP97Shared';

describe('P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS', () => {
	it('is a positive duration shared across surfaces', () => {
		expect(P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS).toBeGreaterThan(0);
	});
});

describe('parseFilesSourceKindFromIntent', () => {
	it('returns null for non-matching or invalid input', () => {
		expect(parseFilesSourceKindFromIntent(null)).toBeNull();
		expect(parseFilesSourceKindFromIntent(undefined)).toBeNull();
		expect(parseFilesSourceKindFromIntent({ source_kind: 'task' })).toBeNull();
		expect(parseFilesSourceKindFromIntent({})).toBeNull();
	});

	it('returns case_file and extracted_text only', () => {
		expect(parseFilesSourceKindFromIntent({ source_kind: 'case_file' })).toBe('case_file');
		expect(parseFilesSourceKindFromIntent({ source_kind: 'extracted_text' })).toBe('extracted_text');
	});
});

describe('scheduleStaleSynthesisIntentClear', () => {
	beforeEach(() => {
		vi.mocked(clearSynthesisNavigationPageState).mockClear();
	});

	it('calls clear once and resets the gate', async () => {
		let inflight = false;
		scheduleStaleSynthesisIntentClear(
			() => ({ url: new URL('http://localhost/case/a/timeline') }),
			() => inflight,
			(v) => {
				inflight = v;
			}
		);
		expect(clearSynthesisNavigationPageState).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => expect(inflight).toBe(false));
	});

	it('skips when already in flight', () => {
		scheduleStaleSynthesisIntentClear(
			() => ({ url: new URL('http://localhost/case/a/timeline') }),
			() => true,
			() => {}
		);
		expect(clearSynthesisNavigationPageState).not.toHaveBeenCalled();
	});
});
