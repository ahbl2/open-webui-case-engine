/**
 * P95-01 — Timeline entry body: truncation + expand toggle (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');
const displayPath = join(
	dirname(fileURLToPath(import.meta.url)),
	'../../caseTimeline/timelineEntryBodyDisplay.ts'
);

describe('TimelineEntryCard P95-01 text preview & expansion (source contract)', () => {
	it('uses a single Tailwind line-clamp level for collapsed state (active + removed)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/class:line-clamp-5=\{showBodyClampToggle && !bodyExpanded\}/g);
		const matches = src.match(/class:line-clamp-5=\{showBodyClampToggle && !bodyExpanded\}/g);
		expect(matches?.length).toBe(2);
	});

	it('measures overflow with the same line-clamp class as the template (no body text truncation in JS)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain("el.classList.add(TIMELINE_ENTRY_BODY_LINE_CLAMP_TAILWIND, 'overflow-hidden')");
		expect(src).toContain("el.classList.remove(TIMELINE_ENTRY_BODY_LINE_CLAMP_TAILWIND, 'overflow-hidden')");
		expect(src).not.toMatch(/\bdisplayText\s*\.slice\b|\bbodyHighlightSegments\s*\.slice\b|truncateText\b/i);
	});

	it('exposes a body block wrapper for hierarchy + stable test hooks', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/data-testid="timeline-entry-body-block"/);
		expect(src).toMatch(/ds-timeline-entry-body-block/);
		expect(src).toMatch(/ds-timeline-entry-body-primary/);
		expect(src).toMatch(/ds-timeline-entry-body-toggle/);
	});

	it('keeps Show more / Show less copy and toggle test id', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain("'Show more'");
		expect(src).toContain("'Show less'");
		expect(src).toMatch(/timeline-entry-body-toggle/);
	});

	it('documents collapsed line count in timelineEntryBodyDisplay helper', () => {
		const src = readFileSync(displayPath, 'utf8');
		expect(src).toContain('TIMELINE_ENTRY_BODY_COLLAPSED_MAX_LINES');
		expect(src).toContain("'line-clamp-5'");
	});
});
