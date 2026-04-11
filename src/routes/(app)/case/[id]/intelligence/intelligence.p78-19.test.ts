/**
 * P78-19 — “Cases matching this query” result-row action consistency (identity → actions; Overview before AI workspace).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');

describe('Intelligence page (P78-19 cases-match row actions)', () => {
	it('stacks case identity before the action group on each matched-case row', () => {
		const rowStart = pageSource.indexOf('data-testid="intelligence-cases-match-row"');
		expect(rowStart).toBeGreaterThan(-1);
		const rowSlice = pageSource.slice(rowStart, rowStart + 2200);
		expect(rowSlice.indexOf('data-testid="intelligence-cases-match-identity"')).toBeLessThan(
			rowSlice.indexOf('data-testid="intelligence-cases-match-actions"')
		);
	});

	it('places Overview before AI workspace in the actions group', () => {
		const actionsStart = pageSource.indexOf('data-testid="intelligence-cases-match-actions"');
		expect(actionsStart).toBeGreaterThan(-1);
		const actionsSlice = pageSource.slice(actionsStart, actionsStart + 1200);
		expect(actionsSlice.indexOf('intelligence-cases-match-open-case')).toBeLessThan(
			actionsSlice.indexOf('intelligence-cases-match-open-chat')
		);
	});

	it('keeps canonical labels and route targets for both actions', () => {
		expect(pageSource).toContain('{CASE_DESTINATION_LABELS.overview}');
		expect(pageSource).toContain('{CASE_DESTINATION_LABELS.aiWorkspace}');
		expect(pageSource).toContain('href={`/case/${rc.caseId}/summary`}');
		expect(pageSource).toContain('href={`/case/${rc.caseId}/chat`}');
	});

	it('uses panel hint that names Overview and AI workspace distinctly', () => {
		expect(pageSource).toContain('data-testid="intelligence-cases-match-action-hint"');
		expect(pageSource).toContain('CASE_DESTINATION_HINTS.crossCaseMatches');
	});
});
