import { describe, it, expect } from 'vitest';
import {
	P109_EVIDENCE_SELECTION_BAR_LABEL,
	P109_EVIDENCE_SELECTION_BAR_EMPTY,
	P109_EVIDENCE_SELECTION_BAR_COUNTS,
	P109_EVIDENCE_SELECTION_CLEAR,
	P109_EVIDENCE_SELECTION_TIMELINE_TOGGLE_TITLE,
	P109_EVIDENCE_SELECTION_FILE_TOGGLE_TITLE
} from './p109EvidenceSelectionCopy';

/** P109-01 — copy must not imply AI, automation-as-selection, export completion, or authority promotion. */
const FORBIDDEN = /\b(ai|inference|smart|automated|automation|cluster|score|rank|graph|relationship\s+detect)/i;

describe('p109EvidenceSelectionCopy guardrails', () => {
	const all = [
		P109_EVIDENCE_SELECTION_BAR_LABEL,
		P109_EVIDENCE_SELECTION_BAR_EMPTY,
		P109_EVIDENCE_SELECTION_BAR_COUNTS(2, 1, 1),
		P109_EVIDENCE_SELECTION_CLEAR,
		P109_EVIDENCE_SELECTION_TIMELINE_TOGGLE_TITLE,
		P109_EVIDENCE_SELECTION_FILE_TOGGLE_TITLE
	];

	it('operator strings avoid inferential / AI framing', () => {
		for (const s of all) {
			expect(s, s).not.toMatch(FORBIDDEN);
		}
	});

	it('counts line labels session-only packaging intent without export-done wording', () => {
		const line = P109_EVIDENCE_SELECTION_BAR_COUNTS(3, 2, 1);
		expect(line).toMatch(/selected/);
		expect(line.toLowerCase()).not.toMatch(/exported|generated|package created|analysis/);
	});
});
