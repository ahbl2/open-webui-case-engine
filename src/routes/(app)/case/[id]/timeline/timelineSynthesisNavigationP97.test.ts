/**
 * P97-02 / P97-05 — Timeline route: static checks for synthesis reveal wiring and hardening.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const pagePath = join(here, '+page.svelte');

describe('timeline +page.svelte (P97-02 synthesis reveal)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('consumes synthesisSourceNavigationIntent and Timeline target resolution', () => {
		expect(src).toContain('synthesisSourceNavigationIntent');
		expect(src).toContain('pickTimelineAuthoritativeTargetId');
		expect(src).toContain('runRevealSequence');
		expect(src).toContain('clearSynthesisNavState');
	});

	it('does not add URL searchParams wiring for synthesis navigation (P97-02 slice)', () => {
		expect(src).not.toMatch(/\$page\.url\.searchParams/);
	});

	it('wires ephemeral highlight and not-found feedback', () => {
		expect(src).toContain('synthesisNavigationReveal=');
		expect(src).toContain('data-testid="synthesis-timeline-reveal-not-found"');
		expect(src).toContain('ce-timeline-entry-');
		expect(src).toContain('scheduleStaleSynthesisIntentClear');
		expect(src).toContain('P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS');
	});
});
