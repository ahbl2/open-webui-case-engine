/**
 * P85-04 — Visual consistency & token enforcement (Timeline + detectiveSurfaces; source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const surfacesPath = join(dirname(fileURLToPath(import.meta.url)), '../styles/detectiveSurfaces.css');
const pagePath = join(
	dirname(fileURLToPath(import.meta.url)),
	'../../routes/(app)/case/[id]/timeline/+page.svelte'
);

describe('P85-04 timeline list vertical rhythm (+page)', () => {
	it('uses a single gap class for the chronological entry list (gap-3)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/<ol class="flex flex-col gap-3"[^>]*aria-label="Official case timeline"/);
	});
});

describe('P85-04 detectiveSurfaces timeline entry tokens', () => {
	it('keeps main column rhythm on DS token gap (--ds-space-3)', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toMatch(/\.ds-timeline-entry-row__main\s*\{[^}]*gap:\s*var\(--ds-space-3\)/s);
	});

	it('keeps top row + ops toolbar gaps on DS tokens', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toMatch(/\.ds-timeline-entry-row__top\s*\{[^}]*gap:\s*var\(--ds-space-2\)\s*var\(--ds-space-3\)/s);
		expect(css).toMatch(/\.ds-timeline-entry-row__top-actions\s*\{[^}]*gap:\s*var\(--ds-space-2\)/s);
	});

	it('expresses hairline spacing from the scale (half of --ds-space-1)', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toMatch(
			/\.ds-timeline-entry-row__top-actions\s*\{[^}]*padding-top:\s*calc\(var\(--ds-space-1\)\s*\/\s*2\)/s
		);
		expect(css).toMatch(
			/\.ds-timeline-search-mark\s*\{[^}]*padding:\s*0 calc\(var\(--ds-space-1\)\s*\/\s*2\)/s
		);
	});

	it('keeps timeline card padding on DS token (--ds-space-4)', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toMatch(/\.ds-timeline-entry-row \.ds-card\s*\{[^}]*padding:\s*var\(--ds-space-4\)/s);
	});
});
