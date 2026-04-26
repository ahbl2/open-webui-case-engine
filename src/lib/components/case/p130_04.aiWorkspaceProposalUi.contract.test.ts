/**
 * P130-04 — UI contract (source-level): selection, review, success testids and disabled wiring.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const panelPath = join(dirname(fileURLToPath(import.meta.url)), 'AIWorkspacePanel.svelte');

describe('AIWorkspacePanel P130-04 UI contract', () => {
	it('exposes proposal draft flow testids and gates primary button', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('case-ai-workspace-proposal-create-button');
		expect(src).toContain('case-ai-workspace-proposal-review-panel');
		expect(src).toContain('case-ai-workspace-proposal-confirm');
		expect(src).toContain('case-ai-workspace-proposal-cancel');
		expect(src).toContain('case-ai-workspace-proposal-success');
		expect(src).toContain('disabled={!readyForProposalReview');
		expect(src).toContain('case-ai-workspace-proposal-include-generated');
	});
});
