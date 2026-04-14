/**
 * P126-03 — Entity list + detail: neutral list; explicit linked references copy; no inference vocabulary.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p126EntityListDetailCopy.ts');
const listPanelPath = join(__dirname, '../components/case/CaseEntitiesPanel.svelte');
const detailPanelPath = join(__dirname, '../components/case/CaseEntityDetailPanel.svelte');
const entityDetailPagePath = join(__dirname, '../../routes/(app)/case/[id]/entities/[entityId]/+page.svelte');

describe('p126EntityListDetailCopy (P126-03)', () => {
	it('exports static strings only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P126_LINKED_REFERENCES_HEADING/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});

	it('avoids inference / relationship-discovery vocabulary', () => {
		const lower = readFileSync(copyPath, 'utf8').toLowerCase();
		expect(lower).not.toMatch(/\brelated\b/);
		expect(lower).not.toMatch(/\bconnected\b/);
		expect(lower).not.toMatch(/\blikely\b/);
		expect(lower).not.toMatch(/\bpossible\b/);
	});
});

describe('CaseEntitiesPanel list (P126-03)', () => {
	const src = readFileSync(listPanelPath, 'utf8');

	it('uses flat list path only (no grouping UI)', () => {
		expect(src).not.toContain('groupByEntityType');
		expect(src).not.toContain('case-entities-panel--grouped');
		expect(src).toContain('P126_ENTITY_LIST_ROW_TYPE_LABEL');
		expect(src).toContain('P126_ENTITY_LIST_EMPTY_COPY');
	});

	it('does not introduce client sort of entity rows', () => {
		expect(src).not.toContain('.sort(');
	});
});

describe('CaseEntityDetailPanel (P126-03)', () => {
	const src = readFileSync(detailPanelPath, 'utf8');

	it('partitions linked references by API link_type and shows notes-unavailable line', () => {
		expect(src).toContain('timelineRefLinks');
		expect(src).toContain('fileRefLinks');
		expect(src).toContain('case-entity-detail--linked-references');
		expect(src).toContain('case-entity-detail--references-notes-empty');
	});

	it('does not introduce evidence_links.sort or graph language', () => {
		expect(src).not.toContain('evidence_links.sort');
		expect(src.toLowerCase()).not.toContain('graph');
	});
});

describe('entities/[entityId]/+page.svelte (P126-03)', () => {
	it('uses getRouteCaseIdString for case scope', () => {
		const src = readFileSync(entityDetailPagePath, 'utf8');
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});
