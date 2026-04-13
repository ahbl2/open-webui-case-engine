/**
 * P109 — evidence selection must stay per-row manual only (no bulk/select-all affordances on these surfaces).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** `src/lib/case` → project `src/` */
const srcRoot = join(__dirname, '..', '..');

function readSrc(rel: string): string {
	return readFileSync(join(srcRoot, rel), 'utf8');
}

describe('P109 evidence selection UI isolation', () => {
	const timelineCard = readSrc('lib/components/case/TimelineEntryCard.svelte');
	const caseFilesTab = readSrc('lib/components/case/CaseFilesTab.svelte');
	const timelinePage = readSrc('routes/(app)/case/[id]/timeline/+page.svelte');

	const forbidden = /\b(select\s+all|selectAll|select-all|bulk\s*select|bulkSelect|shiftKey.*select)/i;

	it('P109 timeline + files surfaces do not add bulk row selection patterns', () => {
		for (const [name, text] of [
			['TimelineEntryCard.svelte', timelineCard],
			['CaseFilesTab.svelte', caseFilesTab],
			['timeline/+page.svelte', timelinePage]
		]) {
			expect(text, name).not.toMatch(forbidden);
		}
	});

	it('evidence checkboxes are per-row only (no table header select pattern)', () => {
		expect(caseFilesTab).toMatch(/case-file-manual-evidence-select/);
		expect(timelineCard).toMatch(/timeline-entry-manual-evidence-select/);
	});
});
