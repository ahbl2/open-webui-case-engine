/**
 * P69-08 — Focus mode shell + anchored registry composition (source contract tests).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'EntitiesFocusModeShell.svelte'), 'utf8');
const panel = readFileSync(join(__dirname, 'EntitiesRegistryPanel.svelte'), 'utf8');

describe('EntitiesFocusModeShell (P69-08)', () => {
	it('exposes focus landmarks, back affordance, and P69-09 detail workspace + dirty gate', () => {
		expect(source).toContain('data-testid="entities-focus-mode-shell"');
		expect(source).toContain('data-testid="entities-focus-back-to-board"');
		expect(source).toContain('data-testid="entities-focus-anchored-column"');
		expect(source).toContain('EntityDetailWorkspace');
		expect(source).toContain('data-testid="entity-detail-dirty-gate"');
		expect(source).toContain('layoutVariant="anchored"');
		expect(source).toContain('getCaseIntelligenceCommittedEntity');
	});

	it('supports reduced-motion-safe scroll behavior hint', () => {
		expect(source).toContain('prefers-reduced-motion');
		expect(source).toContain('motion-reduce:transition-none');
	});

	it('does not ship Pattern Y cross-type chrome', () => {
		expect(source).not.toContain('targetKind');
		expect(source).not.toContain('Pattern Y');
	});
});

describe('EntitiesRegistryPanel anchored rail (P69-08)', () => {
	it('supports layout variant and async applyPanelState for snapshot restore', () => {
		expect(panel).toContain("layoutVariant: 'board' | 'anchored'");
		expect(panel).toContain('export async function applyPanelState');
		expect(panel).toContain('data-layout-variant');
		expect(panel).toContain('entity-registry-roster');
		expect(panel).toContain('data-testid="{testId}-toolbar"');
	});
});
