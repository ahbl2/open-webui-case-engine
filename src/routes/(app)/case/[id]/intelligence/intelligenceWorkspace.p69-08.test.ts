/**
 * P69-08 — intelligence Entities mode: board ↔ focus transition and snapshot restore wiring.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');

describe('intelligence/+page focus mode (P69-08)', () => {
	it('hides and inerts the board slot while focus mode is active', () => {
		expect(pageSource).toContain('data-testid="intelligence-entities-board-slot"');
		expect(pageSource).toContain("entitiesFocusMode === 'focus'");
		expect(pageSource).toContain('inert=');
		expect(pageSource).toContain("aria-hidden={entitiesFocusMode === 'focus'");
	});

	it('gates registry row modal to board mode so focus entry uses the shell instead', () => {
		expect(pageSource).toContain("if (entitiesFocusMode !== 'board') return");
	});

	it('captures board snapshot before entering focus', () => {
		expect(pageSource).toContain('entitiesBoardSnapshot = entitiesBoardShell.getBoardSnapshot()');
		expect(pageSource).toContain('seedPanelState={entitiesBoardSnapshot.panels?.[entitiesFocusSeed.entity_kind]}');
	});

	it('P69-09: wires association composer from focus shell to entity detail modal', () => {
		expect(pageSource).toContain('onOpenAssociationComposer');
	});

	it('surfaces unavailable focus for non-anchored registries via toast (phone / future)', () => {
		expect(pageSource).toContain('P69-10');
		expect(pageSource).toContain('toast.error');
	});

	it('exposes focus mode for automation', () => {
		expect(pageSource).toContain('data-testid="entities-focus-mode"');
		expect(pageSource).toContain('{entitiesFocusMode}');
	});
});
