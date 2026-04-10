/**
 * P71-07 — Proposals tab shell (P70-06 W1; P70-04 B; Wave 3 chrome): Tier L framing + panel scroll ownership.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/proposals/+page.svelte');
const pageSource = readFileSync(pagePath, 'utf8');

describe('case proposals shell (P71-07 / P70-06)', () => {
	it('uses CaseWorkspaceContentRegion and Tier L Proposals shell classes', () => {
		expect(pageSource).toContain('CaseWorkspaceContentRegion');
		expect(pageSource).toContain('testId="case-proposals-page"');
		expect(pageSource).toContain('ce-l-proposals-shell');
		expect(pageSource).toContain('ce-l-proposals-hero');
		expect(pageSource).toContain('ce-l-proposals-hero-title');
		expect(pageSource).toContain('ce-l-proposals-hero-intro');
		expect(pageSource).toContain('ce-l-proposals-workspace');
	});

	it('mounts ProposalReviewPanel inside the workspace slot with layout page', () => {
		expect(pageSource).toContain('<ProposalReviewPanel');
		expect(pageSource).toContain('layout="page"');
	});

	it('does not add page-level overflow-y-auto on the route (panel owns internal scroll)', () => {
		expect(pageSource).not.toMatch(/overflow-y-auto/);
	});
});
