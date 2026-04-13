/**
 * P109-03 / P109-05 — Evidence sets management panel guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseEvidenceSetsPanel.svelte');
const pagePath = join(here, '../../../routes/(app)/case/[id]/evidence-sets/+page.svelte');

describe('CaseEvidenceSetsPanel.svelte (P109-03)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('uses evidenceSetsApi list + create only', () => {
		expect(src).toContain("$lib/apis/caseEngine/evidenceSetsApi");
		expect(src).toContain('getEvidenceSetsList');
		expect(src).toContain('createEvidenceSet');
		expect(src).toContain('P109_EVIDENCE_SET_AUDIT_ATTRIBUTION_LINE');
		expect(src).toContain('formatEvidenceSetSavedAt');
		expect(src).toContain('case-evidence-sets-panel--list-audit-hint');
		expect(src).toContain('case-evidence-sets-panel--row-audit');
		expect(src).not.toMatch(/localStorage.*evidence|indexedDB/i);
	});

	it('wires session selection to explicit create payload', () => {
		expect(src).toContain('evidenceSelectionToCreateItems');
		expect(src).toContain('clearEvidenceSelection');
		expect(src).toContain('ensureEvidenceSelectionCaseScope');
	});

	it('disables create when no selection or no name; guards duplicate submit while saving', () => {
		expect(src).toContain('createDisabled');
		expect(src).toContain('creating');
		expect(src).toContain('data-testid="case-evidence-sets-panel--create-submit"');
	});

	it('exposes list + status test ids for management scope', () => {
		expect(src).toContain('data-testid="case-evidence-sets-panel--loading"');
		expect(src).toContain('data-testid="case-evidence-sets-panel--empty"');
		expect(src).toContain('data-testid="case-evidence-sets-panel--list-error"');
		expect(src).toContain('data-testid="case-evidence-sets-panel--create-success"');
		expect(src).toContain('data-testid="case-evidence-sets-panel--create-error"');
	});

	it('links each list row to read-only detail (P109-04); no programmatic navigation', () => {
		expect(src).toContain('case-evidence-sets-panel--row-link');
		expect(src).toContain('/evidence-sets/${encodeURIComponent(s.id)}');
		expect(src).not.toMatch(/\bgoto\s*\(/);
		expect(src).not.toMatch(/delete|retire|restore|rename|add item|remove item/i);
	});
});

describe('evidence-sets/+page.svelte (P109-03)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('remounts panel on case id via key and passes token', () => {
		expect(src).toContain('{#key caseId}');
		expect(src).toContain('CaseEvidenceSetsPanel');
		expect(src).toContain('caseEngineToken');
	});
});
