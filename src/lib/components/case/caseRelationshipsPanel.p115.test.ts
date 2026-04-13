/**
 * P115-04 — Case relationships panel (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseRelationshipsPanel.svelte');

describe('CaseRelationshipsPanel.svelte (P115-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('wires create to Case Engine client only', () => {
		expect(src).toContain('caseRelationshipsApi');
		expect(src).toContain('createCaseRelationship');
		expect(src).toContain('listCaseRelationships');
	});

	it('exposes only backend record kinds and allowed relationship types', () => {
		expect(src).toContain('CASE_RELATIONSHIP_TYPES');
		expect(src).toContain('timeline_entry');
		expect(src).toContain('case_entity');
	});

	it('requires explicit submit and shows empty state copy', () => {
		expect(src).toContain('data-testid="case-relationships-submit"');
		expect(src).toContain('No relationships recorded');
	});

	it('does not add graph or AI affordances', () => {
		expect(src).not.toMatch(/\b(graph|cluster|hop|suggest|inference|connected)\b/i);
	});
});
