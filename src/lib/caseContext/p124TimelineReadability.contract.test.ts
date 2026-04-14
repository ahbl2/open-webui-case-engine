/**
 * P124-03 — Timeline layout/readability: presentation-only; no new list semantics.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagePath = join(__dirname, '../../routes/(app)/case/[id]/timeline/+page.svelte');
const surfacesCss = join(__dirname, '../styles/detectiveSurfaces.css');

describe('P124-03 timeline readability (contract)', () => {
	it('timeline page keeps authority framing above hero and shell hooks; no $page.params.id', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src.indexOf('CaseTimelineAuthorityFraming')).toBeLessThan(src.indexOf('ce-l-timeline-hero'));
		expect(src).toContain('ce-l-timeline-hero-title');
		expect(src).toContain('CaseTimelineAuthorityFraming');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});

	it('DS timeline surfaces document P124-03 spacing (presentation-only)', () => {
		const css = readFileSync(surfacesCss, 'utf8');
		expect(css).toMatch(/P124-03/);
	});
});
