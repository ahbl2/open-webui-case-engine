/**
 * P108-04 — Cross-surface consistency for `entityLens` read-only filter state (timeline + files).
 * P108-05 — Doctrine-safe loaded-count helpers wired from shared copy module.
 * Does not assert P108-01 / P108-02 filter helpers (see p108EntityTimelineLens.test.ts).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const timelinePagePath = join(here, '../../routes/(app)/case/[id]/timeline/+page.svelte');
const filesTabPath = join(here, '../components/case/CaseFilesTab.svelte');
const bannerPath = join(here, '../components/case/CaseEntityLensBanner.svelte');
const lensPath = join(here, 'p108EntityTimelineLens.ts');
const lensCopyPath = join(here, 'p108EntityTimelineLensCopy.ts');
const viewStatePath = join(here, 'p108EntityLensViewState.ts');

describe('P108-04 entity lens integration (timeline + files)', () => {
	const timelineSrc = readFileSync(timelinePagePath, 'utf8');
	const filesSrc = readFileSync(filesTabPath, 'utf8');
	const bannerSrc = readFileSync(bannerPath, 'utf8');
	const lensSrc = readFileSync(lensPath, 'utf8');

	it('both baseline views use the shared banner with distinct surfaces and explicit clear handlers', () => {
		for (const src of [timelineSrc, filesSrc]) {
			expect(src).toContain('import CaseEntityLensBanner');
			expect(src).toContain('CaseEntityLensBanner');
			expect(src).toContain('caseId={caseId}');
			expect(src).toContain('entityId={entityLensEntityId}');
			expect(src).toContain('entityLabel={entityLensLabel || entityLensEntityId}');
		}
		expect(timelineSrc).toContain('surface="timeline"');
		expect(timelineSrc).toContain('onClear={clearEntityLens}');
		expect(filesSrc).toContain('surface="files"');
		expect(filesSrc).toContain('onClear={clearEntityFilesLens}');
	});

	it('banner centralizes return-to-entity + copy used by both surfaces', () => {
		expect(bannerSrc).toContain('P108_ENTITY_TIMELINE_LENS_BANNER');
		expect(bannerSrc).toContain('P108_ENTITY_LENS_RETURN_TO_ENTITY');
		expect(bannerSrc).toContain('P108_ENTITY_TIMELINE_LENS_CLEAR');
		expect(bannerSrc).toContain('p108EntityLensBannerTestIds');
		expect(bannerSrc).toContain('/entities/${encodeURIComponent(entityId)}');
	});

	it('same query param and parse helper as P108-01 / P108-02 (no drift)', () => {
		for (const src of [timelineSrc, filesSrc]) {
			expect(src).toContain('parseEntityLensEntityIdFromSearchParams');
		}
		expect(lensSrc).toContain("P108_ENTITY_LENS_QUERY_PARAM = 'entityLens'");
	});

	it('disables conflicting baseline controls while entity lens is active (both views)', () => {
		expect(timelineSrc).toContain('disabled={!!entityLensEntityId}');
		expect(filesSrc).toContain('disabled={!!entityLensEntityId}');
	});

	it('blocks load-more pagination in entity lens mode (both views)', () => {
		expect(timelineSrc).toMatch(/if \(entityLensEntityId\) return;/);
		expect(filesSrc).toMatch(/if \(entityLensEntityId\) return;/);
	});

	it('empty-state test ids remain on each surface (not only in shared banner)', () => {
		expect(timelineSrc).toContain('case-timeline-entity-lens-empty');
		expect(filesSrc).toContain('case-files-entity-lens-empty');
	});

	it('P108-05 — doctrine-safe loaded-count helpers live in shared copy; files lens empty title wired', () => {
		const copySrc = readFileSync(lensCopyPath, 'utf8');
		expect(copySrc).toContain('p108EntityLensTimelineLoadedCountLabel');
		expect(copySrc).toContain('p108EntityLensFilesLoadedCountLabel');
		expect(filesSrc).toContain('P108_ENTITY_FILES_LENS_EMPTY_TITLE');
	});

	it('does not introduce AI or graph semantics in shared lens UI sources (banner + view-state only)', () => {
		const viewStateSrc = readFileSync(viewStatePath, 'utf8');
		const narrow = `${bannerSrc}\n${viewStateSrc}`.toLowerCase();
		expect(narrow).not.toContain('related entities');
		expect(narrow).not.toMatch(/\bgraph\b/);
		expect(narrow).not.toContain('cluster');
		expect(narrow).not.toContain('inference');
	});
});
