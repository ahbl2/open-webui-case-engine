/**
 * P126-02 — Manual entity creation: static copy; no inference vocabulary; no route id leakage in form.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p126EntityCreateCopy.ts');
const formPath = join(__dirname, '../components/case/CaseEntityCreateForm.svelte');
const panelPath = join(__dirname, '../components/case/CaseEntitiesPanel.svelte');
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/entities/+page.svelte');

describe('P126-02 entity create copy', () => {
	it('exports fixed type list and entry labels only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/export const P126_ENTITY_TYPE_OPTIONS/);
		expect(src).toMatch(/export const P126_ENTITY_CREATE_ENTRY_BUTTON/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('avoids inference / suggestion product vocabulary', () => {
		const lower = readFileSync(copyPath, 'utf8').toLowerCase();
		expect(lower).not.toMatch(/\bdetected\b/);
		expect(lower).not.toMatch(/\bfound\b/);
		expect(lower).not.toMatch(/\bsuggested\b/);
		expect(lower).not.toMatch(/\bmatched\b/);
		expect(lower).not.toMatch(/\bidentified\b/);
	});
});

describe('CaseEntityCreateForm.svelte (P126-02)', () => {
	const src = readFileSync(formPath, 'utf8');

	it('submits via createCaseEntity only; no case reads or prefills', () => {
		expect(src).toContain('createCaseEntity');
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/listCaseFiles|listTimeline|notebook|getCaseById/i);
		// no suggestion hooks
		expect(src.toLowerCase()).not.toMatch(/\bsuggest\b/);
	});

	it('uses fixed type select and explicit test ids', () => {
		expect(src).toContain('P126_ENTITY_TYPE_OPTIONS');
		expect(src).toContain('data-testid="case-entity-create-form--type"');
		expect(src).toContain('data-testid="case-entity-create-form--value"');
		expect(src).toContain('data-testid="case-entity-create-form--submit"');
	});
});

describe('CaseEntitiesPanel + entities route (P126-02 wiring)', () => {
	it('list panel mounts CaseEntityCreateForm and toast on success path', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('CaseEntityCreateForm');
		expect(src).toContain('P126_ENTITY_CREATE_TOAST_SUCCESS');
		expect(src).toContain('toast.success');
	});

	it('entities list page uses getRouteCaseIdString, not $page.params.id', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain('getRouteCaseIdString');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});
