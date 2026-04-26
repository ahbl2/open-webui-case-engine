/**
 * P59-01 — Workflow vs Proposals narrative / help alignment (Theme 0).
 * Source contract tests — no Svelte mount.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-01 narrative (Workflow vs Proposals)', () => {
	it('exposes a narrative intro for full (sr-only) + embedded doctrine; guidance is toggle-collapsed (not a duplicate narrative block)', () => {
		expect(tabSource).toContain('data-testid="workflow-narrative-intro"');
		expect(tabSource).toContain('data-testid="workflow-guidance-toggle"');
		expect(tabSource).toContain('{#if !embedded}');
		expect(tabSource).toContain('{:else}');
		expect(tabSource).toContain('Workflow is your');
		expect(tabSource).toContain('>not</span> the official case record');
		expect(tabSource).toContain(
			'The case <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineStrong}">Proposals</span> tab'
		);
		expect(tabSource).toContain('workflow proposal queue</span');
	});

	it('uses distinct workflow proposal queue labels separate from case Proposals tab', () => {
		expect(tabSource).toContain('Workflow proposal queue');
		expect(tabSource).toContain('P127_WORKFLOW_PROPOSAL_QUEUE_ARIA');
		expect(tabSource).toContain('aria-label={P127_WORKFLOW_PROPOSAL_QUEUE_ARIA}');
	});

	it('aligns accept-confirm copy with governed intake / Timeline distinction', () => {
		expect(tabSource).toContain('Creates a workflow planning item from this workflow-queue suggestion');
		expect(tabSource).toContain('does not publish to the official Timeline');
	});

	it('clarifies workflow as planning-only without the removed summary-strip authority banner', () => {
		expect(tabSource).not.toContain('data-testid="workflow-operational-authority-banner"');
		expect(tabSource).toContain('data-testid="workflow-narrative-intro"');
		expect(tabSource).toContain('planning layer');
	});

	it('updates empty-list copy to distinguish planning from governed Proposals path', () => {
		expect(tabSource).toContain('official facts still go through Timeline after governed intake');
		expect(tabSource).toContain('Use the case Proposals tab when you have governed timeline or note drafts');
	});
});
