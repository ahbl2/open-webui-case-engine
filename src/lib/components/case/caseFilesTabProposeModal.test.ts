/**
 * P41-14 / P41-16 — Case Files tab: processing modal, bulk confirm, navigation (static source contract).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const tabPath = join(process.cwd(), 'src/lib/components/case/CaseFilesTab.svelte');

describe('CaseFilesTab.svelte — P41-14 propose timeline modal', () => {
	it('opens unified modal with processing test ids and copy before bulk confirm block', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toContain('data-testid="propose-timeline-modal"');
		expect(src).toContain('data-testid="propose-timeline-processing"');
		expect(src).toContain('data-testid="propose-timeline-cancel-btn"');
		expect(src).toContain('data-testid="propose-timeline-processing-label"');
		expect(src).toMatch(/Processing document for timeline proposals/i);
		expect(src).toMatch(/This may take a moment/i);
		const iProc = src.indexOf('data-testid="propose-timeline-processing"');
		const iBulk = src.indexOf('data-testid="bulk-proposal-confirm-modal"');
		expect(iProc).toBeGreaterThan(-1);
		expect(iBulk).toBeGreaterThan(-1);
		expect(iProc).toBeLessThan(iBulk);
	});

	it('uses AbortController, generation guard, dismissProposeModal, and passes signal to API', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toContain('AbortController');
		expect(src).toContain('proposeRequestGeneration');
		expect(src).toContain('dismissProposeModal');
		expect(src).toContain('isFileProposeLocked');
		expect(src).toContain('onDestroy');
		expect(src).toContain('signal: abort.signal');
	});

	it('keeps bulk confirmation submit wired after processing phase', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toContain('data-testid="bulk-proposal-confirm-submit"');
		expect(src).toContain(
			'runProposeTimeline(proposeWorkflow.file, true, proposeWorkflow.token)'
		);
		expect(src).toContain('Many timeline proposals');
	});
});

describe('CaseFilesTab.svelte — P41-16 modal transition + proposals redirect', () => {
	it('gates the overlay on explicit processing or bulk_confirm (never idle empty shell)', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toMatch(
			/proposeWorkflow\.step === 'processing' \|\| proposeWorkflow\.step === 'bulk_confirm'/
		);
	});

	it('awaits tick after confirmation_required before returning so bulk UI can mount', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toMatch(/status === 'confirmation_required'/);
		expect(src).toMatch(/await tick\(\)/);
		expect(src).toMatch(/P41-16/);
	});

	it('navigates to case proposals route after successful created (not on cancel path)', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toContain("from '$app/navigation'");
		expect(src).toContain('goto(');
		expect(src).toContain('/proposals');
		expect(src).toContain('navigateToProposalsAfter');
	});

	it('keys inner modal body by proposeWorkflow.step for clean processing → bulk swap', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toContain('{#key proposeWorkflow.step}');
	});
});
