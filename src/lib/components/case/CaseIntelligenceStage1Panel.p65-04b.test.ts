/**
 * P65-04b — Mutation confirm wiring (commit / reject / retire) + error region structure.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'CaseIntelligenceStage1Panel.svelte'), 'utf8');

describe('CaseIntelligenceStage1Panel (P65-04b)', () => {
	it('uses shared ConfirmDialog for guarded mutations', () => {
		expect(source).toContain("import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte'");
		expect(source).toContain('data-testid="case-intel-stage1-mutation-confirm"');
		expect(source).toContain('bind:show={mutationConfirmShow}');
		expect(source).toContain('onConfirm={executeConfirmedMutation}');
	});

	it('routes commit / reject / retire buttons through confirmation openers (no direct API click)', () => {
		expect(source).toContain('on:click={() => openCommitConfirmation(row)}');
		expect(source).toContain('on:click={() => openRejectConfirmation(row)}');
		expect(source).toContain('on:click={() => openRetireConfirmation(ent)}');
		expect(source).not.toContain('on:click={() => void onCommit(row)}');
		expect(source).not.toContain('on:click={() => void onReject(row)}');
		expect(source).not.toContain('on:click={() => void onRetire(ent)}');
	});

	it('surfaces mutation errors with contextual action label (F-10)', () => {
		expect(source).toContain('mutationErrorAction');
		expect(source).toContain('data-testid="case-intel-stage1-mutation-error"');
		expect(source).toContain('role="alert"');
	});
});
