/**
 * P59-09 — Phase 59 Workflow Workspace Shell regression ladder (source contracts).
 * Complements ticket-scoped P59-01…P59-08 tests with cross-cutting ordering and doctrine checks.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab Phase 59 regression (P59-09)', () => {
	it('P59-02 / P59-13: preserves shell region order (header → attention → main → proposal queue → guidance)', () => {
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

	it('P59-02 / P59-05 / P59-04: guidance block orders intro → landmarks → deep-link nav', () => {
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		const copy = tabSource.indexOf('data-testid="workflow-guidance-placeholder-copy"');
		const lm = tabSource.indexOf('data-testid="workflow-journey-landmarks"');
		const nav = tabSource.indexOf('data-testid="workflow-case-surfaces-nav"');
		const sectionEnd = tabSource.indexOf('</section>', guid);
		expect(guid).toBeGreaterThan(-1);
		expect(copy).toBeGreaterThan(guid);
		expect(lm).toBeGreaterThan(copy);
		expect(nav).toBeGreaterThan(lm);
		expect(sectionEnd).toBeGreaterThan(nav);
	});

	it('P59-01: retains Workflow vs case Proposals vs official record distinctions in narrative and queue', () => {
		expect(tabSource).toContain('data-testid="workflow-narrative-intro"');
		expect(tabSource).toContain('Workflow is your');
		expect(tabSource).toContain('>not</span> the official case record');
		expect(tabSource).toContain(
			'The case <span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineStrong}">Proposals</span> tab'
		);
		expect(tabSource).toContain('Planning (this tab):</span> hypotheses');
		expect(tabSource).toContain('this queue is not the case Proposals tab');
	});

	it('P59-03: keeps attention signals derived from client state (script + attention template)', () => {
		expect(tabSource).toContain('$: attentionListReady');
		const att = tabSource.indexOf('data-testid="workflow-attention-region"');
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		expect(att).toBeGreaterThan(-1);
		const segment = tabSource.slice(att, main);
		expect(segment).toContain('data-testid="workflow-attention-pending-count"');
		expect(segment).toContain('{proposalCount}');
		expect(segment).not.toMatch(/await\s+/);
	});

	it('P59-04: five case surfaces use shared nav chip class and correct href prefixes', () => {
		const matches = tabSource.match(/class=\{workflowEmbedNavLinkClass\}/g);
		expect(matches?.length).toBe(5);
		for (const path of ['timeline', 'notes', 'files', 'summary', 'proposals']) {
			expect(tabSource).toContain(`href="/case/{caseId}/${path}"`);
		}
	});

	it('P59-05: journey remains advisory and lists four ordered steps', () => {
		const guid = tabSource.indexOf('<!-- Create modal -->');
		const head = tabSource.slice(0, guid);
		expect(head).toContain('Advisory path only');
		for (let s = 1; s <= 4; s++) {
			expect(head).toContain(`data-testid="workflow-journey-step-${s}"`);
		}
	});

	it('P59-06 / P59-07 / P59-11: proposal panel + list state shells stay wired (no top queue banner)', () => {
		expect(tabSource).not.toContain('data-testid="workflow-proposals-banner"');
		expect(tabSource).toContain('data-testid="workflow-proposals-panel"');
		expect(tabSource).toContain('data-testid="workflow-items-list-state-shell"');
		expect(tabSource).toContain('data-testid="workflow-proposals-state-shell"');
		expect(tabSource).toContain('framed={false}');
	});

	it('P59-08: embedded layout toggle remains the single mode switch for deep links and root spacing', () => {
		expect(tabSource).toContain("data-workflow-layout={embedded ? 'embedded' : 'full'}");
		expect(tabSource).toContain('workflowEmbedNavLinkClass');
		expect(tabSource).toContain('{#if !embedded}');
		expect(tabSource).toContain('export let embedded: boolean = false');
	});
});
