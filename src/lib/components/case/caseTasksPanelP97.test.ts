/**
 * P97-03 / P97-05 — CaseTasksPanel static checks for supporting synthesis reveal wiring and hardening.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseTasksPanel.svelte');

describe('CaseTasksPanel.svelte (P97-03)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('wires supporting synthesis navigation for Tasks surface', () => {
		expect(src).toContain('pickSupportingTaskTargetId');
		expect(src).toContain('runRevealSequenceForSynthesisTasks');
		expect(src).toContain('ce-case-task-');
		expect(src).toContain('ds-p97-synthesis-nav-reveal');
		expect(src).toContain('data-testid="synthesis-tasks-reveal-not-found"');
		expect(src).toContain('scheduleStaleSynthesisIntentClear');
		expect(src).toContain('P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS');
	});

	it('does not add URL searchParams for synthesis', () => {
		expect(src).not.toMatch(/\$page\.url\.searchParams/);
	});
});
