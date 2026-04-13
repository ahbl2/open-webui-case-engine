/**
 * P115-05 — Open WebUI relationship surfaces: operational copy and toggle guardrails (static).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, '../components/case/CaseRelationshipsPanel.svelte');
const queryPath = join(here, '../components/case/CaseQueryPanel.svelte');
const provPath = join(here, 'p115CaseQueryRelationshipProvenance.ts');

const bannedInterpretive = /\b(connected evidence|meaningful link|likely related|relationship insight|suggests|proves|pattern)\b/i;

describe('P115-05 UI integrity (static)', () => {
	it('CaseRelationshipsPanel avoids interpretive phrasing', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(bannedInterpretive);
		expect(src).toContain('data-testid="case-relationships-submit"');
		expect(src).toContain('createCaseRelationship');
	});

	it('CaseQueryPanel keeps relationship-linked toggle default off and uses provenance helper', () => {
		const src = readFileSync(queryPath, 'utf8');
		expect(src).not.toMatch(bannedInterpretive);
		expect(src).toMatch(/includeRelationshipLinkedRecords\s*=\s*false/);
		expect(src).toContain('p115CaseQueryRelationshipProvenance');
		expect(src).toContain('referentialFactInclusionLabel');
		expect(src).toContain('data-testid="case-query-include-relationship-linked"');
	});

	it('provenance labels stay factual', () => {
		const src = readFileSync(provPath, 'utf8');
		expect(src).toContain('Direct match');
		expect(src).toContain('Included by explicit relationship');
		expect(src).not.toMatch(/\b(connected|insight|likely)\b/i);
	});
});
