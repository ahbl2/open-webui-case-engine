/**
 * P131-01 — Command Center surface: no Case Engine, no fetch, no mutation paths (source-level).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, '../components/operator/CommandCenterPanel.svelte');
const pagePath = join(here, '../../routes/(app)/command-center/+page.ts');
const copyPath = join(here, 'p131CommandCenterCopy.ts');
const gnavPath = join(here, '../components/layout/DetectiveGnavPrimaryNav.svelte');

describe('P131-01 Command Center guardrails (source)', () => {
	it('legacy route redirects to Home without data access', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain("redirect(308, '/home')");
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
		expect(src).not.toMatch(/\bfetch\s*\(/);
		expect(src).not.toMatch(/\$app\/environment/);
	});

	it('CommandCenterPanel does not import Case Engine APIs directly (uses Command Center modules)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
	});

	it('copy module is strings only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).not.toMatch(/\$lib\/apis/);
		expect(src).not.toMatch(/\bfetch\s*\(/);
	});

	it('Command Center surface does not reference mutation HTTP paths', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\/case-proposals/);
		expect(src).not.toMatch(/\/entries/);
	});

	it('GNAV no longer exposes a standalone Command Center entry', () => {
		const src = readFileSync(gnavPath, 'utf8');
		expect(src).not.toContain('href="/command-center"');
		expect(src).not.toContain('data-testid="detective-gnav-command-center"');
	});
});
