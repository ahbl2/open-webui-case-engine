/**
 * P103-05 — Surfaces import shared citation navigation operator copy (static).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const roots = [
	join(here, '../../routes/(app)/case/[id]/timeline/+page.svelte'),
	join(here, '../components/case/CaseTasksPanel.svelte'),
	join(here, '../components/case/CaseFilesTab.svelte')
];

describe('P103 surfaces (operator copy)', () => {
	for (const p of roots) {
		it(`${p.split('/').slice(-2).join('/')}`, () => {
			const src = readFileSync(p, 'utf8');
			expect(src).toContain("from '$lib/case/p103NavigationOperatorCopy'");
		});
	}
});
