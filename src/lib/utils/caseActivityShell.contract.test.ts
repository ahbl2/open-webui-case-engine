/**
 * P71-08 — Activity tab shell (P70-06 S1 / W1; P70-04 B): Tier L framing + primary list scroll.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/activity/+page.svelte');
const pageSource = readFileSync(pagePath, 'utf8');

describe('case activity shell (P71-08 / P70-06)', () => {
	it('uses CaseWorkspaceContentRegion and Tier L Activity shell classes', () => {
		expect(pageSource).toContain('CaseWorkspaceContentRegion');
		expect(pageSource).toContain('testId="case-activity-page"');
		expect(pageSource).toContain('ce-l-activity-shell');
		expect(pageSource).toContain('ce-l-activity-hero');
		expect(pageSource).toContain('ce-l-activity-hero-title');
		expect(pageSource).toContain('ce-l-activity-primary-scroll');
		expect(pageSource).toContain('data-testid="case-activity-primary-scroll"');
	});

	it('does not use page-root overflow-y-auto on the route', () => {
		expect(pageSource).not.toMatch(
			/class="[^"]*\bflex flex-col flex-1 min-h-0 overflow-y-auto\b[^"]*"/
		);
	});
});
