/**
 * P78-16 — Cross-surface entry label consistency (overview / AI workspace / intelligence / Proposals).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const intelSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');
const entityDetailSource = readFileSync(
	join(__dirname, '../../../../../lib/components/case/EntityDetailWorkspace.svelte'),
	'utf8'
);
const workflowSource = readFileSync(
	join(__dirname, '../../../../../lib/components/case/CaseWorkflowTab.svelte'),
	'utf8'
);

describe('P78-16 destination label wiring in scoped surfaces', () => {
	it('uses CASE_DESTINATION_* for Intelligence cross-case links and Proposals tab anchors', () => {
		expect(intelSource).toContain('CASE_DESTINATION_LABELS.overview');
		expect(intelSource).toContain('CASE_DESTINATION_LABELS.aiWorkspace');
		expect(intelSource).toContain('CASE_DESTINATION_HINTS.crossCaseMatches');
		expect(intelSource).toContain('CASE_DESTINATION_TITLES.caseProposals');
	});

	it('EntityDetailWorkspace uses canonical drill-down and Proposals pill labels', () => {
		expect(entityDetailSource).toContain('CASE_DESTINATION_LABELS.entityIntelligenceFocusDrillDown');
		expect(entityDetailSource).toContain('CASE_DESTINATION_TITLES.caseProposalsOpenPill');
	});

	it('CaseWorkflowTab deep link to summary uses Overview label (not Summary)', () => {
		expect(workflowSource).toContain('CASE_DESTINATION_LABELS.overview');
		expect(workflowSource).toContain('title={CASE_DESTINATION_TITLES.overview}');
		expect(workflowSource).toContain('Files, Notes, Overview, Timeline');
	});
});
