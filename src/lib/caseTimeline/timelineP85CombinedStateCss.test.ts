/**
 * P85-06 — Combined P84 visual modifiers (flag + relate + follow-up) locked in CSS (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const surfacesPath = join(dirname(fileURLToPath(import.meta.url)), '../styles/detectiveSurfaces.css');

const TRIPLE_CARD =
	'.ds-card.ds-timeline-entry-card--review-flagged.ds-timeline-entry-card--relationship-paired.ds-timeline-entry-card--followup-marked';

describe('P85-06 detectiveSurfaces triple-combined timeline card states', () => {
	it('defines active-row light + dark + removed rules for all three P84 modifiers together', () => {
		const css = readFileSync(surfacesPath, 'utf8');
		const rowOrEmbedded = ':is(.ds-timeline-entry-row, .ds-timeline-entry-embedded-shell)';
		expect(css).toContain(`${rowOrEmbedded} ${TRIPLE_CARD}`);
		expect(css).toContain(`html.dark ${rowOrEmbedded} ${TRIPLE_CARD}`);
		expect(css).toContain(`.ds-timeline-entry-row--removed ${TRIPLE_CARD}`);
	});
});
