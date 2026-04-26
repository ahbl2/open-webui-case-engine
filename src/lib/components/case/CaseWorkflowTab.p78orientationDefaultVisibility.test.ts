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
	it('defaults guidance collapsed so the operational dashboard is first; operators expand when needed', () => {
		expect(tabSource).toMatch(/let guidanceExpanded = false/);
	});

	it('resets guidance to collapsed on case switch (no stale expanded state across cases)', () => {
		expect(tabSource).toMatch(
			/caseId !== prevWorkflowCaseId[\s\S]*?guidanceExpanded = false[\s\S]*?aboutSurfaceOpen = false[\s\S]*?clearPostAcceptHighlight/s
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
