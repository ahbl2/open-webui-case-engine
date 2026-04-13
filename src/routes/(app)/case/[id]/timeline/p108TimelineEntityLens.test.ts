/**
 * P108-01 — Entity → timeline lens (static source guardrails).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pagePath = join(here, '+page.svelte');
const lensPath = join(here, '../../../../../lib/case/p108EntityTimelineLens.ts');
const copyPath = join(here, '../../../../../lib/case/p108EntityTimelineLensCopy.ts');
const bannerPath = join(here, '../../../../../lib/components/case/CaseEntityLensBanner.svelte');
const viewStatePath = join(here, '../../../../../lib/case/p108EntityLensViewState.ts');

describe('timeline/+page.svelte (P108-01)', () => {
	const src = readFileSync(pagePath, 'utf8');
	const lower = src.toLowerCase();

	it('loads entity detail + full timeline list for entity lens only (read path; no new backend)', () => {
		expect(src).toContain('getCaseEntityDetail');
		expect(src).toContain('listCaseTimelineEntries');
		expect(src).toContain('filterTimelineEntriesToEntityLinkedOnly');
		expect(src).toContain('entityLensEntityId');
		expect(src).toContain('CaseEntityLensBanner');
		expect(src).toContain('surface="timeline"');
		expect(src).toContain('caseId={caseId}');
		expect(src).toContain('onClear={clearEntityLens}');
		expect(src).toContain('case-timeline-entity-lens-empty');
	});

	it('disables server-side timeline filters while entity lens is active', () => {
		expect(src).toContain('disabled={!!entityLensEntityId}');
	});

	it('blocks load-more pagination in entity lens mode', () => {
		expect(src).toMatch(/if \(entityLensEntityId\) return;/);
	});

	it('avoids inference-style wording in P108-added regions (whole-word graph; unrelated timeline copy may contain substrings)', () => {
		expect(lower).not.toContain('related entities');
		expect(lower).not.toMatch(/\bgraph\b/);
		expect(lower).not.toContain('cluster');
	});
});

describe('p108EntityTimelineLens.ts (P108-01)', () => {
	const src = readFileSync(lensPath, 'utf8');

	it('exports stable query param name for URL integration', () => {
		expect(src).toContain("P108_ENTITY_LENS_QUERY_PARAM = 'entityLens'");
	});
});

describe('timeline/+page.svelte (P108-03)', () => {
	const src = readFileSync(pagePath, 'utf8');
	const bannerSrc = readFileSync(bannerPath, 'utf8');
	const viewSrc = readFileSync(viewStatePath, 'utf8');

	it('exposes return-to-entity link in lens banner (plain navigation; preserves history)', () => {
		expect(src).toContain('CaseEntityLensBanner');
		expect(src).toContain('surface="timeline"');
		expect(viewSrc).toContain('case-${surface}-entity-lens-return-to-entity');
		expect(bannerSrc).toContain('data-testid={ids.returnToEntity}');
		expect(bannerSrc).toContain('P108_ENTITY_LENS_RETURN_TO_ENTITY');
		expect(bannerSrc).toContain('/entities/${encodeURIComponent(entityId)}');
	});
});

describe('p108EntityTimelineLensCopy (P108-01)', () => {
	const src = readFileSync(copyPath, 'utf8');
	const lower = src.toLowerCase();

	it('frames supporting-only lens without analysis or relevance claims', () => {
		expect(lower).not.toContain('rank');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('related entities');
	});

	it('P108-05 — banner and empty copy emphasize explicit links and read-only operator filter', () => {
		expect(src).toContain('explicit links only');
		expect(src).toContain('read-only');
	});
});
