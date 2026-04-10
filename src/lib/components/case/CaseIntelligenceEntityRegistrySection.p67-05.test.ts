/**
 * P67-05 — registry section wires list API, controls, and row test ids (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'CaseIntelligenceEntityRegistrySection.svelte'), 'utf8');

describe('CaseIntelligenceEntityRegistrySection (P67-05)', () => {
	it('uses listCaseIntelligenceCommittedEntities integration point', () => {
		expect(source).toContain('listCaseIntelligenceCommittedEntities');
	});

	it('exposes toolbar and row test id patterns', () => {
		expect(source).toContain('data-testid="{testId}-search"');
		expect(source).toContain('data-testid="{testId}-filter"');
		expect(source).toContain('data-testid="{testId}-sort"');
		expect(source).toContain('data-testid="{testId}-add"');
		expect(source).toContain('data-testid="{testId}-row-{ent.id}"');
	});

	it('P68-08-FU1: row select uses onRowSelect callback (Svelte 5; not dispatcher)', () => {
		expect(source).toContain('onRowSelect?.({ entity: ent })');
		expect(source).not.toContain("dispatch('select'");
		expect(source).not.toContain('createEventDispatcher');
	});

	it('P68-05 + P68-08-FU1: refreshNonce triggers load; direct create uses onCreateRequest callback', () => {
		expect(source).toContain('export let refreshNonce = 0');
		expect(source).toContain('lastAppliedRefreshNonce');
		expect(source).toContain('onCreateRequest?.({ entityKind })');
		expect(source).toContain('requestDirectCreate');
		expect(source).not.toContain("dispatch('createRequest'");
	});
});
