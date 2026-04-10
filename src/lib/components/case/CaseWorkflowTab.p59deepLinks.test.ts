/**
 * P59-04 — Workflow shell deep links to case surfaces (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-04 case surface deep links', () => {
	it('renders all five deep-link actions in the guidance shell with SvelteKit hrefs', () => {
		expect(tabSource).toContain('data-testid="workflow-case-surfaces-nav"');
		expect(tabSource).toContain('data-testid="workflow-deep-link-timeline"');
		expect(tabSource).toContain('data-testid="workflow-deep-link-notes"');
		expect(tabSource).toContain('data-testid="workflow-deep-link-files"');
		expect(tabSource).toContain('data-testid="workflow-deep-link-summary"');
		expect(tabSource).toContain('data-testid="workflow-deep-link-proposals"');
		expect(tabSource).toContain('href="/case/{caseId}/timeline"');
		expect(tabSource).toContain('href="/case/{caseId}/notes"');
		expect(tabSource).toContain('href="/case/{caseId}/files"');
		expect(tabSource).toContain('href="/case/{caseId}/summary"');
		expect(tabSource).toContain('href="/case/{caseId}/proposals"');
	});

	it('keeps deep links inside guidance, after main work area (shell order)', () => {
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		const nav = tabSource.indexOf('data-testid="workflow-case-surfaces-nav"');
		const landmarks = tabSource.indexOf('data-testid="workflow-journey-landmarks"');
		expect(main).toBeGreaterThan(-1);
		expect(guid).toBeGreaterThan(main);
		expect(landmarks).toBeGreaterThan(guid);
		expect(nav).toBeGreaterThan(landmarks);
	});

	it('uses anchor navigation only (no goto) for deep links in the guidance block', () => {
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		const end = tabSource.indexOf('<!-- Create modal -->');
		expect(guid).toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(guid);
		const segment = tabSource.slice(guid, end);
		expect(segment).not.toContain('goto(');
		expect(segment).toMatch(/<a[\s\S]*?workflow-deep-link-timeline/);
	});

	it('adjusts link row gap for embedded mode (P59-10: spacing in expanded guidance body)', () => {
		expect(tabSource).toMatch(
			/data-testid="workflow-case-surfaces-nav"[\s\S]*?embedded\s*\?\s*'gap-1'[\s\S]*?:\s*'gap-2'/
		);
	});

	it('does not add deep links to the attention metrics region', () => {
		const att = tabSource.indexOf('data-testid="workflow-attention-region"');
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		expect(att).toBeGreaterThan(-1);
		const segment = tabSource.slice(att, main);
		expect(segment).not.toContain('workflow-deep-link-');
		expect(segment).not.toContain('/case/{caseId}/timeline');
	});
});
