/**
 * P95-04 — Timeline card interaction polish (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');
const surfacesPath = join(dirname(fileURLToPath(import.meta.url)), '../../styles/detectiveSurfaces.css');
const provenancePath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryProvenanceBlock.svelte');

describe('TimelineEntryCard P95-04 interaction polish (source contract)', () => {
	it('uses shared classes for menu, body/text toggles, edited control, and linked-images trigger', () => {
		const src = readFileSync(cardPath, 'utf8');
		const menu = src.match(/ds-timeline-entry-actions-menu-btn/g);
		expect(menu?.length).toBe(2);
		expect(src).toMatch(/ds-timeline-entry-body-toggle/);
		expect(src).toMatch(/ds-timeline-entry-text-toggle/);
		expect(src).toMatch(/ds-timeline-entry-edited-toggle/);
		expect(src).toMatch(/ds-timeline-entry-linked-images-trigger/);
		expect(src).not.toMatch(/p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700/);
	});

	it('documents P95-04 focus-visible and hit-target rules in detectiveSurfaces.css', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toContain('P95-04');
		expect(css).toMatch(/\.ds-timeline-entry-actions-menu-btn:focus-visible/);
		expect(css).toMatch(/button\.ds-timeline-entry-linked-images-trigger:focus-visible/);
		expect(css).toMatch(/button\.ds-timeline-entry-body-toggle:focus-visible/);
		expect(css).toMatch(/\.ds-timeline-entry-edited-toggle:focus-visible/);
	});

	it('does not add new actions or workflow semantics', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/\bassignee\b|\bdeadline\b|\bworkflow state\b/i);
	});
});

describe('TimelineEntryProvenanceBlock P95-04 provenance summary/link focus', () => {
	it('adds interaction classes for summary and files link', () => {
		const src = readFileSync(provenancePath, 'utf8');
		expect(src).toMatch(/ds-timeline-entry-provenance-summary/);
		expect(src).toMatch(/ds-timeline-entry-provenance-files-link/);
	});
});
