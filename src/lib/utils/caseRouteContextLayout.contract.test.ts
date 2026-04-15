/**
 * P123-03 — Case workspace layout uses explicit route-derived case id (no implicit globals for API scope).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');

describe('case route context layout (P123-03)', () => {
	it('imports getRouteCaseId and derives routeCaseId for header and export panel', () => {
		const src = readFileSync(layoutPath, 'utf8');
		expect(src).toContain("from '$lib/caseContext/routeCaseContext'");
		expect(src).toContain('getRouteCaseId');
		expect(src).toContain('$: routeCaseId = getRouteCaseId($page.params)');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});
