/**
 * P131-03 — Command Center activity feed: GET-only, no importance UI, no AI.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const activityTs = join(here, 'commandCenterActivity.ts');
const feedPath = join(here, '../components/operator/CommandCenterActivityFeed.svelte');

describe('P131-03 command center activity guardrails', () => {
	it('commandCenterActivity.ts only uses listCases + listCaseActivityEvents (GET)', () => {
		const src = readFileSync(activityTs, 'utf8');
		expect(src).toContain('listCaseActivityEvents');
		expect(src).toContain('listCases');
		expect(src).not.toMatch(/\bPOST\b|\bPUT\b|\bPATCH\b|\bDELETE\b/);
		expect(src).not.toMatch(/\$lib\/.*ai|\$lib\/.*openai/i);
	});

	it('CommandCenterActivityFeed has no fetch, no badge primitives, goto for case link only', () => {
		const src = readFileSync(feedPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/ds-badge|DS_BADGE/);
		expect(src).toContain('navigateCommandCenterToCaseWorkspace');
		expect(src).toContain('fetchCommandCenterActivityRows');
	});
});
