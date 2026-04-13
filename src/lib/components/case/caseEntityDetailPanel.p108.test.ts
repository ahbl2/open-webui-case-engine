/**
 * P108-01 — Entity detail → timeline lens entry (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseEntityDetailPanel.svelte');

describe('CaseEntityDetailPanel.svelte (P108-01)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('exposes read-only navigation to timeline and files with entityLens query (no fetch in template)', () => {
		expect(src).toContain('p108EntityTimelineLensCopy');
		expect(src).toContain('P108_ENTITY_TIMELINE_LENS_VIEW_ACTION');
		expect(src).toContain('P108_ENTITY_FILES_LENS_VIEW_ACTION');
		expect(src).toContain('data-testid="case-entity-detail--view-timeline-lens"');
		expect(src).toContain('data-testid="case-entity-detail--view-files-lens"');
		expect(src).toContain('/timeline?entityLens=');
		expect(src).toContain('/files?entityLens=');
		expect(src).not.toContain('fetch(');
	});
});
