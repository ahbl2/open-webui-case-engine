/**
 * P132-03 — Command Center must not implement RBAC or client-side security filtering.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const operatorDir = join(here, '../components/operator');

const TS = [
	join(here, 'commandCenterCases.ts'),
	join(here, 'commandCenterActivity.ts'),
	join(here, 'commandCenterWorkflow.ts'),
	join(here, 'commandCenterBundle.ts'),
	join(here, 'commandCenterSummary.ts'),
	join(here, 'commandCenterGuardrails.ts')
];

const SVELTE = [
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

describe('P132-03 Command Center RBAC guardrails (source)', () => {
	it('data modules: no role-based gating or client-side case filtering', () => {
		for (const p of TS) {
			const src = read(p);
			expect(src).not.toMatch(/\bcaseEngineUser\s*\.\s*role\b/);
			expect(src).not.toMatch(/\buser\s*\.\s*role\b/);
			expect(src).not.toMatch(/\.filter\s*\(\s*\(?\s*\w+\s*\)?\s*=>/);
		}
	});

	it('Command Center Svelte: no role checks, no access-denied copy, generic load error only', () => {
		for (const p of SVELTE) {
			const src = read(p);
			expect(src).not.toMatch(/\bcaseEngineUser\s*\.\s*role\b/);
			expect(src).not.toMatch(/\buser\s*\.\s*role\b/);
			expect(src).not.toMatch(/access\s+denied/i);
			expect(src).not.toMatch(/forbidden/i);
			expect(src).not.toMatch(/unauthorized/i);
			expect(src).not.toMatch(/not\s+allowed\s+to\s+view/i);
		}
	});

	it('Command Center surfaces use P132 generic load error (no raw Error.message in UI)', () => {
		for (const name of ['CommandCenterCaseList.svelte', 'CommandCenterActivityFeed.svelte', 'CommandCenterWorkflowSnapshot.svelte']) {
			const src = read(join(operatorDir, name));
			expect(src).toContain('P132_COMMAND_CENTER_GENERIC_LOAD_ERROR');
			expect(src).not.toMatch(/loadError\s*=\s*e\s+instanceof\s+Error/);
		}
	});
});
