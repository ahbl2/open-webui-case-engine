/**
 * P57-09 — Workflow proposal accept/reject in-flight / double-submit guard (client-only).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab proposal mutation in-flight guard (P57-09)', () => {
	it('tracks proposalMutationInFlight and resets on case switch', () => {
		expect(tabSource).toContain('let proposalMutationInFlight = false');
		expect(tabSource).toMatch(
			/proposalMutationInFlight = false;[\s\S]*?clearPostAcceptHighlight\(\)/
		);
	});

	it('guards openAccept and openReject while a proposal action is in flight', () => {
		expect(tabSource).toMatch(/function openAccept\([\s\S]*?if \(proposalMutationInFlight\) return;/);
		expect(tabSource).toMatch(/function openReject\([\s\S]*?if \(proposalMutationInFlight\) return;/);
	});

	it('guards confirmAccept and confirmReject from repeat activation and clears in finally', () => {
		expect(tabSource).toContain('async function confirmAccept()');
		expect(tabSource).toContain('async function confirmReject()');
		expect(tabSource).toMatch(/async function confirmAccept\(\) \{[\s\S]*?if \(proposalMutationInFlight\) return;[\s\S]*?proposalMutationInFlight = true;/);
		expect(tabSource).toMatch(/async function confirmReject\(\) \{[\s\S]*?if \(proposalMutationInFlight\) return;[\s\S]*?proposalMutationInFlight = true;/);
		const finallyMatches = tabSource.match(/finally \{[\s\S]*?proposalMutationInFlight = false;[\s\S]*?\}/g);
		expect(finallyMatches?.length).toBeGreaterThanOrEqual(2);
	});

	it('disables proposal Accept/Reject controls while in flight and surfaces status', () => {
		expect(tabSource).toContain('disabled={proposalMutationInFlight}');
		expect(tabSource).toContain('data-testid="workflow-proposal-action-in-flight"');
		expect(tabSource).toContain('Updating workflow suggestion…');
	});

	it('preserves accept/reject API calls and toast/error copy', () => {
		expect(tabSource).toContain('await acceptWorkflowProposal(caseId, target.id, token)');
		expect(tabSource).toContain('await rejectWorkflowProposal(caseId, target.id, token, rejectReason)');
		expect(tabSource).toContain('Accept failed');
		expect(tabSource).toContain('Reject failed');
		expect(tabSource).toContain('Workflow suggestion accepted — planning item created.');
		expect(tabSource).toContain('Workflow suggestion rejected.');
	});
});
