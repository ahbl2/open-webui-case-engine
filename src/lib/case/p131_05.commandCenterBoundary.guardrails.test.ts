/**
 * P131-05 — Command Center boundary: GET-only data modules, no hidden navigation, no action UI.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const operatorDir = join(here, '../components/operator');

const DATA_MODULES = [
	join(here, 'commandCenterCases.ts'),
	join(here, 'commandCenterActivity.ts'),
	join(here, 'commandCenterWorkflow.ts'),
	join(here, 'commandCenterBundle.ts'),
	join(here, 'commandCenterSummary.ts'),
	join(here, 'commandCenterGuardrails.ts')
];

const COMMAND_CENTER_SVELTE = [
	join(operatorDir, 'CommandCenterCaseList.svelte'),
	join(operatorDir, 'CommandCenterActivityFeed.svelte'),
	join(operatorDir, 'CommandCenterWorkflowSnapshot.svelte'),
	join(operatorDir, 'CommandCenterPanel.svelte'),
	join(operatorDir, 'CommandCenterDashboardCard.svelte'),
	join(operatorDir, 'CommandCenterSummaryMetricCard.svelte'),
	join(operatorDir, 'CommandCenterDashboardIcon.svelte')
];

function read(p: string): string {
	return readFileSync(p, 'utf8');
}

describe('P131-05 Command Center boundary guardrails (source)', () => {
	it('data modules do not reference mutation HTTP verbs or obvious write APIs', () => {
		for (const p of DATA_MODULES) {
			const src = read(p);
			expect(src).not.toMatch(/\bmethod:\s*['"]POST['"]/i);
			expect(src).not.toMatch(/\bmethod:\s*['"]PUT['"]/i);
			expect(src).not.toMatch(/\bmethod:\s*['"]PATCH['"]/i);
			expect(src).not.toMatch(/\bmethod:\s*['"]DELETE['"]/i);
			expect(src).not.toMatch(
				/createCaseWorkflowItem|updateCaseWorkflowItem|createProposal|commitProposal|approveProposal|softDeleteTimelineEntry/
			);
			expect(src).not.toMatch(/\$lib\/.*\b(ai|openai)\b/i);
		}
	});

	it('commandCenterGuardrails.ts does not import Case Engine APIs', () => {
		const src = read(join(here, 'commandCenterGuardrails.ts'));
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
	});

	it('Command Center Svelte surfaces use guarded navigation only (no raw /case/ template)', () => {
		for (const p of COMMAND_CENTER_SVELTE) {
			const src = read(p);
			expect(src).not.toMatch(/goto\s*\(\s*[`'"]\/case\/\$\{/);
			if (src.includes('goto')) {
				expect(src).toContain('navigateCommandCenterToCaseWorkspace');
			}
		}
	});

	it('Command Center components: no onMount, no timers, no reactive goto', () => {
		for (const p of COMMAND_CENTER_SVELTE) {
			const src = read(p);
			expect(src).not.toMatch(/\bonMount\b/);
			expect(src).not.toMatch(/\bsetTimeout\b|\bsetInterval\b/);
			const lines = src.split('\n');
			for (const line of lines) {
				if (line.includes('$:') && line.includes('goto')) {
					throw new Error(`Disallowed reactive goto in ${p}: ${line.trim()}`);
				}
			}
		}
	});

	it('Command Center components: no action affordances (create/edit/bulk/menu)', () => {
		for (const p of COMMAND_CENTER_SVELTE) {
			const src = read(p);
			expect(src).not.toMatch(/ds-badge|DS_BADGE/);
			expect(src).not.toMatch(/\btype="submit"\b/);
			expect(src).not.toMatch(/Create case|Edit case|Bulk action|Action menu/i);
		}
	});

	it('CommandCenterPanel marks read-only surface', () => {
		const src = read(join(operatorDir, 'CommandCenterPanel.svelte'));
		expect(src).toContain('data-p131-command-center-readonly="true"');
	});

	it('ordering markers remain documented in commandCenterGuardrails', () => {
		const src = read(join(here, 'commandCenterGuardrails.ts'));
		expect(src).toContain('COMMAND_CENTER_ORDERING_CASE_LIST');
		expect(src).toContain('COMMAND_CENTER_ORDERING_ACTIVITY');
		expect(src).toContain('COMMAND_CENTER_ORDERING_WORKFLOW');
	});
});
