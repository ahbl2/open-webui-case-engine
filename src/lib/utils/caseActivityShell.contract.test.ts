/**
 * P71-08 — Activity tab shell (Tier L framing + primary scroll).
 * P129-01 — Audit framing (`CaseActivityFraming`) replaces legacy hero; scroll contract preserved.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/activity/+page.svelte');
const pageSource = readFileSync(pagePath, 'utf8');

describe('case activity shell (P71-08 / P129-01)', () => {
	it('uses CaseWorkspaceContentRegion, P129 framing, and Tier L Activity shell classes', () => {
		expect(pageSource).toContain('CaseWorkspaceContentRegion');
		expect(pageSource).toContain('testId="case-activity-page"');
		expect(pageSource).toContain('CaseActivityFraming');
		expect(pageSource).toContain('ce-l-activity-shell');
		expect(pageSource).toContain('ce-l-activity-primary-scroll');
		expect(pageSource).toContain('data-testid="case-activity-primary-scroll"');
	});

	it('does not use page-root overflow-y-auto on the route', () => {
		expect(pageSource).not.toMatch(
			/class="[^"]*\bflex flex-col flex-1 min-h-0 overflow-y-auto\b[^"]*"/
		);
	});
});
