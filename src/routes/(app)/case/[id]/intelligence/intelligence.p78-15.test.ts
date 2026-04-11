/**
 * P78-15 — Cross-surface navigation continuity (Intelligence ↔ case workspace).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');
const entityFocusSource = readFileSync(join(__dirname, 'entity/[type]/[value]/+page.svelte'), 'utf8');

describe('Intelligence page (P78-15 navigation continuity)', () => {
	it('syncs Entities / Intelligence sub-mode to ?mode= and updates tabs via setWorkspaceMode', () => {
		expect(pageSource).toContain('afterNavigate(');
		expect(pageSource).toContain('function setWorkspaceMode(');
		expect(pageSource).toContain("goto(`/case/${id}/intelligence?mode=${next}`");
		expect(pageSource).toContain("on:click={() => setWorkspaceMode('entities')}");
		expect(pageSource).toContain("on:click={() => setWorkspaceMode('intelligence')}");
	});

	it('adds case workspace entry links on cross-case case matches (overview + AI workspace)', () => {
		expect(pageSource).toContain('data-testid="intelligence-cases-match-open-case"');
		expect(pageSource).toContain('data-testid="intelligence-cases-match-open-chat"');
		expect(pageSource).toContain('data-testid="intelligence-cases-match-action-hint"');
		expect(pageSource).toContain('/summary');
		expect(pageSource).toContain('/chat');
	});
});

describe('Entity focus route (P78-15 back link)', () => {
	it('returns to Intelligence workspace mode via ?mode=intelligence', () => {
		expect(entityFocusSource).toContain('intelligence?mode=intelligence');
		expect(entityFocusSource).toContain('data-testid="intelligence-entity-focus-back"');
	});
});
