/**
 * P106-03 — Entity detail + evidence guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseEntityDetailPanel.svelte');
const pagePath = join(here, '../../../routes/(app)/case/[id]/entities/[entityId]/+page.svelte');
const copyPath = join(here, '../../case/p106CaseEntitiesOperatorCopy.ts');

describe('CaseEntityDetailPanel.svelte (P106-03)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('loads via getCaseEntityDetail only (no inline POST/fetch in panel)', () => {
		expect(src).toContain('getCaseEntityDetail');
		expect(src).not.toContain('fetch(');
	});

	it('does not client-side sort evidence links', () => {
		expect(src).not.toContain('evidence_links.sort');
		expect(src).not.toMatch(/\.sort\(/);
	});

	it('exposes test ids for loading, error, evidence, back link', () => {
		expect(src).toContain('data-testid="case-entity-detail-panel"');
		expect(src).toContain('data-testid="case-entity-detail--loading"');
		expect(src).toContain('data-testid="case-entity-detail--error"');
		expect(src).toContain('data-testid="case-entity-detail--evidence"');
		expect(src).toContain('data-testid="case-entity-detail-back"');
		expect(src).toContain('data-testid="case-entity-detail--evidence-list"');
		expect(src).toContain('data-testid="case-entity-detail--evidence-empty"');
	});

	it('uses literal attributes helper (no raw JSON.stringify of attributes)', () => {
		expect(src).toContain('p106LiteralAttributeRows');
		expect(src).not.toContain('JSON.stringify');
	});
});

describe('CaseEntityDetailPanel.svelte (P106-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('reuses Phase 103 navigation (payload + goto state)', () => {
		expect(src).toContain('navigateToCitationNavigationPayload');
		expect(src).toContain('citationNavigationPayloadFromEntityEvidenceLink');
		expect(src).toContain('$lib/case/p103CitationNavigationIntent');
		expect(src).toContain('$lib/case/p106EntityEvidenceCitationNavigation');
	});

	it('exposes evidence open control for navigable explicit links', () => {
		expect(src).toContain('data-testid="case-entity-detail--evidence-open"');
		expect(src).toContain('P106_CASE_ENTITY_OPEN_LINKED_RECORD');
	});

	it('does not introduce related/graph/connection-exploration language in panel source', () => {
		const lower = src.toLowerCase();
		expect(lower).not.toContain('related entities');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('explore connections');
	});
});

describe('entities/[entityId]/+page.svelte (P106-03)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('mounts CaseEntityDetailPanel with case id, entity id, token', () => {
		expect(src).toContain('CaseEntityDetailPanel');
		expect(src).toContain('entityId');
		expect(src).toContain('$page.params.entityId');
		expect(src).toContain('#key');
	});
});

describe('P106-03 / P106-04 operator copy', () => {
	const src = readFileSync(copyPath, 'utf8');
	const lower = src.toLowerCase();

	it('avoids related/graph/inference framing in user-visible strings', () => {
		expect(lower).not.toContain('related entities');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('intelligence');
	});

	it('uses literal open-linked-record export for P106-04', () => {
		expect(src).toMatch(/P106_CASE_ENTITY_OPEN_LINKED_RECORD = 'Open linked record'/);
	});

	it('P106-05: unavailable evidence has non-actionable note copy', () => {
		expect(src).toMatch(/P106_CASE_ENTITY_EVIDENCE_UNAVAILABLE_NOTE = 'Not openable from here.'/);
	});
});
