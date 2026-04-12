import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const _dir = dirname(fileURLToPath(import.meta.url));

describe('P97-04 wiring (static)', () => {
	it('Timeline page passes context preview into TimelineEntryCard', () => {
		const src = readFileSync(join(_dir, '../../../routes/(app)/case/[id]/timeline/+page.svelte'), 'utf8');
		expect(src).toContain('synthesisNavigationContextPreview=');
		expect(src).toContain('buildAuthoritativeTimelineContextPreview');
	});

	it('CaseTasksPanel renders SynthesisNavigationContextPreview for supporting tasks', () => {
		const src = readFileSync(join(_dir, 'CaseTasksPanel.svelte'), 'utf8');
		expect(src).toContain('SynthesisNavigationContextPreview');
		expect(src).toContain('buildSupportingTaskContextPreview');
		expect(src).toContain('synthesisHighlightId === task.id && synthesisContextPreview');
	});

	it('CaseFilesTab gates file preview on synthesisNavigationEnabled', () => {
		const src = readFileSync(join(_dir, 'CaseFilesTab.svelte'), 'utf8');
		expect(src).toContain('synthesisNavigationEnabled && synthesisHighlightId === f.id && synthesisContextPreview');
		expect(src).toContain('buildSupportingFileContextPreview');
	});

	it('preview module does not reference forbidden persistence keys', () => {
		const src = readFileSync(join(_dir, '../../case/synthesisNavigationContextPreview.ts'), 'utf8');
		expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|location\.search|URLSearchParams/);
	});
});
