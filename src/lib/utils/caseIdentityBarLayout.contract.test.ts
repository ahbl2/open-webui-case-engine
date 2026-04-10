/**
 * P71-03 — Case identity bar layout contract (P70-04 §2).
 * Source-based checks: identity bar is centralized in case +layout; tab strip is separate.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const layoutSource = readFileSync(layoutPath, 'utf8');

describe('case identity bar layout (P71-03 / P70-04)', () => {
	it('uses Tier L identity bar hooks and test ids for shell states', () => {
		expect(layoutSource).toContain('ce-l-identity-bar');
		expect(layoutSource).toContain('data-testid="case-identity-bar"');
		expect(layoutSource).toContain('data-testid="case-shell-loaded"');
		expect(layoutSource).toContain('data-testid="case-shell-loading"');
		expect(layoutSource).toContain('data-testid="case-shell-load-error"');
	});

	it('keeps Edit Case as a global identity action (P70-04 §2.3)', () => {
		expect(layoutSource).toContain('Edit Case');
		expect(layoutSource).toContain('ce-l-identity-edit');
	});

	it('closes the identity header before the primary tab nav (no tab strip in the identity bar)', () => {
		const headerClose = layoutSource.indexOf('</header>');
		const navOpen = layoutSource.indexOf('data-testid="case-workspace-nav"');
		expect(headerClose).toBeGreaterThan(-1);
		expect(navOpen).toBeGreaterThan(-1);
		expect(headerClose).toBeLessThan(navOpen);
	});

	it('responsive collapse: unit from sm, incident from md (P70-04 §2.4)', () => {
		expect(layoutSource).toContain('ce-l-identity-meta-chip hidden sm:inline-flex');
		expect(layoutSource).toContain('{#if $activeCaseMeta.incident_date}');
		expect(layoutSource).toContain('md:inline-flex');
	});

	it('exposes case title tooltip for truncated titles', () => {
		expect(layoutSource).toContain('title={$activeCaseMeta.title}');
	});
});
