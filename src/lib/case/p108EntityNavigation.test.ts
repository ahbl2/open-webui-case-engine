/**
 * P108-03 — Entity-scoped navigation (static source): lens banners + entity detail entry points.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const timelinePath = join(here, '../../routes/(app)/case/[id]/timeline/+page.svelte');
const filesTabPath = join(here, '../components/case/CaseFilesTab.svelte');
const detailPath = join(here, '../components/case/CaseEntityDetailPanel.svelte');
const copyPath = join(here, 'p108EntityTimelineLensCopy.ts');
const bannerPath = join(here, '../components/case/CaseEntityLensBanner.svelte');
const viewStatePath = join(here, 'p108EntityLensViewState.ts');

describe('P108-03 navigation affordances', () => {
	it('copy exports Return to entity for lens banners', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toContain("P108_ENTITY_LENS_RETURN_TO_ENTITY = 'Return to entity'");
	});

	it('timeline lens banner links to entity detail (href; no replaceState on return)', () => {
		const pageSrc = readFileSync(timelinePath, 'utf8');
		const bannerSrc = readFileSync(bannerPath, 'utf8');
		const viewSrc = readFileSync(viewStatePath, 'utf8');
		expect(pageSrc).toContain('CaseEntityLensBanner');
		expect(pageSrc).toContain('surface="timeline"');
		expect(viewSrc).toContain('case-${surface}-entity-lens-return-to-entity');
		expect(bannerSrc).toContain('data-testid={ids.returnToEntity}');
		expect(bannerSrc).toContain('/entities/${encodeURIComponent(entityId)}');
		expect(bannerSrc).toContain('P108_ENTITY_LENS_RETURN_TO_ENTITY');
	});

	it('files lens banner links to entity detail', () => {
		const pageSrc = readFileSync(filesTabPath, 'utf8');
		const bannerSrc = readFileSync(bannerPath, 'utf8');
		const viewSrc = readFileSync(viewStatePath, 'utf8');
		expect(pageSrc).toContain('CaseEntityLensBanner');
		expect(pageSrc).toContain('surface="files"');
		expect(viewSrc).toContain('case-${surface}-entity-lens-return-to-entity');
		expect(bannerSrc).toContain('data-testid={ids.returnToEntity}');
		expect(bannerSrc).toContain('/entities/${encodeURIComponent(entityId)}');
	});

	it('entity detail exposes timeline + files lens entry links with entityLens query', () => {
		const src = readFileSync(detailPath, 'utf8');
		expect(src).toContain('case-entity-detail--view-timeline-lens');
		expect(src).toContain('case-entity-detail--view-files-lens');
		expect(src).toContain('/timeline?entityLens=');
		expect(src).toContain('/files?entityLens=');
	});
});
