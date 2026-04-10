/**
 * P68-07 — Transitional cleanup: registry-first authority, Stage 1 mirror, direct-create follow-through.
 * P69-07 — registry blurbs live on EntitiesRegistryPanel instances inside the board shell.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');
const shellSource = readFileSync(
	join(__dirname, '..', '..', '..', '..', '..', 'lib', 'components', 'case', 'EntitiesOverviewBoardShell.svelte'),
	'utf8'
);

describe('intelligence/+page P68-07 workflow polish', () => {
	it('page intro states Stage 1 is not the default manual register path', () => {
		expect(pageSource).toMatch(/not[\s\S]{0,24}the default manual register path/);
		expect(pageSource).toContain('committed registries');
	});

	it('direct-create success ties detail to highlighted registry row and scrolls row into view', () => {
		expect(pageSource).toContain('Detail opened — the new row is highlighted');
		expect(pageSource).toContain('scrollCreatedEntityRowIntoView');
		expect(pageSource).toContain('registryRowTestIdPrefix');
	});

	it('registry panel blurbs stay short and registry-centric (no repeated Stage 1 promote line)', () => {
		expect(shellSource).toContain('Committed people — Case Engine registry; Add registers directly.');
		expect(pageSource).not.toContain('promote a Stage&nbsp;1 staging proposal');
	});

	it('workflow path keeps Register vs staging honest without implying Stage 1 is required for manual commit', () => {
		expect(pageSource).toContain('Register');
		expect(pageSource).toMatch(/stage|staging/i);
		expect(pageSource).not.toMatch(/manual\s+committed[^\n]{0,80}Stage\s*1\s+only/i);
	});

	it('intelligence alerts copy points to Entities registries first', () => {
		expect(pageSource).toContain('registries first');
	});
});
