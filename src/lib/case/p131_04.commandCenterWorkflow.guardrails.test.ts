/**
 * P131-04 — Workflow snapshot: GET-only, no importance UI.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const workflowTs = join(here, 'commandCenterWorkflow.ts');
const snapshotPath = join(here, '../components/operator/CommandCenterWorkflowSnapshot.svelte');

describe('P131-04 command center workflow guardrails', () => {
	it('commandCenterWorkflow.ts only uses listCaseWorkflowItems + fetchCommandCenterCaseRows (GET path)', () => {
		const src = readFileSync(workflowTs, 'utf8');
		expect(src).toContain('listCaseWorkflowItems');
		expect(src).toContain('fetchCommandCenterCaseRows');
		expect(src).not.toMatch(/\bPOST\b|\bPUT\b|\bPATCH\b|\bDELETE\b/);
		expect(src).not.toMatch(/\$lib\/.*ai|\$lib\/.*openai/i);
	});

	it('CommandCenterWorkflowSnapshot has no fetch, no badge primitives, goto for case link only', () => {
		const src = readFileSync(snapshotPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/ds-badge|DS_BADGE/);
		expect(src).toContain('navigateCommandCenterToCaseWorkspace');
		expect(src).toContain('fetchCommandCenterWorkflowRows');
	});
});
