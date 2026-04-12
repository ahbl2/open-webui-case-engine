/**
 * P95-03 — Timeline inline context (linked files + provenance) visibility (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');

describe('TimelineEntryCard P95-03 inline context (source contract)', () => {
	it('groups linked images and provenance in a dedicated strip with stable test ids', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/showInlineContextBlock/);
		expect(src).toMatch(/data-testid="timeline-entry-inline-context"/);
		expect(src).toMatch(/data-testid="timeline-entry-linked-files-row"/);
		expect(src).toMatch(/data-testid="timeline-entry-context-origin"/);
		expect(src).toMatch(/ds-timeline-entry-inline-context/);
	});

	it('keeps linked-images trigger with explicit label and viewer wiring', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('TIMELINE_CONTEXT_LABEL_LINKED_IMAGES');
		expect(src).toMatch(/data-testid="timeline-entry-linked-images-trigger"/);
		expect(src).toMatch(/linkedImagesViewerOpen = true/);
		expect(src).toMatch(/TimelineEntryLinkedImagesViewer/);
	});

	it('keeps TimelineEntryProvenanceBlock nested under the context-origin wrapper', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(
			/data-testid="timeline-entry-context-origin"[\s\S]{0,1200}?\n\s*<TimelineEntryProvenanceBlock/s
		);
	});

	it('does not introduce workflow/task automation wording in new labels', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/\bworkflow engine\b|\bassigned to\b|\bdue date\b|\bstatus:\s*task\b/i);
	});
});
