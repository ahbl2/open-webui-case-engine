/**
 * P106-05 — Phase 106 entity surfaces: doctrine-aligned copy and static UI guardrails.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const copyPath = join(here, 'p106CaseEntitiesOperatorCopy.ts');
const listPanelPath = join(here, '../components/case/CaseEntitiesPanel.svelte');
const detailPanelPath = join(here, '../components/case/CaseEntityDetailPanel.svelte');
const entitiesPagePath = join(here, '../../routes/(app)/case/[id]/entities/+page.svelte');
const entityDetailPagePath = join(here, '../../routes/(app)/case/[id]/entities/[entityId]/+page.svelte');

/** User-visible export strings only (file text), for forbidden scans. */
function exportedStringLiterals(src: string): string {
	const out: string[] = [];
	const re = /export const [A-Z0-9_]+\s*=\s*'([^']*)';/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(src)) !== null) {
		out.push(m[1]);
	}
	return out.join('\n');
}

describe('P106-05 Phase 106 entity surfaces (static)', () => {
	const bundle = [
		readFileSync(copyPath, 'utf8'),
		readFileSync(listPanelPath, 'utf8'),
		readFileSync(detailPanelPath, 'utf8'),
		readFileSync(entitiesPagePath, 'utf8'),
		readFileSync(entityDetailPagePath, 'utf8')
	].join('\n');
	const lower = bundle.toLowerCase();

	const forbiddenPhrases = [
		'related entities',
		'graph',
		'network',
		'cluster',
		'ranking',
		'importance',
		'intelligence',
		'inference',
		'explore connection',
		'see related',
		'relationship map'
	];

	it('does not use forbidden inference/graph/ranking phrasing in P106 bundle', () => {
		for (const phrase of forbiddenPhrases) {
			expect(lower).not.toContain(phrase);
		}
	});

	it('operator export strings avoid connection/related-entity wording', () => {
		const lit = exportedStringLiterals(readFileSync(copyPath, 'utf8')).toLowerCase();
		expect(lit).not.toContain('related');
		expect(lit).not.toContain('connection');
		expect(lit).not.toContain('graph');
	});

	it('retains Timeline authority and supporting-only framing in exports', () => {
		const lit = readFileSync(copyPath, 'utf8');
		expect(lit).toMatch(/Timeline/i);
		expect(lit).toMatch(/supporting/i);
		expect(lit).toMatch(/explicit/i);
	});

	it('operator copy retains supporting-only framing for entities surfaces (P106-05)', () => {
		const copy = readFileSync(copyPath, 'utf8');
		expect(copy).toContain('P106_CASE_ENTITIES_LIST_HEADING');
		expect(copy).toMatch(/supporting/i);
	});

	it('list and detail panels have no lifecycle or mutation API paths', () => {
		const panels = readFileSync(listPanelPath, 'utf8') + readFileSync(detailPanelPath, 'utf8');
		expect(panels).not.toMatch(/\/case-entities\/(retire|restore)/);
		expect(panels).not.toMatch(/method:\s*['"]POST['"]/i);
		expect(panels).not.toMatch(/method:\s*['"]PATCH['"]/i);
		expect(panels).not.toMatch(/method:\s*['"]DELETE['"]/i);
	});

	it('detail panel keeps open control only in navigable branch (not unavailable)', () => {
		const detail = readFileSync(detailPanelPath, 'utf8');
		expect(detail).toContain('target_status === \'unavailable\'');
		expect(detail).toContain('data-testid="case-entity-detail--evidence-unavailable-note"');
		expect(detail).toContain('case-entity-detail--evidence-open');
		const idxUnavail = detail.indexOf('target_status === \'unavailable\'');
		const idxOpen = detail.indexOf('case-entity-detail--evidence-open');
		expect(idxUnavail).toBeGreaterThan(-1);
		expect(idxOpen).toBeGreaterThan(idxUnavail);
	});

	it('evidence action label stays literal (open linked record)', () => {
		const detail = readFileSync(detailPanelPath, 'utf8');
		expect(detail).toContain('P106_CASE_ENTITY_OPEN_LINKED_RECORD');
		expect(detail.toLowerCase()).not.toContain('explore');
	});
});
