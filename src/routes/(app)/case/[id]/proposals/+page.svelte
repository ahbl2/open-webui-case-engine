<script lang="ts">
	/**
	 * Case-scoped P19 proposal_records dashboard — persistent review surface
	 * (same records as chat intake; no separate proposal system).
	 * P71-07 — Tier L shell / framing (P70-06 W1, P70-04 B); presentation only.
	 * P77-06 — Wave 4 DS identity + governance chrome (Tier L `ce-l-*` contracts preserved).
	 * P128-01 — Intake framing (`CaseProposalFraming`); case id via `getRouteCaseIdString` only.
	 * P128-04 — Single-proposal Accept/Reject on this route (`p128SingleReviewMode`); bulk review stays on Case Chat tools.
	 * P128-05 — Boundary: proposal_records are candidates; Timeline (`timeline_entries`) is the committed record;
	 * Notes (drafts) are working drafts; nothing is on the official record until explicit Accept+commit on the governed path.
	 */
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import ProposalReviewPanel from '$lib/components/proposals/ProposalReviewPanel.svelte';
	import CaseProposalFraming from '$lib/components/case/CaseProposalFraming.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import { getRouteCaseIdString } from '$lib/caseContext/routeCaseContext';
	import {
		DS_BANNER_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	$: routeCaseId = getRouteCaseIdString($page.params);
</script>

<CaseWorkspaceContentRegion testId="case-proposals-page">
	<div
		class="ce-l-proposals-shell flex min-h-0 flex-1 flex-col overflow-hidden"
		data-route-case-id={routeCaseId || undefined}
	>
		<!-- P128-01 — Hero + doctrine: always first; visible for no-token, loading, empty, and populated. -->
		<CaseProposalFraming />
		<div class="ce-l-proposals-workspace min-h-0 min-w-0 flex-1 overflow-hidden px-2 pb-2 sm:px-3">
				{#if $caseEngineToken && routeCaseId}
					<ProposalReviewPanel
						caseId={routeCaseId}
						token={$caseEngineToken}
						layout="page"
						reviewActionsEnabled={true}
						p128SingleReviewMode={true}
						refreshOnNav={true}
					/>
				{:else}
					<div
						class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} {DS_STATUS_SURFACE_CLASSES.warning} m-2 p-4"
					>
						<p class="{DS_BANNER_CLASSES.body} m-0 text-sm {DS_STATUS_TEXT_CLASSES.warning}">
							Case Engine connection required to load proposals for this case.
						</p>
					</div>
				{/if}
		</div>
	</div>
</CaseWorkspaceContentRegion>
