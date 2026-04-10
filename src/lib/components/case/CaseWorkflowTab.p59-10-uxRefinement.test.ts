/**
 * P59-10 — Workflow shell: default-collapsed guidance (source contracts).
 * P59-11 removed top proposal banner; guidance behavior unchanged.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-10 guidance UX refinement', () => {
	it('defaults guidance + narrative intros collapsed locally and resets on case switch', () => {
		expect(tabSource).toMatch(/let guidanceExpanded = false/);
		expect(tabSource).toMatch(/let narrativeExpanded = false/);
		expect(tabSource).toMatch(
			/caseId !== prevWorkflowCaseId[\s\S]*?guidanceExpanded = false[\s\S]*?narrativeExpanded = false[\s\S]*?clearPostAcceptHighlight/s
		);
	});

	it('adds lightweight guidance toggle + expandable body (no persistence)', () => {
		expect(tabSource).toContain('data-testid="workflow-guidance-toggle"');
		expect(tabSource).toContain('data-testid="workflow-guidance-expanded-body"');
		expect(tabSource).toContain('aria-expanded={guidanceExpanded}');
		expect(tabSource).toMatch(/guidanceExpanded \? '' : 'hidden'/);
		expect(tabSource).not.toMatch(/guidanceExpanded[\s\S]*localStorage/s);
	});

	it('keeps guidance doctrine content when expanded and preserves embedded/full sizing hooks', () => {
		expect(tabSource).toMatch(/workflow-guidance-placeholder[\s\S]*?guidanceExpanded[\s\S]*?embedded\s*\?/);
		expect(tabSource).toContain('data-testid="workflow-guidance-placeholder-copy"');
		expect(tabSource).toContain('data-testid="workflow-journey-landmarks"');
		expect(tabSource).toContain('data-testid="workflow-case-surfaces-nav"');
	});

	it('does not alter Phase 59 shell region ordering (header → narrative → attention → main → proposal queue → guidance)', () => {
		const ids = [
			'data-testid="workflow-page-header"',
			'data-testid="workflow-narrative-intro"',
			'data-testid="workflow-attention-region"',
			'data-testid="workflow-main-work-area"',
			'data-testid="workflow-proposals-panel"',
			'data-testid="workflow-guidance-placeholder"'
		];
		let prev = -1;
		for (const id of ids) {
			const idx = tabSource.indexOf(id);
			expect(idx, id).toBeGreaterThan(prev);
			prev = idx;
		}
	});
});
