/**
 * P116-04 — Timeline UI: authoritative framing, case-scoped delete wiring, non-interpretive copy scans.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
	TIMELINE_EMPTY_STATE_DESCRIPTION,
	TIMELINE_HEADER_RULES_LINE,
	TIMELINE_LOG_ENTRY_BUTTON_TITLE,
	TIMELINE_OFFICIAL_RECORD_BADGE_TITLE,
	TIMELINE_TIME_ZONE_TOOLTIP
} from '../../routes/(app)/case/[id]/timeline/timelineOperatorMicrocopy';

const here = dirname(fileURLToPath(import.meta.url));
const caseEngineIndexPath = join(here, '../apis/caseEngine/index.ts');
const timelinePagePath = join(here, '../../routes/(app)/case/[id]/timeline/+page.svelte');

/** Interpretive / speculative wording guard on operator-facing strings. */
const INTERPRETIVE_PHRASE_RE =
	/\b(summary|synthesized|synthesised|insight|insights|likely)\b|meaningful pattern|connected narrative|interpreted event|\bspeculative\b/i;

describe('P116-04 — timeline operator microcopy (non-interpretive)', () => {
	const strings = [
		TIMELINE_OFFICIAL_RECORD_BADGE_TITLE,
		TIMELINE_HEADER_RULES_LINE,
		TIMELINE_LOG_ENTRY_BUTTON_TITLE,
		TIMELINE_EMPTY_STATE_DESCRIPTION,
		TIMELINE_TIME_ZONE_TOOLTIP
	];

	it('exported timeline header strings avoid interpretive / speculative phrasing', () => {
		for (const s of strings) {
			expect(s, s).not.toMatch(INTERPRETIVE_PHRASE_RE);
		}
	});
});

describe('P116-04 — case-scoped soft delete wiring', () => {
	it('caseEngine softDeleteTimelineEntry targets DELETE /cases/:caseId/entries/:entryId', () => {
		const src = readFileSync(caseEngineIndexPath, 'utf8');
		const i = src.indexOf('export async function softDeleteTimelineEntry');
		expect(i).toBeGreaterThan(-1);
		const slice = src.slice(i, i + 800);
		expect(slice).toContain('/cases/${caseId}/entries/${entryId}');
		expect(slice).toContain('method:');
		expect(slice).toContain("'DELETE'");
		expect(slice).not.toMatch(/\$\{CASE_ENGINE_BASE_URL\}\/entries\/\$\{entryId\}/);
	});

	it('timeline +page calls softDeleteTimelineEntry with caseId and entryId', () => {
		const src = readFileSync(timelinePagePath, 'utf8');
		expect(src).toContain('await softDeleteTimelineEntry(caseId, entryId, $caseEngineToken)');
	});
});

describe('P116-04 — timeline page source scan (framing + delete error path)', () => {
	it('timeline page retains official-record framing comment and backend-grounded delete error banner', () => {
		const src = readFileSync(timelinePagePath, 'utf8');
		expect(src).toMatch(/Official Case Timeline|official case records/i);
		expect(src).toContain('data-testid="timeline-delete-error"');
		expect(src).toContain('deleteLifecycleError');
	});
});
