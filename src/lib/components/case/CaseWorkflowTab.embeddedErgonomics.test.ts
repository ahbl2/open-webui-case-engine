/**
 * P57-07 — Case Tools embedded Workflow layout prop + ergonomics markup.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');
const chatPage = readFileSync(
	join(__dirname, '../../../routes/(app)/case/[id]/chat/+page.svelte'),
	'utf8'
);
const workflowPage = readFileSync(
	join(__dirname, '../../../routes/(app)/case/[id]/workflow/+page.svelte'),
	'utf8'
);

describe('CaseWorkflowTab embedded ergonomics (P57-07)', () => {
	it('declares embedded prop and layout data attribute for embed vs full', () => {
		expect(tabSource).toContain('export let embedded: boolean = false');
		expect(tabSource).toContain("data-workflow-layout={embedded ? 'embedded' : 'full'}");
		expect(tabSource).toContain('max-h-[min(46vh,14.5rem)]');
		expect(tabSource).toContain('max-h-[min(36vh,12rem)]');
	});

	it('keeps narrative intro (full + embedded) and core structure for layout modes', () => {
		expect(tabSource).toContain('{#if !embedded}');
		expect(tabSource).toContain('data-testid="workflow-narrative-intro"');
		expect(tabSource).toContain('Workflow is your');
		expect(tabSource).toContain('Planning:</span> hypotheses');
		expect(tabSource).toContain('gap-5 p-4');
		expect(tabSource).toContain('max-h-[min(50vh,36rem)]');
	});

	it('Case Tools passes embedded into Workflow; workflow route does not', () => {
		expect(chatPage).toContain('<CaseWorkflowTab {caseId} token={$caseEngineToken!} {isAdmin} embedded />');
		expect(chatPage).toContain('min-h-0 overflow-auto flex flex-col');
		expect(workflowPage).toContain('<CaseWorkflowTab {caseId} token={$caseEngineToken} {isAdmin} />');
		expect(workflowPage).not.toMatch(/CaseWorkflowTab[^>]*embedded/);
	});

	it('preserves workflow controls and data paths', () => {
		expect(tabSource).toContain('loadProposals');
		expect(tabSource).toContain('{#each items as item (item.id)}');
		expect(tabSource).toContain('{#each proposals as p (p.id)}');
	});
});
