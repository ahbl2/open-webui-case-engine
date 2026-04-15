/**
 * P131-02 — Command Center case list: GET-only, no mutation routes in module surface.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = join(here, 'commandCenterCases.ts');
const listPath = join(here, '../components/operator/CommandCenterCaseList.svelte');
const panelPath = join(here, '../components/operator/CommandCenterPanel.svelte');

describe('P131-02 Command Center case list guardrails (source)', () => {
	it('commandCenterCases imports listCases + listCaseTimelineEntriesPage only (GET)', () => {
		const src = readFileSync(modulePath, 'utf8');
		expect(src).toMatch(/listCases/);
		expect(src).toMatch(/listCaseTimelineEntriesPage/);
		expect(src).not.toMatch(/method:\s*['"]POST['"]/i);
		expect(src).not.toMatch(/method:\s*['"]DELETE['"]/i);
		expect(src).not.toMatch(/softDeleteTimelineEntry|restoreTimelineEntry/);
	});

	it('CommandCenterCaseList uses guarded navigation (no fetch in component)', () => {
		const src = readFileSync(listPath, 'utf8');
		expect(src).toContain('navigateCommandCenterToCaseWorkspace');

		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
		expect(src).not.toMatch(/ds-badge|DS_BADGE/);
	});

	it('CommandCenterPanel does not import Case Engine directly', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
	});
});
