<script lang="ts">
	/**
	 * Case-scoped P19 proposal_records dashboard — persistent review surface
	 * (same records as chat intake; no separate proposal system).
	 * P71-07 — Tier L shell / framing (P70-06 W1, P70-04 B); presentation only.
	 */
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import ProposalReviewPanel from '$lib/components/proposals/ProposalReviewPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';

	$: caseId = $page.params.id ?? '';
</script>

<CaseWorkspaceContentRegion testId="case-proposals-page">
	<div class="ce-l-proposals-shell">
		<div class="ce-l-proposals-hero">
			<h2 class="ce-l-proposals-hero-title text-sm font-semibold">Proposals</h2>
			<p class="ce-l-proposals-hero-intro text-xs font-normal max-w-3xl leading-snug">
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
				<p class="text-sm ce-l-proposals-hero-intro p-4">
					Case Engine connection required to load proposals for this case.
				</p>
			{/if}
		</div>
	</div>
</CaseWorkspaceContentRegion>
