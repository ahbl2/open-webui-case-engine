/**
 * P95-05 — Cross-entry structure & spacing rhythm (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');
const surfacesPath = join(dirname(fileURLToPath(import.meta.url)), '../../styles/detectiveSurfaces.css');

describe('TimelineEntryCard P95-05 cross-entry consistency (source contract)', () => {
	it('uses ds-timeline-entry-history-panel for version history blocks (active + removed)', () => {
		const src = readFileSync(cardPath, 'utf8');
		const n = (src.match(/ds-timeline-entry-history-panel/g) || []).length;
		expect(n).toBeGreaterThanOrEqual(2);
		expect(src).not.toMatch(/mt-1 pt-2 border-t border-dashed border-amber-200/);
	});

	it('uses ds-timeline-entry-ai-row for the AI-assisted cleaned/original toggle row', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/ds-timeline-entry-ai-row/);
	});

	it('documents P95-05 margin rhythm (no double-stack with __main gap) in detectiveSurfaces.css', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toContain('P95-05');
		expect(css).toMatch(/\.ds-timeline-entry-row__main\s*\{[\s\S]*?gap:\s*var\(--ds-space-3\)/);
		expect(css).toMatch(
			/\.ds-timeline-entry-row \.ds-timeline-entry-inline-context\s*\{[\s\S]*?margin-top:\s*0/s
		);
		expect(css).toMatch(
			/\.ds-timeline-entry-row \.ds-timeline-entry-metadata-secondary\s*\{[\s\S]*?margin-top:\s*0/s
		);
		expect(css).toMatch(/\.ds-timeline-entry-row__footer\s*\{[\s\S]*?margin-top:\s*0/s);
	});

	it('preserves prior P95 structural hooks', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/ds-timeline-entry-body-block/);
		expect(src).toMatch(/ds-timeline-entry-inline-context/);
		expect(src).toMatch(/ds-timeline-entry-metadata-secondary/);
		expect(src).not.toMatch(/\bworkflow engine\b|\breminder\b.*\btask\b/i);
	});
});
