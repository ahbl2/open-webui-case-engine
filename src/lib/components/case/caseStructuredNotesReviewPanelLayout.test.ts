/**
 * P37 follow-up — Layout contract: primary compare + advanced collapsed (source-level; no Svelte mount).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const panelPath = join(dirname(fileURLToPath(import.meta.url)), 'CaseStructuredNotesReviewPanel.svelte');

describe('CaseStructuredNotesReviewPanel P37 layout simplification', () => {
	it('primary compare shows original note and narrative preview testids when preview is visible', () => {
		const src = readFileSync(panelPath, 'utf8');
		const orig = src.indexOf('data-testid="{testIdPrefix}-narrative-primary-original-note"');
		const prev = src.indexOf('data-testid="{testIdPrefix}-narrative-text"');
		const cmp = src.indexOf('data-testid="{testIdPrefix}-narrative-primary-compare"');
		expect(orig).toBeGreaterThan(-1);
		expect(prev).toBeGreaterThan(-1);
		expect(cmp).toBeGreaterThan(-1);
		expect(cmp < orig && orig < prev).toBe(true);
	});

	it('core narrative actions appear before collapsible trace (default surface)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const act = src.indexOf('data-testid="{testIdPrefix}-narrative-review-actions"');
		const trd = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-details"');
		expect(act).toBeGreaterThan(-1);
		expect(trd).toBeGreaterThan(-1);
		expect(act < trd).toBe(true);
	});

	it('source trace details are collapsed by default (no open attribute on trace details)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const det = src.indexOf('data-testid="{testIdPrefix}-narrative-trace-details"');
		expect(det).toBeGreaterThan(-1);
		const slice = src.slice(det - 400, det + 60);
		expect(slice).toMatch(/<details/);
		expect(slice).not.toMatch(/open=/);
	});

	it('preview integrity block stays inside a secondary details wrapper', () => {
		const src = readFileSync(panelPath, 'utf8');
		const integ = src.indexOf('data-testid="{testIdPrefix}-preview-integrity"');
		expect(integ).toBeGreaterThan(-1);
		const before = src.lastIndexOf('<details', integ);
		expect(before).toBeGreaterThan(-1);
		expect(before < integ).toBe(true);
	});

	it('structured vs narrative preview comparison stays inside a secondary details wrapper', () => {
		const src = readFileSync(panelPath, 'utf8');
		const diff = src.indexOf('data-testid="{testIdPrefix}-preview-diff-review"');
		expect(diff).toBeGreaterThan(-1);
		const before = src.lastIndexOf('<details', diff);
		expect(before).toBeGreaterThan(-1);
		expect(before < diff).toBe(true);
	});

	it('saved derived workbench is below narrative preview region in document order', () => {
		const src = readFileSync(panelPath, 'utf8');
		const prev = src.indexOf('data-testid="{testIdPrefix}-narrative-preview"');
		const saved = src.indexOf('data-testid="{testIdPrefix}-saved-derived-narratives"');
		expect(prev).toBeGreaterThan(-1);
		expect(saved).toBeGreaterThan(-1);
		expect(prev < saved).toBe(true);
	});

	it('admin recover strip follows saved-derived container', () => {
		const src = readFileSync(panelPath, 'utf8');
		const saved = src.indexOf('data-testid="{testIdPrefix}-saved-derived-narratives"');
		const admin = src.indexOf('data-testid="{testIdPrefix}-narrative-admin-recover"');
		expect(saved).toBeGreaterThan(-1);
		expect(admin).toBeGreaterThan(-1);
		expect(saved < admin).toBe(true);
	});

	it('single short preview notice string is used beside cleaned column (legacy path only)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/NARRATIVE_PREVIEW_REVIEW_NOTICE_SHORT/);
		expect(src).toMatch(/\{#if !narrativePrimaryWorkflow\}[\s\S]*NARRATIVE_PREVIEW_REVIEW_NOTICE_SHORT/);
	});

	it('P37 structured hidden — generation-audit collapsed by default (no open attribute)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const det = src.indexOf('generation-audit-details');
		expect(det).toBeGreaterThan(-1);
		const slice = src.slice(det - 200, det + 80);
		expect(slice).toMatch(/<details/);
		expect(slice).not.toMatch(/open=/);
	});

	it('P37 structured hidden — Accept Draft only after legacy workflow-structured-section', () => {
		const src = readFileSync(panelPath, 'utf8');
		const wf = src.indexOf('workflow-structured-section');
		const accept = src.indexOf('Accept Draft');
		expect(wf).toBeGreaterThan(-1);
		expect(accept).toBeGreaterThan(wf);
	});

	it('P37 structured hidden — bottom Structured breakdown is legacy-only (gated)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const gate = src.indexOf('{#if !narrativePrimaryWorkflow}');
		const breakdown = src.indexOf('Structured breakdown');
		expect(gate).toBeGreaterThan(-1);
		expect(breakdown).toBeGreaterThan(-1);
		expect(gate < breakdown).toBe(true);
	});
});
