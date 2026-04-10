/**
 * P71-05 — Timeline tab shell (P70-06 S1 / W1; P70-04 B hero): Tier L framing + scroll ownership.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/timeline/+page.svelte');
const pageSource = readFileSync(pagePath, 'utf8');

describe('case timeline shell (P71-05 / P70-06)', () => {
	it('uses CaseWorkspaceContentRegion and Tier L timeline shell classes', () => {
		expect(pageSource).toContain('CaseWorkspaceContentRegion');
		expect(pageSource).toContain('testId="case-timeline-page"');
		expect(pageSource).toContain('ce-l-timeline-shell');
		expect(pageSource).toContain('ce-l-timeline-hero');
		expect(pageSource).toContain('ce-l-timeline-hero-title');
		expect(pageSource).toContain('ce-l-timeline-toolbar');
		expect(pageSource).toContain('ce-l-timeline-primary-scroll');
	});

	it('declares a single primary vertical scroll hook (S1 — list region)', () => {
		expect(pageSource).toContain('data-testid="case-timeline-primary-scroll"');
		expect(pageSource).toContain('bind:this={scrollContainerEl}');
	});

	it('does not add a second page-root overflow-y-auto on the timeline route', () => {
		const rootIdx = pageSource.indexOf('testId="case-timeline-page"');
		expect(rootIdx).toBeGreaterThan(-1);
		const afterRoot = pageSource.slice(rootIdx, rootIdx + 800);
		expect(afterRoot).not.toMatch(/overflow-y-auto/);
	});
});
