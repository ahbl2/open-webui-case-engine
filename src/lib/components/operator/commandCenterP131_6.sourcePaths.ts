/**
 * P131.6-05 — Stable paths for Home / Operator Command Center dashboard source scans.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** `/home` Wave-2 OCC dashboard + shared operator shell/state components. */
export const P131_6_DASHBOARD_SOURCE_PATHS = [
	join(here, '../../../routes/(app)/home/+page.svelte'),
	join(here, '../../../routes/(app)/home/OccHomeLeftColumn.svelte'),
	join(here, '../../../routes/(app)/home/OccHomeCenterColumn.svelte'),
	join(here, '../../../routes/(app)/home/OccHomeBoardCases.svelte'),
	join(here, '../../../routes/(app)/home/OccHomeBoardActivity.svelte'),
	join(here, '../../../routes/(app)/home/OccHomeRightColumn.svelte'),
	join(here, '../../../routes/(app)/home/OccHomeWorkflowQueueZone.svelte'),
	join(here, '../../../routes/(app)/home/HomeDesktopYourCases.svelte'),
	join(here, '../../../routes/(app)/home/HomeDesktopPersonalThreads.svelte'),
	join(here, 'OperatorCommandCenterFrame.svelte'),
	join(here, 'OccStateContainer.svelte'),
	join(here, 'OccErrorBlock.svelte'),
	join(here, 'OccRailAssistant.svelte'),
	join(here, 'OccRailIntel.svelte'),
	join(here, 'OccRailProposals.svelte'),
	join(here, 'OccSkeletonTileRow.svelte'),
	join(here, 'OccSkeletonList.svelte'),
	join(here, 'OccSkeletonFeed.svelte'),
	join(here, 'OccSummaryKpiTiles.svelte')
] as const;

export const COMMAND_CENTER_ROUTE_PANEL_PATH = join(here, 'CommandCenterPanel.svelte');

/** Cross-case Command Center route copy bundle (read-only narrative; inference guardrails). */
export const P131_COMMAND_CENTER_COPY_PATH = join(here, '../../case/p131CommandCenterCopy.ts');
