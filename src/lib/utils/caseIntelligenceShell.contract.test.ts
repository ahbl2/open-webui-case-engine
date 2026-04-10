/**
 * P71-09 — Intelligence route shell (P70-06 W3 + scroll; P70-05 §3.2 secondary segmented demotion).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/intelligence/+page.svelte');
const pageSource = readFileSync(pagePath, 'utf8');

describe('case intelligence shell (P71-09 / P70-05 / P70-06)', () => {
	it('uses CaseWorkspaceContentRegion and Tier L Intelligence shell classes', () => {
		expect(pageSource).toContain('CaseWorkspaceContentRegion');
		expect(pageSource).toContain('testId="case-intelligence-page"');
		expect(pageSource).toContain('ce-l-intelligence-shell');
		expect(pageSource).toContain('ce-l-intelligence-primary-scroll');
		expect(pageSource).toContain('max-w-7xl');
		expect(pageSource).toContain('data-testid="case-intelligence-primary-scroll"');
		expect(pageSource).toContain('ce-l-intelligence-intro');
		expect(pageSource).toContain('ce-l-intelligence-segmented');
	});

	it('demotes workspace mode control: segmented group + smaller tab labels (not primary strip scale)', () => {
		expect(pageSource).toContain('ce-l-intelligence-segmented');
		expect(pageSource).toMatch(/text-xs font-medium/);
		expect(pageSource).not.toMatch(/ce-l-tab-link/);
	});

	it('uses a single route scroll slot (no duplicate page flex-1 overflow-auto root)', () => {
		expect(pageSource).not.toMatch(/class="flex-1 min-h-0 overflow-auto/);
	});
});
