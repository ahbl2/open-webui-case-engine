/**
 * P76-06 — Case shell optional context band (CASE_WORKSPACE_SHELL_SPEC §Case-level quick actions / indicators).
 * P82-02 — Context band markup lives in `CaseWorkspaceHeader.svelte` (below identity), not between nav and body.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const headerPath = join(__dirname, '../components/case/CaseWorkspaceHeader.svelte');
const layoutSource = readFileSync(layoutPath, 'utf8');
const headerSource = readFileSync(headerPath, 'utf8');

describe('case shell context band (P76-06)', () => {
	it('declares optional context band in CaseWorkspaceHeader before main workspace body in layout', () => {
		const bandIdx = headerSource.indexOf('data-testid="case-shell-context-band"');
		const bodyIdx = layoutSource.indexOf("'case-shell-body'");
		const navIdx = layoutSource.indexOf('<CaseWorkspaceNav');
		expect(bandIdx).toBeGreaterThan(-1);
		expect(bodyIdx).toBeGreaterThan(-1);
		expect(navIdx).toBeGreaterThan(-1);
		expect(headerSource.indexOf('data-testid="case-workspace-header"')).toBeLessThan(bandIdx);
		expect(layoutSource.indexOf('<CaseWorkspaceHeader')).toBeLessThan(navIdx);
		expect(navIdx).toBeLessThan(bodyIdx);
	});

	it('links to proposals tab without inventing metrics in markup', () => {
		expect(layoutSource).toContain('listProposalsPaginated');
		expect(headerSource).toContain('case-shell-context-band-pending-proposals');
		expect(headerSource).toContain('/proposals`}');
	});

	it('adds rail framing class alongside existing context rail', () => {
		expect(layoutSource).toContain('DS_CASE_SHELL_CLASSES.rail');
		expect(layoutSource).toContain('data-testid="case-context-rail"');
	});
});
