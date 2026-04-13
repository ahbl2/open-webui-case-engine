/**
 * P103-02 — Timeline route wires P103 citation navigation consumption.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pagePath = join(here, '+page.svelte');

describe('timeline +page.svelte (P103-02 citation navigation)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('consumes p103CitationNavigationIntent before synthesis intent', () => {
		expect(src).toContain('p103CitationNavigationIntent');
		expect(src).toContain('isP103TimelineNavigationIntent');
		expect(src).toContain('isStaleP103NavigationIntentShape');
		expect(src.indexOf('P103-02 — citation navigation intent')).toBeLessThan(
			src.indexOf('P97-02 — consume synthesis navigation intent')
		);
	});

	it('does not add URL searchParams for P103 navigation', () => {
		expect(src).not.toMatch(/\$page\.url\.searchParams[^\n]*p103/i);
	});
});
