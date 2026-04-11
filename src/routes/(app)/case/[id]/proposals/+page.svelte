<script lang="ts">
	/**
	 * Case-scoped P19 proposal_records dashboard — persistent review surface
	 * (same records as chat intake; no separate proposal system).
	 * P71-07 — Tier L shell / framing (P70-06 W1, P70-04 B); presentation only.
	 * P77-06 — Wave 4 DS identity + governance chrome (Tier L `ce-l-*` contracts preserved).
	 */
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import ProposalReviewPanel from '$lib/components/proposals/ProposalReviewPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import {
		DS_BADGE_CLASSES,
		DS_BANNER_CLASSES,
		DS_PROPOSALS_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	$: caseId = $page.params.id ?? '';
</script>

<CaseWorkspaceContentRegion testId="case-proposals-page">
	<div class="ce-l-proposals-shell">
		<div class="ce-l-proposals-hero">
			<div class="{DS_PROPOSALS_CLASSES.pageIdentity}">
				<h2 class="ce-l-proposals-hero-title {DS_TYPE_CLASSES.section} {DS_PROPOSALS_CLASSES.pageIdentityHeading}">
					Proposals
				</h2>
				<span
					class="{DS_BADGE_CLASSES.info}"
					title="Governed intake — approve, then commit to the official record"
				>Governed review</span>
				<p class="{DS_PROPOSALS_CLASSES.pageIdentityMeta} max-w-md">
					Not official until Commit — distinct from Timeline (record) and Notes (drafts).
				</p>
			</div>
			<p class="ce-l-proposals-hero-intro {DS_TYPE_CLASSES.body} text-xs font-normal max-w-3xl leading-snug m-0 mt-1">
				Governed intake: <strong>Approve</strong> moves work to the <strong>Approved</strong> workflow tab
				(staging — not the official record until <strong>Commit</strong>). <strong>Commit</strong> writes the
				official Timeline entry or governed Note; the <strong>Committed</strong> tab lists outcomes already on the case
				record. Pending rows stay off the official Timeline until then. Notes remain investigator drafts.
			</p>
		</div>

		<div class="ce-l-proposals-workspace px-2 sm:px-3 pb-2">
			{#if $caseEngineToken && caseId}
				<ProposalReviewPanel
					{caseId}
					token={$caseEngineToken}
					layout="page"
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
