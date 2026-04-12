import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const _dir = dirname(fileURLToPath(import.meta.url));

describe('P97-05 cross-surface hardening (static)', () => {
	it('surfaces use shared highlight duration constant (no literal 4500 in consumers)', () => {
		const timeline = readFileSync(
			join(_dir, '../../routes/(app)/case/[id]/timeline/+page.svelte'),
			'utf8'
		);
		const tasks = readFileSync(join(_dir, '../components/case/CaseTasksPanel.svelte'), 'utf8');
		const files = readFileSync(join(_dir, '../components/case/CaseFilesTab.svelte'), 'utf8');
		expect(timeline).toContain('P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS');
		expect(timeline).not.toMatch(/setTimeout\([^)]*\b4500\b/);
		expect(tasks).toContain('P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS');
		expect(tasks).not.toMatch(/setTimeout\([^)]*\b4500\b/);
		expect(files).toContain('P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS');
		expect(files).not.toMatch(/setTimeout\([^)]*\b4500\b/);
	});

	it('invalid intent clearing uses shared schedule helper on all surfaces', () => {
		const timeline = readFileSync(
			join(_dir, '../../routes/(app)/case/[id]/timeline/+page.svelte'),
			'utf8'
		);
		const tasks = readFileSync(join(_dir, '../components/case/CaseTasksPanel.svelte'), 'utf8');
		const files = readFileSync(join(_dir, '../components/case/CaseFilesTab.svelte'), 'utf8');
		expect(timeline).toContain('scheduleStaleSynthesisIntentClear');
		expect(tasks).toContain('scheduleStaleSynthesisIntentClear');
		expect(files).toContain('scheduleStaleSynthesisIntentClear');
	});

	it('shared module does not introduce forbidden persistence', () => {
		const src = readFileSync(join(_dir, 'synthesisNavigationP97Shared.ts'), 'utf8');
		expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|location\.search|URLSearchParams/);
	});
});
