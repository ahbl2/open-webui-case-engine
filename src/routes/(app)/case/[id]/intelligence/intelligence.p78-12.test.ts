/**
 * P78-12 — Phone search → entity evidence focus path: labels and CTAs in Intelligence UI.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');

describe('Intelligence page (P78-12 phone path acceleration)', () => {
	it('surfaces phone search hint and structured phone next-step copy', () => {
		expect(pageSource).toContain('data-testid="intelligence-ws-phone-search-hint"');
		expect(pageSource).toContain('data-testid="intelligence-ws-phone-structured-hint"');
		expect(pageSource).toContain('looksLikePhoneDigitsQuery');
	});

	it('uses a prominent phone evidence focus CTA for structured phone mentions', () => {
		expect(pageSource).toContain('data-testid="intelligence-ws-phone-focus-cta"');
		expect(pageSource).toContain('data-testid="intelligence-ws-phone-focus-cta-link"');
		expect(pageSource).toContain("structuredActionId === 'phone_mentions'");
	});

	it('uses entityEvidenceFocusControlLabel on entity evidence rows', () => {
		expect(pageSource).toContain('entityEvidenceFocusControlLabel(item.entityType)');
	});

	it('clarifies phone entity search rows without implying board registry parity', () => {
		expect(pageSource).toContain('data-testid="intelligence-ws-entity-search-phone-note"');
		expect(pageSource).toContain('not the Entities board phone column');
	});
});
