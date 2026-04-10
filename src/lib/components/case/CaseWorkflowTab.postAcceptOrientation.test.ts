/**
 * P57-08 — Post-accept scroll + transient row highlight (client-side orientation).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab post-accept orientation (P57-08)', () => {
	it('tracks highlight state and orientation helper after accept', () => {
		expect(tabSource).toContain('let highlightWorkflowItemId');
		expect(tabSource).toContain('async function orientToWorkflowItemRow');
		expect(tabSource).toContain('scrollIntoView({ block: \'nearest\', behavior: \'smooth\' })');
		expect(tabSource).toContain('data-workflow-item-row={item.id}');
	});

	it('reconciles filter to All when accepted item is not visible like create flow', () => {
		expect(tabSource).toContain('acceptedItemId');
		expect(tabSource).toContain('acceptedType');
		expect(tabSource).toMatch(/filter = 'all'[\s\S]*await loadItems\(\)/);
	});

	it('keeps accept API call and error path intact', () => {
		expect(tabSource).toContain('await acceptWorkflowProposal(caseId, target.id, token)');
		expect(tabSource).toContain('Accept failed');
		expect(tabSource).toContain('Proposal accepted and workflow item created');
	});

	it('exposes row highlight hook and clears on case switch', () => {
		expect(tabSource).toContain('data-post-accept-highlight=');
		expect(tabSource).toContain('clearPostAcceptHighlight()');
		expect(tabSource).toContain('onDestroy');
	});
});
