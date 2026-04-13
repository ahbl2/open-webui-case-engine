/**
 * P115-04 — Case query relationship-linked toggle + provenance (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseQueryPanel.svelte');
const provenancePath = join(here, '../../case/p115CaseQueryRelationshipProvenance.ts');

describe('CaseQueryPanel.svelte (P115-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('includes relationship-linked toggle default wiring and test id', () => {
		expect(src).toContain('includeRelationshipLinkedRecords');
		expect(src).toContain('data-testid="case-query-include-relationship-linked"');
		expect(src).toContain('include_relationship_linked_records: true');
	});

	it('surfaces inclusion provenance when relationship_retrieval is present', () => {
		expect(src).toContain('p115CaseQueryRelationshipProvenance');
		expect(src).toContain('case-query-fact-inclusion-provenance');
		expect(src).toContain('referentialFactInclusionLabel');
	});

	it('does not use interpretive relationship copy (static scan)', () => {
		const banned = /\b(connected|meaningful|likely related|insight|pattern)\b/i;
		expect(src).not.toMatch(banned);
	});
});

describe('p115CaseQueryRelationshipProvenance.ts', () => {
	const src = readFileSync(provenancePath, 'utf8');

	it('uses factual labels only', () => {
		expect(src).toContain('Direct match');
		expect(src).toContain('Included by explicit relationship');
	});
});
