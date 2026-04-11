/**
 * P82-05 — Overview linked panels: files / entities / notes summaries from existing list APIs.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentPath = join(__dirname, 'CaseOverviewLinkedPanels.svelte');
const summaryPagePath = join(__dirname, '../../../routes/(app)/case/[id]/summary/+page.svelte');
const componentSource = readFileSync(componentPath, 'utf8');
const summaryPageSource = readFileSync(summaryPagePath, 'utf8');

describe('CaseOverviewLinkedPanels (P82-05)', () => {
	it('is mounted on Overview after Recent activity', () => {
		expect(summaryPageSource).toContain('CaseOverviewLinkedPanels');
		expect(summaryPageSource.indexOf('CaseOverviewRecentActivity')).toBeLessThan(
			summaryPageSource.indexOf('CaseOverviewLinkedPanels')
		);
	});

	it('uses existing list endpoints only (no new aggregation APIs)', () => {
		expect(componentSource).toContain('listCaseFilesPage');
		expect(componentSource).toContain('listCaseIntelligenceCommittedEntities');
		expect(componentSource).toContain('listCaseNotebookNotes');
		expect(componentSource).toContain('Promise.allSettled');
	});

	it('bounds preview rows and exposes test ids + case routes', () => {
		expect(componentSource).toContain('const PREVIEW_LIMIT = 3');
		expect(componentSource).toContain('data-testid="case-overview-linked-panels"');
		expect(componentSource).toContain('href="/case/{caseId}/files"');
		expect(componentSource).toContain('href="/case/{caseId}/entities"');
		expect(componentSource).toContain('href="/case/{caseId}/notes"');
		expect(componentSource).toContain('id="summary-module-linked-panels"');
	});

	it('in-page nav links to the linked panels section', () => {
		expect(summaryPageSource).toContain('href="#summary-module-linked-panels"');
		expect(summaryPageSource).toContain('Linked panels');
	});

	it('labels notebook scope honestly', () => {
		expect(componentSource).toContain('Your notes');
		expect(componentSource).toContain('owner-scoped');
	});
});
