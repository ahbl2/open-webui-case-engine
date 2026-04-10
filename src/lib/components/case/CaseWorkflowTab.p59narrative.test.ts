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
	it('exposes a narrative intro for full and embedded modes (full: default-collapsed + toggle)', () => {
		expect(tabSource).toContain('data-testid="workflow-narrative-intro"');
		expect(tabSource).toContain('data-testid="workflow-narrative-toggle"');
		expect(tabSource).toContain('{#if !embedded}');
		expect(tabSource).toContain('{:else}');
		expect(tabSource).toContain('Workflow is your');
		expect(tabSource).toContain('>not</span> the official case record');
		expect(tabSource).toContain('The case <span class="font-medium text-gray-800 dark:text-gray-200">Proposals</span> tab');
		expect(tabSource).toContain('workflow proposal queue</span> below');
	});

	it('uses distinct workflow proposal queue labels separate from case Proposals tab', () => {
		expect(tabSource).toContain('Workflow proposal queue');
		expect(tabSource).toContain(
			'aria-label="Workflow proposal queue — suggestions for workflow items, separate from case Proposals drafts"'
		);
	});

	it('aligns accept-confirm copy with governed intake / Timeline distinction', () => {
		expect(tabSource).toContain('Creates a workflow planning item from this suggestion');
		expect(tabSource).toContain('does not publish to the official Timeline');
	});

	it('clarifies workflow items list as planning-only in toolbar helper text', () => {
		expect(tabSource).toContain('Persisted hypotheses and gaps on this tab—planning only');
	});

	it('updates empty-list copy to distinguish planning from governed Proposals path', () => {
		expect(tabSource).toContain('official facts still go through Timeline after governed intake');
		expect(tabSource).toContain('Use the case Proposals tab when you have governed timeline or note drafts');
	});
});
