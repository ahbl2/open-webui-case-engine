/**
 * P76-07 — All case tab routes use `CaseWorkspaceContentRegion` under the governed shell (bounded `.ce-l-content-region`).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const caseRoutesDir = join(__dirname, '../../routes/(app)/case/[id]');

const caseTabPages = [
	'summary/+page.svelte',
	'timeline/+page.svelte',
	'files/+page.svelte',
	'intelligence/+page.svelte',
	'workflow/+page.svelte',
	'activity/+page.svelte',
	'chat/+page.svelte',
	'notes/+page.svelte',
	'proposals/+page.svelte',
	'warrants/+page.svelte',
	'graph/+page.svelte',
	'intelligence/entity/[type]/[value]/+page.svelte'
];

describe('case shell route migration (P76-07)', () => {
	it.each(caseTabPages)('%s uses CaseWorkspaceContentRegion', (rel) => {
		const src = readFileSync(join(caseRoutesDir, rel), 'utf8');
		expect(src).toContain('CaseWorkspaceContentRegion');
		expect(src).toContain('testId=');
	});

	it('case workspace layout does not nest a second case shell frame', () => {
		const layout = readFileSync(join(caseRoutesDir, '+layout.svelte'), 'utf8');
		const n = (layout.match(/data-testid="case-workspace-shell"/g) ?? []).length;
		expect(n).toBe(1);
	});
});
