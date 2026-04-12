/**
 * P97-01 — Synthesis panel: read-only source navigation contract wiring (static source inspection).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseSynthesisReadModelPanel.svelte');

describe('CaseSynthesisReadModelPanel.svelte (P97-01)', () => {
	const panelSrc = readFileSync(panelPath, 'utf8');

	it('wires the P97-01 navigation contract module', () => {
		expect(panelSrc).toContain("from '$lib/case/caseSynthesisSourceNavigation'");
		expect(panelSrc).toContain('intentFromTimelineFact');
		expect(panelSrc).toContain('intentFromSupportingContextItem');
		expect(panelSrc).toContain('navigateToSynthesisSource');
		expect(panelSrc).toContain('emitSynthesisSourceNavigate');
	});

	it('exposes deterministic navigation hooks (authoritative vs supporting)', () => {
		expect(panelSrc).toContain('data-testid="synthesis-timeline-fact-nav"');
		expect(panelSrc).toContain('data-testid="synthesis-supporting-nav"');
		expect(panelSrc).toContain('data-testid="synthesis-nav-to-source"');
		expect(panelSrc).toContain('data-synthesis-source-authority="authoritative"');
		expect(panelSrc).toContain('data-synthesis-source-authority="supporting"');
		expect(panelSrc).toContain('data-synthesis-source-record-id=');
	});

	it('frames gap linked-refs as not typed for automated navigation', () => {
		expect(panelSrc).toContain('data-testid="synthesis-gap-refs-nav-unavailable"');
	});

	it('does not add client storage persistence for navigation in this panel', () => {
		expect(panelSrc).not.toMatch(/localStorage\.|sessionStorage\./);
	});

	it('does not add URL query/hash routing for synthesis targets in this panel', () => {
		expect(panelSrc).not.toMatch(/\$page\.url\.searchParams/);
		expect(panelSrc).not.toMatch(/searchParams\.(get|set)\(/);
	});
});
