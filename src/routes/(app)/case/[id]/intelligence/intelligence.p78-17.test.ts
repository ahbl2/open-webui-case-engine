/**
 * P78-17 — Intelligence mode-entry acceleration (`?mode=` on cross-surface entry).
 * P82-01-FU1 — Primary shell rail no longer lists Intelligence; hub href contract remains in caseDestinationLabels.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const labelsSource = readFileSync(
	join(__dirname, '../../../../../lib/utils/caseDestinationLabels.ts'),
	'utf8'
);
const intelligenceUtilSource = readFileSync(
	join(__dirname, '../../../../../lib/utils/intelligence.ts'),
	'utf8'
);

describe('P78-17 Intelligence entry targets', () => {
	it('caseDestinationLabels defines entities-mode hub href (registry-first)', () => {
		expect(labelsSource).toContain('caseIntelligenceHubHref');
		expect(labelsSource).toContain('entities');
	});

	it('chat cross-case handoff points to Intelligence sub-mode for Ask/search work', () => {
		expect(intelligenceUtilSource).toContain("caseIntelligenceHubHref(caseId, 'intelligence')");
		expect(intelligenceUtilSource).toContain('INTELLIGENCE_ENTRY_COPY.chatHandoffNoCaseId');
	});
});
