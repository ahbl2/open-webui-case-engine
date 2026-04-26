/**
 * P69-07 — overview board shell + registry panel source contracts.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const shell = readFileSync(join(__dirname, 'EntitiesOverviewBoardShell.svelte'), 'utf8');
const panel = readFileSync(join(__dirname, 'EntitiesRegistryPanel.svelte'), 'utf8');
const intelligencePage = readFileSync(
	join(__dirname, '../../../routes/(app)/case/[id]/intelligence/+page.svelte'),
	'utf8'
);
const registryRail = readFileSync(join(__dirname, 'SubjectsAssetsRegistryRail.svelte'), 'utf8');

describe('P69-07 Entities overview board', () => {
	it('shell composes grid, connections, intake, and focus handoff props', () => {
		expect(shell).toContain('onFocusRequested');
		expect(shell).toContain('onRegistryRowActivate');
		expect(shell).toContain('onAddRequest');
		expect(shell).toContain('getBoardSnapshot');
		expect(shell).toContain('applyBoardSnapshot');
		expect(shell).toContain('refreshAllPanels');
		expect(shell).toContain('entities-registry-grid');
		expect(shell).toContain('entityKind="PHONE"');
		expect(shell).toContain('CaseIntelligenceStage1Panel');
		expect(shell).toContain('CaseIntelligenceAssociationsPanel');
	});

	it('registry panel loads committed entities and supports view-all expand', () => {
		expect(panel).toContain('listCaseIntelligenceCommittedEntities');
		expect(panel).toContain('onRowActivate?.({ entity: ent })');
		expect(panel).toContain('data-testid="{testId}-view-all"');
		expect(panel).toContain('data-testid="{testId}-placeholder"');
		expect(panel).toContain("panelMode === 'placeholder'");
	});

	it('intelligence route hero exposes intake toggle; registry rail exposes add entity menu', () => {
		expect(intelligencePage).toContain('entities-board-toggle-intake');
		expect(intelligencePage).toContain('bind:intakeExpanded');
		expect(registryRail).toContain('entities-board-add-entity');
		expect(registryRail).toContain('entities-board-add-menu');
	});
});
