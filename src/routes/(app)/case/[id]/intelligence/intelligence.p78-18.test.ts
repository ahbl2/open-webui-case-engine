/**
 * P78-18 — Intelligence entry-copy alignment with mode-target behavior (P78-17).
 * P82-01-FU1 — Shell rail does not carry Entity intelligence tab; titles remain in caseDestinationLabels.
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

describe('P78-18 entry copy vs landing mode', () => {
	it('caseDestinationLabels defines Entity intelligence shell tab title for hub surfaces', () => {
		expect(labelsSource).toContain('CASE_DESTINATION_TITLES');
		expect(labelsSource).toContain('entityIntelligenceShellTabEntry');
	});

	it('caseDestinationLabels defines handoff copy for Intelligence mode and back-link for Intelligence mode', () => {
		expect(labelsSource).toContain('INTELLIGENCE_ENTRY_COPY');
		expect(labelsSource).toContain('chatHandoffLead');
		expect(labelsSource).toContain('backToEntityIntelligence');
	});

	it('intelligence handoff uses INTELLIGENCE_ENTRY_COPY (no generic Intelligence tab wording)', () => {
		expect(intelligenceUtilSource).toContain('INTELLIGENCE_ENTRY_COPY.chatHandoffLead');
		expect(intelligenceUtilSource).toContain('INTELLIGENCE_ENTRY_COPY.chatHandoffNoCaseId');
	});
});
