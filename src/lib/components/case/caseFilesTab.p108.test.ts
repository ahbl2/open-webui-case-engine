/**
 * P108-02 — Entity → files lens (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const tabPath = join(here, 'CaseFilesTab.svelte');
const bannerPath = join(here, 'CaseEntityLensBanner.svelte');
const viewStatePath = join(here, '../../case/p108EntityLensViewState.ts');

describe('CaseFilesTab.svelte (P108-02)', () => {
	const src = readFileSync(tabPath, 'utf8');
	const lower = src.toLowerCase();

	it('uses entityLens URL + getCaseEntityDetail + full listCaseFiles for lens path (read-only)', () => {
		expect(src).toContain('parseEntityLensEntityIdFromSearchParams');
		expect(src).toContain('getCaseEntityDetail');
		expect(src).toContain('listCaseFiles');
		expect(src).toContain('filterCaseFilesToEntityLinkedOnly');
		expect(src).toContain('CaseEntityLensBanner');
		expect(src).toContain('surface="files"');
		expect(src).toContain('caseId={caseId}');
		expect(src).toContain('onClear={clearEntityFilesLens}');
		expect(src).toContain('case-files-entity-lens-empty');
	});

	it('blocks load-more when entity lens is active', () => {
		expect(src).toMatch(/if \(entityLensEntityId\) return;/);
	});

	it('disables list search/filters while entity lens is active', () => {
		expect(src).toContain('disabled={!!entityLensEntityId}');
	});

	it('avoids relationship / cluster framing in tab source', () => {
		expect(lower).not.toContain('related entities');
		expect(lower).not.toMatch(/\bcluster\b/);
	});
});

describe('CaseFilesTab.svelte (P108-03)', () => {
	const src = readFileSync(tabPath, 'utf8');
	const bannerSrc = readFileSync(bannerPath, 'utf8');
	const viewSrc = readFileSync(viewStatePath, 'utf8');

	it('exposes return-to-entity link in lens banner', () => {
		expect(src).toContain('CaseEntityLensBanner');
		expect(src).toContain('surface="files"');
		expect(viewSrc).toContain('case-${surface}-entity-lens-return-to-entity');
		expect(bannerSrc).toContain('data-testid={ids.returnToEntity}');
		expect(bannerSrc).toContain('P108_ENTITY_LENS_RETURN_TO_ENTITY');
		expect(bannerSrc).toContain('/entities/${encodeURIComponent(entityId)}');
	});
});
