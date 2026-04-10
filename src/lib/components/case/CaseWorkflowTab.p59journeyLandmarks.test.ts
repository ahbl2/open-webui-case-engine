/**
 * P59-05 — Workflow guidance shell journey landmarks (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P59-05 journey landmarks', () => {
	it('places ordered landmarks inside the guidance shell before deep links', () => {
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		const landmarks = tabSource.indexOf('data-testid="workflow-journey-landmarks"');
		const nav = tabSource.indexOf('data-testid="workflow-case-surfaces-nav"');
		const endSection = tabSource.indexOf('</section>', guid);
		expect(guid).toBeGreaterThan(-1);
		expect(landmarks).toBeGreaterThan(guid);
		expect(nav).toBeGreaterThan(landmarks);
		expect(endSection).toBeGreaterThan(nav);
	});

	it('defines four journey steps in order', () => {
		const s1 = tabSource.indexOf('data-testid="workflow-journey-step-1"');
		const s2 = tabSource.indexOf('data-testid="workflow-journey-step-2"');
		const s3 = tabSource.indexOf('data-testid="workflow-journey-step-3"');
		const s4 = tabSource.indexOf('data-testid="workflow-journey-step-4"');
		expect(s1).toBeLessThan(s2);
		expect(s2).toBeLessThan(s3);
		expect(s3).toBeLessThan(s4);
	});

	it('tunes landmark list density for embedded vs full', () => {
		expect(tabSource).toMatch(/workflow-journey-landmarks[\s\S]*?embedded\s*\?/);
		expect(tabSource).toMatch(/workflow-journey-landmarks[\s\S]*?text-\[10px\]/);
		expect(tabSource).toMatch(/workflow-journey-landmarks[\s\S]*?text-\[11px\]/);
	});

	it('keeps guidance advisory without new workflow state or fetches', () => {
		const guid = tabSource.indexOf('data-testid="workflow-guidance-placeholder"');
		const end = tabSource.indexOf('<!-- Create modal -->');
		const segment = tabSource.slice(guid, end);
		expect(segment).toContain('data-testid="workflow-guidance-placeholder-copy"');
		expect(segment).toContain('Advisory path only');
		expect(segment).not.toMatch(/localStorage/);
		expect(segment).not.toMatch(/await\s+list/);
		expect(segment).not.toMatch(/fetch\s*\(/);
	});

	it('preserves all P59-04 deep links after landmarks', () => {
		const lm = tabSource.indexOf('data-testid="workflow-journey-landmarks"');
		const after = tabSource.slice(lm);
		expect(after).toContain('workflow-deep-link-timeline');
		expect(after).toContain('workflow-deep-link-proposals');
	});
});
