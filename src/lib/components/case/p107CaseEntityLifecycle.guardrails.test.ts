/**
 * P107-02 — Entity retire/restore guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const detailPanelPath = join(here, 'CaseEntityDetailPanel.svelte');
const lifecycleCopyPath = join(here, '../../case/p107CaseEntityLifecycleCopy.ts');

describe('CaseEntityDetailPanel.svelte (P107-02)', () => {
	const src = readFileSync(detailPanelPath, 'utf8');

	it('loads detail with include_retired so retired rows remain addressable by URL', () => {
		expect(src).toContain('includeRetired: true');
		expect(src).toContain('getCaseEntityDetail');
	});

	it('uses API module for retire/restore (no inline fetch)', () => {
		expect(src).toContain('retireCaseEntity');
		expect(src).toContain('restoreCaseEntity');
		expect(src).not.toContain('fetch(');
	});

	it('exposes lifecycle controls and error test ids', () => {
		expect(src).toContain('data-testid="case-entity-detail--retire"');
		expect(src).toContain('data-testid="case-entity-detail--restore"');
		expect(src).toContain('data-testid="case-entity-detail--lifecycle-error"');
	});

	it('does not add evidence-link mutation routes', () => {
		expect(src).not.toContain('/evidence-links');
	});

	it('does not introduce retire/restore on list panel in this ticket', () => {
		const listSrc = readFileSync(join(here, 'CaseEntitiesPanel.svelte'), 'utf8');
		expect(listSrc).not.toContain('retireCaseEntity');
		expect(listSrc).not.toContain('restoreCaseEntity');
	});
});

describe('p107CaseEntityLifecycleCopy (P107-02)', () => {
	const src = readFileSync(lifecycleCopyPath, 'utf8');
	const lower = src.toLowerCase();

	it('frames non-destructive lifecycle without intelligence or graph language', () => {
		expect(lower).toContain('non-destructive');
		expect(lower).toContain('restore');
		expect(lower).not.toContain('suggest');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('related entities');
	});
});
