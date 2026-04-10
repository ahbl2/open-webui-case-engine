/**
 * P67-05 — intelligence route embeds committed entity registries under Entities mode.
 * P69-07 — registries live inside EntitiesOverviewBoardShell (four panels + phone placeholder).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');

describe('intelligence/+page entity registries (P67-05 / P69-07)', () => {
	it('uses EntitiesOverviewBoardShell with overview board grid', () => {
		expect(pageSource).toContain(
			"import EntitiesOverviewBoardShell from '$lib/components/case/EntitiesOverviewBoardShell.svelte'"
		);
		expect(pageSource).toContain('<EntitiesOverviewBoardShell');
		expect(pageSource).toContain('onAddRequest={handleIntelCreateRequest}');
	});

	it('opens entity detail modal on registry select (P67-06)', () => {
		expect(pageSource).toContain('selectedRegistryEntityId');
		expect(pageSource).toContain('entityDetailOpen = true');
		expect(pageSource).toContain(
			"import CaseIntelligenceEntityDetailModal from '$lib/components/case/CaseIntelligenceEntityDetailModal.svelte'"
		);
		expect(pageSource).toContain('<CaseIntelligenceEntityDetailModal');
	});

	it('P69-08: focus mode entry via onFocusRequested and board snapshot handoff', () => {
		expect(pageSource).toContain('onFocusRequested={requestEntityFocus}');
		expect(pageSource).toContain('requestEntityFocus');
		expect(pageSource).toContain('EntitiesFocusModeShell');
		expect(pageSource).toContain('getBoardSnapshot');
		expect(pageSource).toContain('applyBoardSnapshot');
	});
});
