/**
 * P78-07 — Workflow guidance / narrative default visibility for operator orientation (source contracts).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P78-07 orientation default visibility', () => {
	it('defaults guidance and narrative expanded so journey + next-step links are in the initial view', () => {
		expect(tabSource).toMatch(/let guidanceExpanded = true/);
		expect(tabSource).toMatch(/let narrativeExpanded = true/);
	});

	it('resets orientation to expanded on case switch (no stale collapsed state across cases)', () => {
		expect(tabSource).toMatch(
			/caseId !== prevWorkflowCaseId[\s\S]*?guidanceExpanded = true[\s\S]*?narrativeExpanded = true[\s\S]*?clearPostAcceptHighlight/s
		);
	});

	it('keeps governed distinctions and same-case nav test ids reachable when guidance body is shown', () => {
		expect(tabSource).toContain('data-testid="workflow-guidance-placeholder-copy"');
		expect(tabSource).toContain('data-testid="workflow-journey-landmarks"');
		expect(tabSource).toContain('data-testid="workflow-case-surfaces-nav"');
		expect(tabSource).toContain('data-testid="workflow-deep-link-proposals"');
		expect(tabSource).toMatch(/guidanceExpanded \? '' : 'hidden'/);
	});
});
