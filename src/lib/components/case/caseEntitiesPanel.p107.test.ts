/**
 * P107-04 — Entities list organization (static source + module contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseEntitiesPanel.svelte');
const orgPath = join(here, '../../case/p107CaseEntityOrganization.ts');
const copyPath = join(here, '../../case/p107CaseEntityOrganizationCopy.ts');

describe('CaseEntitiesPanel.svelte (P107-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('uses getCaseEntitiesList with includeRetired and client-side filter helpers (no grouping)', () => {
		expect(src).toContain('getCaseEntitiesList');
		expect(src).toContain('includeRetired');
		expect(src).toContain('p107CaseEntityOrganization');
		expect(src).toContain('filterEntitiesForOrganization');
		expect(src).not.toContain('groupByEntityTypePreservingOrder');
		expect(src).not.toContain('fetch(');
	});

	it('does not sort entity rows in the panel (sorting stays in organization helper module)', () => {
		expect(src).not.toContain('.sort(');
	});

	it('exposes organization and filtered-empty test ids', () => {
		expect(src).toContain('data-testid="case-entities-panel--organization"');
		expect(src).toContain('data-testid="case-entities-panel--include-retired"');
		expect(src).toContain('data-testid="case-entities-panel--filter-entity-type"');
		expect(src).toContain('data-testid="case-entities-panel--filter-label"');
		expect(src).toContain('data-testid="case-entities-panel--org-reset"');
		expect(src).toContain('data-testid="case-entities-panel--empty-filtered"');
		expect(src).not.toContain('case-entities-panel--grouped');
	});

	it('preserves row links to entity detail', () => {
		expect(src).toContain('/entities/');
		expect(src).toContain('case-entities-row-link');
	});
});

describe('p107CaseEntityOrganization.ts (P107-04)', () => {
	const src = readFileSync(orgPath, 'utf8');

	it('uses lexical sort only for type keys / distinct types, not entity ranking', () => {
		expect(src).toContain('localeCompare');
		expect(src).not.toMatch(/\brank\b|\bscore\b/i);
	});
});

describe('p107CaseEntityOrganizationCopy (P107-04)', () => {
	const src = readFileSync(copyPath, 'utf8');
	const lower = src.toLowerCase();

	it('avoids relevance ranking and graph framing', () => {
		expect(lower).not.toContain('rank');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('related entities');
	});
});

describe('CaseEntitiesPanel.svelte (P107-05)', () => {
	const src = readFileSync(panelPath, 'utf8');
	const lower = src.toLowerCase();

	it('surfaces literal updated_at from list rows with audit helper (read-only)', () => {
		expect(src).toContain('auditFieldDisplay');
		expect(src).toContain('P107_AUDIT_LIST_LAST_UPDATED_LABEL');
		expect(src).toContain('data-testid="case-entities-row--audit"');
		expect(src).toContain('data-testid="case-entities-row--audit-updated-at"');
		expect(src).toContain('ent.updated_at');
		expect(src).not.toContain('fetch(');
	});

	it('does not add graph, relationship, or cross-case framing in panel source', () => {
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('related entities');
		expect(lower).not.toContain('relationship');
	});
});
