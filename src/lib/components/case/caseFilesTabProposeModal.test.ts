/**
 * P41-14 — Case Files tab: processing modal + cancel + unified bulk confirm (static source contract).
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
		expect(src).toContain('runProposeTimeline(proposeWorkflow.file, true)');
		expect(src).toContain('Many timeline proposals');
	});
});
