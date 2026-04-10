/**
 * P76-06 — Case shell optional context band (CASE_WORKSPACE_SHELL_SPEC §Case-level quick actions / indicators).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const layoutSource = readFileSync(layoutPath, 'utf8');

describe('case shell context band (P76-06)', () => {
	it('declares optional context band after primary tab nav and before page workspace body', () => {
		const navIdx = layoutSource.indexOf('data-testid="case-workspace-nav"');
		const bandIdx = layoutSource.indexOf('data-testid="case-shell-context-band"');
		const bodyIdx = layoutSource.indexOf("'case-shell-body'");
		expect(navIdx).toBeGreaterThan(-1);
		expect(bandIdx).toBeGreaterThan(-1);
		expect(bodyIdx).toBeGreaterThan(-1);
		expect(navIdx).toBeLessThan(bandIdx);
		expect(bandIdx).toBeLessThan(bodyIdx);
	});

	it('links to proposals tab without inventing metrics in markup', () => {
		expect(layoutSource).toContain('listProposalsPaginated');
		expect(layoutSource).toContain('case-shell-context-band-pending-proposals');
		expect(layoutSource).toContain('/proposals`}');
	});

	it('adds rail framing class alongside existing context rail', () => {
		expect(layoutSource).toContain('DS_CASE_SHELL_CLASSES.rail');
		expect(layoutSource).toContain('data-testid="case-context-rail"');
	});
});
