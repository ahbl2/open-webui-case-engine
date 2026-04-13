/**
 * P110-02 — Preview copy avoids P109-style disallowed framing (aligned with p109EvidenceSetsPhase109Guardrails).
 */
import { describe, expect, it } from 'vitest';
import * as copy from './p110EvidenceSetOutputPreviewCopy';

const copyStrings = Object.values(copy).filter((v) => typeof v === 'string') as string[];

function assertNoForbiddenWording(label: string, text: string): void {
	const forbidden =
		/\b(ai|artificial intelligence|machine learning|llm|gpt|inference engine|automated analysis|curated evidence|linked evidence|smart grouping|investigative conclusion|export ready|report generated|download package|pdf generated)\b/i;
	expect(text, label).not.toMatch(forbidden);
	const drift =
		/\b(approve[ds]?|approved workflow|validation workflow|peer review|evidence package|evidence report|forensic analysis)\b/i;
	expect(text, label).not.toMatch(drift);
}

describe('p110EvidenceSetOutputPreviewCopy guardrails', () => {
	it('string exports avoid disallowed framing', () => {
		for (const s of copyStrings) {
			assertNoForbiddenWording(`copy: ${s.slice(0, 48)}…`, s);
		}
	});

	it('meta line helpers keep traceability wording explicit', () => {
		const t = copy.P110_OUTPUT_PREVIEW_TIMELINE_META_LINE('Jan 1', 'OBS', 'e1', 'u1', 'Jan 3');
		expect(t).toMatch(/Entry id:/i);
		expect(t).toMatch(/Created by \(user id\):/i);
		expect(t).toMatch(/Record created:/i);
		const f = copy.P110_OUTPUT_PREVIEW_FILE_META_LINE('a.pdf', 'f1', 'application/pdf', 'Jan 2', 'Jan 1');
		expect(f).toMatch(/File id:/i);
		expect(f).toMatch(/Record created:/i);
	});
});
