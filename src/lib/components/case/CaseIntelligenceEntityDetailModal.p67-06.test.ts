/**
 * P67-06 — entity detail modal wires read APIs and UX contract (source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'CaseIntelligenceEntityDetailModal.svelte'), 'utf8');

describe('CaseIntelligenceEntityDetailModal (P67-06)', () => {
	it('uses native dialog and committed entity detail + adjacency APIs', () => {
		expect(source).toContain('<dialog');
		expect(source).toContain('getCaseIntelligenceCommittedEntity');
		expect(source).toContain('listCaseIntelligenceAssociationsForEntity');
		expect(source).toContain('listCaseIntelligenceAssociationStaging');
	});

	it('surfaces entity-native Add association staging + Stage 2 handoff (P67-07)', () => {
		expect(source).toContain('createCaseIntelligenceAssociationStaging');
		expect(source).toContain('data-testid="case-intel-entity-detail-add-assoc-submit"');
		expect(source).toContain('data-testid="case-intel-entity-detail-add-assoc-toggle"');
		expect(source).toContain('case-intel-stage2-pilot-anchor');
	});

	it('dispatches close for parent sync', () => {
		expect(source).toContain("dispatch('close')");
	});
});
