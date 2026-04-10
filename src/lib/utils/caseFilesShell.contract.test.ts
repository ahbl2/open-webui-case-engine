/**
 * P71-06 — Files tab shell (P70-06 S1 / W1; P70-04 B hero): Tier L framing + scroll ownership.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/files/+page.svelte');
const pageSource = readFileSync(pagePath, 'utf8');

describe('case files shell (P71-06 / P70-06)', () => {
	it('uses CaseWorkspaceContentRegion and Tier L Files shell classes', () => {
		expect(pageSource).toContain('CaseWorkspaceContentRegion');
		expect(pageSource).toContain('testId="case-files-page"');
		expect(pageSource).toContain('ce-l-files-shell');
		expect(pageSource).toContain('ce-l-files-hero');
		expect(pageSource).toContain('ce-l-files-hero-title');
		expect(pageSource).toContain('ce-l-files-hero-meta');
		expect(pageSource).toContain('ce-l-files-primary-scroll');
	});

	it('wraps CaseFilesTab in the primary scroll region (S1)', () => {
		const idx = pageSource.indexOf('ce-l-files-primary-scroll');
		expect(idx).toBeGreaterThan(-1);
		const afterScroll = pageSource.slice(idx, idx + 600);
		expect(afterScroll).toContain('<CaseFilesTab');
	});

	it('does not use page-root overflow-y-auto on the route (avoid double scroll with shell)', () => {
		expect(pageSource).not.toMatch(/class="[^"]*overflow-y-auto[^"]*"/);
	});
});
