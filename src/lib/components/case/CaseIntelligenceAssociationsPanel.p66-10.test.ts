/**
 * P66-10 — Associations pilot panel: wiring labels and test ids (static source checks).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const source = readFileSync(join(__dirname, 'CaseIntelligenceAssociationsPanel.svelte'), 'utf8');

describe('CaseIntelligenceAssociationsPanel (P66-10)', () => {
	it('declares Stage 2 pilot scope and authority semantics', () => {
		expect(source).toContain('Stage 2 associations (pilot)');
		expect(source).toContain('non-authoritative');
		expect(source).toContain('Authoritative associations');
		expect(source).toContain('P19');
		expect(source).toContain('assertionLaneLabel');
		expect(source).toContain('commitCaseIntelligenceAssociationStaging');
		expect(source).toContain('listCaseIntelligenceAssociationsForEntity');
	});

	it('exposes test ids for lists, adjacency, and mutations', () => {
		expect(source).toContain('data-testid="case-intel-stage2-assoc-panel"');
		expect(source).toContain('case-intel-stage2-assoc-committed-list');
		expect(source).toContain('case-intel-stage2-assoc-adjacency-list');
		expect(source).toContain('case-intel-stage2-assoc-staging-list');
		expect(source).toContain('case-intel-assoc-staging-commit-');
		expect(source).toContain('case-intel-stage2-assoc-refresh');
	});
});
