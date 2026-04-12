/**
 * P84-03 — Timeline entry relate affordance: source contracts (mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const cardPath = join(dirname(fileURLToPath(import.meta.url)), 'TimelineEntryCard.svelte');
const surfacesPath = join(dirname(fileURLToPath(import.meta.url)), '../../styles/detectiveSurfaces.css');

describe('TimelineEntryCard P84-03 relate affordance (source contract)', () => {
	it('exposes parent-driven pairing props and a single relate control per row (×2 branches)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toMatch(/export let relationshipPendingId/);
		expect(src).toMatch(/export let relationshipPair/);
		expect(src).toMatch(/export let onRelateClick/);
		expect(src).toMatch(/relatePaired/);
		const toggles = src.match(/data-testid="timeline-entry-relate-toggle"/g);
		expect(toggles?.length).toBe(2);
	});

	it('uses non-authoritative title and required aria labels', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('TIMELINE_OPS_TITLE_RELATE');
		expect(src).toContain('Visual link between two entries');
		expect(src).toContain('Not saved (session only)');
		expect(src).toContain('Select for relationship');
		expect(src).toContain('Relate to selected entry');
		expect(src).toContain('Clear relationship');
		expect(src).toMatch(/aria-pressed=\{relateAriaPressed\}/);
	});

	it('documents relationship visuals in detectiveSurfaces.css (subordinate to flag)', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		expect(css).toContain('P84-03');
		expect(css).toContain('.ds-timeline-entry-card--relationship-paired');
		expect(css).toContain('.ds-timeline-entry-relate-toggle--pending');
	});

	it('does not add persistence or fetch for relate', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
		expect(src).not.toMatch(/fetch\s*\(/);
	});
});
