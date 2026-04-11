/**
 * P78-13 — Intelligence search result action hierarchy (drill-down before excerpt; structured primary action).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');

describe('Intelligence page (P78-13 search result action hierarchy)', () => {
	it('documents supporting evidence row order and places entity drill-down before excerpt', () => {
		expect(pageSource).toContain('data-testid="intelligence-supporting-evidence-action-hint"');
		expect(pageSource).toContain('data-testid="intelligence-supporting-evidence-primary-action"');
		expect(pageSource).toContain('evidence focus (drill-down) first');
	});

	it('places structured query Open source before excerpt as primary row action', () => {
		expect(pageSource).toContain('data-testid="intelligence-structured-open-source"');
		expect(pageSource).toContain('data-testid="intelligence-structured-result-row"');
		const rowStart = pageSource.indexOf('data-testid="intelligence-structured-result-row"');
		const rowSlice = pageSource.slice(rowStart, rowStart + 900);
		expect(rowSlice.indexOf('intelligence-structured-open-source')).toBeLessThan(rowSlice.indexOf('{row.excerpt}'));
	});

	it('stacks entity Intelligence search hits with drill-down link before excerpt', () => {
		expect(pageSource).toContain('data-testid="intelligence-ws-entity-search-action-hint"');
		expect(pageSource).toContain('data-testid="intelligence-entity-search-primary-action"');
		expect(pageSource).toContain('data-testid="intelligence-entity-search-hit-row"');
	});
});
