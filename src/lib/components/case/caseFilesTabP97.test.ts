/**
 * P97-03 / P97-05 — CaseFilesTab static checks for supporting synthesis reveal wiring and hardening.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const tabPath = join(here, 'CaseFilesTab.svelte');

describe('CaseFilesTab.svelte (P97-03)', () => {
	const src = readFileSync(tabPath, 'utf8');

	it('wires supporting synthesis navigation when enabled', () => {
		expect(src).toContain('synthesisNavigationEnabled');
		expect(src).toContain('pickSupportingFilesTargetId');
		expect(src).toContain('runRevealSequenceForSynthesisFiles');
		expect(src).toContain('data-testid="synthesis-files-reveal-not-found"');
		expect(src).toContain('ds-p97-synthesis-nav-reveal');
		expect(src).toContain('scheduleStaleSynthesisIntentClear');
		expect(src).toContain('parseFilesSourceKindFromIntent');
		expect(src).toContain('P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS');
	});

	it('does not use searchParams for synthesis target', () => {
		expect(src).not.toMatch(/searchParams.*synthesis/i);
	});
});
