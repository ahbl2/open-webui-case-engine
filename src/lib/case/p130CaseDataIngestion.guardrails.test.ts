/**
 * P130-02 — Static guardrails: ingestion module uses GET-only paths; no Activity; no mutations.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const ingestionPath = join(here, 'caseDataIngestion.ts');

describe('caseDataIngestion.ts (P130-02 guardrails)', () => {
	const src = readFileSync(ingestionPath, 'utf8');

	it('uses only the allowed read modules and functions', () => {
		expect(src).toMatch(/listCaseTimelineEntries/);
		expect(src).toMatch(/listCaseNotebookNotes/);
		expect(src).toMatch(/listCaseFilesPage/);
		expect(src).toMatch(/getCaseFileText/);
		expect(src).toMatch(/getCaseEntitiesList/);
		expect(src).toMatch(/listCaseWorkflowItems/);
	});

	it('does not reference Activity / Audit APIs', () => {
		expect(src).not.toMatch(/activity-events|listCaseActivityEvents|getCaseAudit/i);
	});

	it('does not use POST extract or other mutation file helpers', () => {
		expect(src).not.toMatch(/extractCaseFileText/);
		expect(src).not.toMatch(/uploadCaseFile|deleteCaseFile/);
	});

	it('does not contain HTTP method mutation literals', () => {
		expect(src).not.toMatch(/method:\s*['"]POST['"]/i);
		expect(src).not.toMatch(/method:\s*['"]PUT['"]/i);
		expect(src).not.toMatch(/method:\s*['"]DELETE['"]/i);
	});

	it('does not call Ask or cross-case endpoints', () => {
		expect(src).not.toMatch(/askCase|askCross|\/cases\/ask/);
	});
});
