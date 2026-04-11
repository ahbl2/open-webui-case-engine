/**
 * P78-11 — Phone registry placeholder: honest limitation + supported Intelligence search path.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const panelSource = readFileSync(join(__dirname, 'EntitiesRegistryPanel.svelte'), 'utf8');
const shellSource = readFileSync(join(__dirname, 'EntitiesOverviewBoardShell.svelte'), 'utf8');

describe('EntitiesRegistryPanel (P78-11 phone action-path clarity)', () => {
	it('states board-level phone focus is not available from the placeholder', () => {
		expect(panelSource).toContain('data-testid="{testId}-phone-action-path"');
		expect(panelSource).toContain('You cannot start phone focus');
		expect(panelSource).toContain('Why this is empty:');
	});

	it('directs users to Intelligence mode search for supported phone evidence focus', () => {
		expect(panelSource).toContain('Intelligence');
		expect(panelSource).toContain('entity evidence focus');
		expect(panelSource).toContain('Phone investigation — what works today');
	});

	it('does not use misleading Open Entity Focus heading in the phone placeholder block', () => {
		const placeholderStart = panelSource.indexOf('{#if isPlaceholder}');
		const placeholderEnd = panelSource.indexOf('{:else if loadError}', placeholderStart);
		const block = panelSource.slice(placeholderStart, placeholderEnd);
		expect(block).not.toMatch(/Open Entity Focus/i);
	});
});

describe('EntitiesOverviewBoardShell (P78-11 phone subheader)', () => {
	it('contrasts placeholder column with Intelligence mode search', () => {
		expect(shellSource).toContain('Placeholder — no committed phone list here yet');
		expect(shellSource).toContain('Intelligence mode search');
	});
});
