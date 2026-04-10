/**
 * P68-05 — Entities workspace wires direct-create modal and registry refresh nonce.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');

describe('intelligence/+page direct entity create (P68-05)', () => {
	it('imports create modal and binds board refresh + onAddRequest (P68-08-FU1 / P69-07)', () => {
		expect(pageSource).toContain('CaseIntelligenceEntityCreateModal');
		expect(pageSource).toContain('refreshNonce={entityRegistryRefreshNonce}');
		expect(pageSource).toContain('onAddRequest={handleIntelCreateRequest}');
		expect(pageSource).not.toContain('on:createRequest={handleIntelCreateRequest}');
		expect(pageSource).toContain('on:created={handleIntelDirectEntityCreated}');
	});

	it('bumps refresh nonce and opens detail on created handler', () => {
		expect(pageSource).toContain('entityRegistryRefreshNonce += 1');
		expect(pageSource).toContain('entityDetailOpen = true');
		expect(pageSource).toContain('flashDirectCreateSuccess');
	});

	it('surfaces non-blocking success copy test id', () => {
		expect(pageSource).toContain('data-testid="intelligence-direct-create-success"');
	});

	it('workflow path no longer claims Add scrolls to Stage 1', () => {
		expect(pageSource).not.toContain('scrolls to Stage');
	});
});
