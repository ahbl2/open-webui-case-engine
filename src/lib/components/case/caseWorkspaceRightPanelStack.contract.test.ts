/**
 * P132.5-03 — `CaseWorkspaceRightPanelStack`: internal tabs only; composition reuses route surfaces.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stackPath = join(__dirname, 'CaseWorkspaceRightPanelStack.svelte');

describe('CaseWorkspaceRightPanelStack P132.5-03', () => {
	it('does not introduce routing, page stores, or direct Case Engine API imports', () => {
		const src = readFileSync(stackPath, 'utf8');
		expect(src).not.toMatch(/\$app\/navigation/);
		expect(src).not.toMatch(/\bgoto\b/);
		expect(src).not.toMatch(/\bpage\s+from\s+['"]\$app\/stores['"]/);
		expect(src).not.toMatch(/getCaseById/);
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine\b/);
	});

	it('defaults to Activity and exposes tab list + surface embeds', () => {
		const src = readFileSync(stackPath, 'utf8');
		expect(src).toMatch(/let selected:\s*RightStackTab\s*=\s*'activity'/);
		expect(src).toMatch(/data-testid="case-workspace-right-panel-stack"/);
		expect(src).toMatch(/role="tablist"/);
		expect(src).toMatch(/<CaseActivityList/);
		expect(src).toMatch(/<AIWorkspacePanel/);
		expect(src).toMatch(/<ProposalReviewPanel/);
	});

	it('P132.5-05 — tab list uses DS rail chrome + optional tab icons (no routing)', () => {
		const src = readFileSync(stackPath, 'utf8');
		expect(src).toMatch(/DS_WORKSPACE_SHELL_CLASSES\.rightStackTablist/);
		expect(src).toMatch(/P1325RightStackTabIcon/);
	});

	it('uses compact proposals layout for the constrained rail', () => {
		const src = readFileSync(stackPath, 'utf8');
		expect(src).toMatch(/layout="compact"/);
	});
});
