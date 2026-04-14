/**
 * P124-02 — Timeline metadata labels: static copy + TimelineEntryCard wiring only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const labelsPath = join(__dirname, 'p124TimelineMetadataLabels.ts');
const cardPath = join(__dirname, '../components/case/TimelineEntryCard.svelte');

describe('P124-02 timeline metadata labels', () => {
	it('labels module has no storage and uses definitional phrasing only', () => {
		const src = readFileSync(labelsPath, 'utf8');
		expect(src).toMatch(/P124_TIMELINE_LABEL_EVENT_OCCURRED/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\bAI\b|\binference\b|\bsummary\b/i);
	});

	it('TimelineEntryCard imports P124 labels (no $page.params.id)', () => {
		const src = readFileSync(cardPath, 'utf8');
		expect(src).toContain('p124TimelineMetadataLabels');
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});
});
