/**
 * P123-01 — `CaseWorkspaceLayout` contract: presentational shell only (no data/API/routing).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const layoutPath = join(dirname(fileURLToPath(import.meta.url)), 'CaseWorkspaceLayout.svelte');

describe('CaseWorkspaceLayout P123-01', () => {
	it('is presentational only (no fetch, stores, navigation, or lifecycle data loading)', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\b/);
		expect(src).not.toMatch(/getCaseById/);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/onMount\b/);
		expect(src).not.toMatch(/\bgoto\b/);
		expect(src).not.toMatch(/page\s+from\s+['"]\$app\/stores['"]/);
	});

	it('does not reference timeline, entities, workflow, or AI surfaces', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src.toLowerCase()).not.toMatch(/\btimeline\b/);
		expect(src.toLowerCase()).not.toMatch(/\bentity\b/);
		expect(src.toLowerCase()).not.toMatch(/\bworkflow\b/);
		expect(src.toLowerCase()).not.toMatch(/\bai\b/);
	});

	it('declares explicit active-case prop and header testids for identity vs empty state', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).toMatch(/export let hasActiveCase/);
		expect(src).toMatch(/data-testid="case-workspace-layout-empty"/);
		expect(src).toMatch(/data-testid="case-workspace-layout-identity"/);
		expect(src).toMatch(/P123_LAYOUT_HEADER_NO_CASE/);
		expect(src).toMatch(/<slot name="sidebar"/);
	});

	it('uses DS primitives from detectivePrimitiveFoundation (no parallel styling system)', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).toMatch(/DS_CASE_SHELL_CLASSES/);
		expect(src).toMatch(/DS_EMPTY_CLASSES/);
		expect(src).toMatch(/DS_TYPE_CLASSES/);
	});

	it('supports hiding the built-in header when parent supplies CaseWorkspaceHeader (P123-02)', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).toMatch(/export let showHeader/);
		expect(src).toMatch(/\{#if showHeader\}/);
	});
});
