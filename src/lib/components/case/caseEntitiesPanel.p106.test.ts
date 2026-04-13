/**
 * P106-02 — Entities list panel guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseEntitiesPanel.svelte');
const pagePath = join(here, '../../../routes/(app)/case/[id]/entities/+page.svelte');
const copyPath = join(here, '../../case/p106CaseEntitiesOperatorCopy.ts');

describe('CaseEntitiesPanel.svelte (P106-02)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('loads list via getCaseEntitiesList only (read contract)', () => {
		expect(src).toContain("$lib/apis/caseEngine/caseEntitiesApi");
		expect(src).toContain('getCaseEntitiesList');
		expect(src).not.toContain('/case-entities/retire');
		expect(src).not.toContain('/case-entities/restore');
		expect(src).not.toMatch(/method:\s*['"]POST['"]/i);
	});

	it('does not client-side sort or rank entities', () => {
		expect(src).not.toContain('.sort(');
		expect(src).not.toMatch(/\brank\b|\bscore\b|\bimportance\b/i);
	});

	it('exposes test ids for loading, empty, error, list, row', () => {
		expect(src).toContain('data-testid="case-entities-panel"');
		expect(src).toContain('data-testid="case-entities-panel--loading"');
		expect(src).toContain('data-testid="case-entities-panel--error"');
		expect(src).toContain('data-testid="case-entities-panel--empty"');
		expect(src).toContain('data-testid="case-entities-panel--list"');
		expect(src).toContain('data-testid="case-entities-row-link"');
		expect(src).toContain('/entities/');
	});

	it('shows display_label and entity_type only (no raw attributes JSON)', () => {
		expect(src).toContain('ent.display_label');
		expect(src).toContain('ent.entity_type');
		expect(src).not.toContain('JSON.stringify');
		expect(src).not.toContain('ent.attributes');
	});

	it('uses P106 operator copy module', () => {
		expect(src).toContain('$lib/case/p106CaseEntitiesOperatorCopy');
	});

	it('P106-05: list heading comes from copy (supporting, not generic Entities)', () => {
		expect(src).toContain('P106_CASE_ENTITIES_LIST_HEADING');
		expect(src).not.toMatch(/<h1[^>]*>\s*Entities\s*<\/h1>/);
	});
});

describe('entities/+page.svelte (P106-02)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('mounts CaseEntitiesPanel with case id and token', () => {
		expect(src).toContain('CaseEntitiesPanel');
		expect(src).toContain('caseEngineToken');
		expect(src).toContain('$page.params.id');
		expect(src).toContain('#key caseId');
	});
});

describe('p106CaseEntitiesOperatorCopy', () => {
	const src = readFileSync(copyPath, 'utf8');

	it('avoids inference, graph, related-entity, and intelligence framing', () => {
		expect(src.toLowerCase()).not.toContain('related entities');
		expect(src.toLowerCase()).not.toContain('graph');
		expect(src.toLowerCase()).not.toContain('intelligence');
		expect(src.toLowerCase()).not.toContain('inference');
	});
});
