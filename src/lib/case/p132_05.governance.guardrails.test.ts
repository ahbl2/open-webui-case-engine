/**
 * P132-05 — Governance surface must not implement RBAC in the UI or expose access-denied messaging.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const operatorDir = join(here, '../components/operator');
const gnavPath = join(here, '../components/layout/DetectiveGnavPrimaryNav.svelte');

function read(p: string): string {
	return readFileSync(p, 'utf8');
}

describe('P132-05 Governance guardrails (source)', () => {
	it('governance data module is GET-only toward Case Engine', () => {
		const src = read(join(here, 'governance.ts'));
		expect(src).toContain("method: 'GET'");
		expect(src).not.toMatch(/\bPOST\b/);
	});

	it('GovernancePanel: no role checks, no access-denied language', () => {
		const src = read(join(operatorDir, 'GovernancePanel.svelte'));
		expect(src).not.toMatch(/\bcaseEngineUser\s*\.\s*role\b/);
		expect(src).not.toMatch(/\buser\s*\.\s*role\b/);
		expect(src).not.toMatch(/access\s+denied/i);
		expect(src).not.toMatch(/forbidden/i);
		expect(src).not.toMatch(/unauthorized/i);
		expect(src).not.toMatch(/not\s+allowed/i);
	});

	it('GovernancePanel: read-only (no edit/action/bulk patterns)', () => {
		const src = read(join(operatorDir, 'GovernancePanel.svelte'));
		expect(src).not.toMatch(/\btype="\s*submit\s*"/);
		expect(src).not.toMatch(/<button\b/);
		expect(src).not.toMatch(/contenteditable/i);
	});

	it('GNAV Governance link is server-gated (href present; no role-based if)', () => {
		const src = read(gnavPath);
		expect(src).toContain('href="/governance"');
		expect(src).toContain('data-testid="detective-gnav-governance"');
		expect(src).toContain('$governanceNavEligible === true');
		expect(src).not.toMatch(/\bcaseEngineUser\s*\.\s*role\b/);
	});
});
