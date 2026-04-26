/**
 * P78-23 — Workflow empty-state destination prioritization: stable Proposals → Timeline → Notes order.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

function expectProposalsBeforeTimelineBeforeNotes(
	slice: string,
	proposalsTestId: string,
	timelineTestId: string,
	notesTestId: string
) {
	const p = slice.indexOf(`data-testid="${proposalsTestId}"`);
	const t = slice.indexOf(`data-testid="${timelineTestId}"`);
	const n = slice.indexOf(`data-testid="${notesTestId}"`);
	expect(p).toBeGreaterThan(-1);
	expect(t).toBeGreaterThan(-1);
	expect(n).toBeGreaterThan(-1);
	expect(p).toBeLessThan(t);
	expect(t).toBeLessThan(n);
}

describe('CaseWorkflowTab P78-23 empty-state link order', () => {
	it('orders Proposals → Timeline → Notes in the workflow item list empty branch', () => {
		const start = tabSource.indexOf('data-testid="workflow-items-empty-next-steps"');
		expect(start).toBeGreaterThan(-1);
		expectProposalsBeforeTimelineBeforeNotes(
			tabSource.slice(start, start + 2500),
			'workflow-items-empty-link-proposals',
			'workflow-items-empty-link-timeline',
			'workflow-items-empty-link-notes'
		);
	});

	it('no longer interleaves P→T→N link chips in the fully empty workflow proposal queue (create-first empty branch)', () => {
		const start = tabSource.indexOf('data-testid="workflow-queue-empty-next-steps"');
		expect(start).toBeGreaterThan(-1);
		const slice = tabSource.slice(start, start + 800);
		expect(slice).toContain('data-testid="workflow-queue-empty-create"');
		expect(slice).not.toContain('data-testid="workflow-queue-empty-link-proposals"');
	});

	it('orders Proposals → Timeline → Notes in the no-pending workflow proposal queue branch', () => {
		const start = tabSource.indexOf('data-testid="workflow-queue-pending-empty-next-steps"');
		expect(start).toBeGreaterThan(-1);
		expectProposalsBeforeTimelineBeforeNotes(
			tabSource.slice(start, start + 2500),
			'workflow-queue-pending-empty-link-proposals',
			'workflow-queue-pending-empty-link-timeline',
			'workflow-queue-pending-empty-link-notes'
		);
	});
});
