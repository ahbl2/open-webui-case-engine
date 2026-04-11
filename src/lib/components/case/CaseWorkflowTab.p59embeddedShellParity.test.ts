/**
 * P59-08 — Embedded Case Tools workflow shell parity (source contract).
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

describe('CaseWorkflowTab P59-08 embedded shell parity', () => {
	it('uses tighter root and main vertical rhythm when embedded', () => {
		expect(tabSource).toContain('DS_WORKFLOW_CLASSES.workspaceEmbedded');
		expect(tabSource).toMatch(/workflow-main-work-area[\s\S]*?embedded \? 'gap-2\.5' : 'gap-5'/);
	});

	it('compacts attention and guidance headings plus nav chip density for embedded', () => {
		expect(tabSource).toContain('workflowEmbedNavLinkClass');
		// P59-11 removed the top queue strip (had additional embedded typography branches).
		expect((tabSource.match(/\? 'text-\[11px\]'/g) ?? []).length).toBeGreaterThanOrEqual(2);
		expect(tabSource).toMatch(
			/workflowEmbedNavLinkClass[\s\S]*DS_WORKFLOW_CLASSES\.embedNavLinkCompact/
		);
	});

	it('keeps full-page layout values unchanged where this ticket tightens embed only', () => {
		expect(tabSource).toContain('DS_WORKFLOW_CLASSES.workspaceFull');
		expect(tabSource).toMatch(/min-h-\[14rem\][\s\S]*?max-h-\[min\(50vh,36rem\)\]/);
		expect(tabSource).toContain('max-h-[40vh]');
	});

	it('still mounts embedded Workflow from Case Tools with shared shell markup', () => {
		expect(chatPage).toContain('<CaseWorkflowTab {caseId} token={$caseEngineToken!} {isAdmin} embedded />');
		expect(tabSource).toContain("data-workflow-layout={embedded ? 'embedded' : 'full'}");
		expect(tabSource).toContain('data-testid="workflow-attention-region"');
		expect(tabSource).toContain('data-testid="workflow-guidance-placeholder"');
		expect(tabSource).toContain('data-testid="workflow-journey-landmarks"');
	});
});
