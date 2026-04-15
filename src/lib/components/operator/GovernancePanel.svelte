<!--
	P132-05 — Read-only governance listing (user_id, role, unit). Server decides access; 404 → neutral copy.
-->
<script lang="ts">
	import { caseEngineToken, caseEngineUser } from '$lib/stores';
	import { fetchGovernanceUsers, type GovernanceUserRow } from '$lib/case/governance';
	import { DS_BANNER_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { P132_GOVERNANCE_NOT_FOUND } from '$lib/case/p132GovernanceCopy';

	let rows: GovernanceUserRow[] = [];
	let loading = true;
	let notFound = false;
	let loadSeq = 0;

	$: {
		const token = $caseEngineToken?.trim() ?? '';
		const uid = $caseEngineUser?.id;
		const seq = ++loadSeq;

		if (!token || !uid) {
			rows = [];
			notFound = true;
			loading = false;
		} else {
			loading = true;
			notFound = false;
			void fetchGovernanceUsers(token).then((r) => {
				if (seq !== loadSeq) return;
				loading = false;
				if (!r.ok) {
					rows = [];
					notFound = true;
					return;
				}
				rows = r.users;
			});
		}
	}
</script>

<div
	class="ce-l-governance flex min-h-0 flex-1 flex-col overflow-hidden border-l-4 border-slate-600/50 bg-[color:var(--ce-l-surface-raised)]"
	data-testid="governance-panel"
	data-p132-governance="true"
	data-p132-governance-readonly="true"
>
	<section
		class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] px-3 py-3 sm:px-4"
		aria-labelledby="governance-p132-title"
		data-testid="governance-framing"
	>
		<h1
			id="governance-p132-title"
			class="{DS_TYPE_CLASSES.section} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
		>
			Governance
		</h1>
		<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-xs leading-snug text-[color:var(--ce-l-text-muted)]">
			Read-only view of user identifiers, roles, and home units as returned by Case Engine.
		</p>
	</section>

	{#if !$caseEngineToken?.trim()}
		<p class="px-4 py-6 text-xs text-[color:var(--ce-l-text-muted)]" data-testid="governance-no-token">
			{P132_GOVERNANCE_NOT_FOUND}
		</p>
	{:else if loading}
		<p
			class="px-4 py-6 text-xs text-[color:var(--ce-l-text-muted)]"
			data-testid="governance-loading"
			aria-live="polite"
		>
			Loading…
		</p>
	{:else if notFound}
		<p class="px-4 py-6 text-xs text-[color:var(--ce-l-text-muted)]" data-testid="governance-not-found">
			{P132_GOVERNANCE_NOT_FOUND}
		</p>
	{:else}
		<div class="min-h-0 flex-1 overflow-auto px-2 py-3 sm:px-4" data-testid="governance-table-wrap">
			<table class="w-full border-collapse text-left text-xs text-[color:var(--ce-l-text-primary)]" data-testid="governance-table">
				<thead>
					<tr class="border-b border-[color:var(--ce-l-border-default)]">
						<th class="py-2 pr-3 font-semibold">User ID</th>
						<th class="py-2 pr-3 font-semibold">Role</th>
						<th class="py-2 font-semibold">Unit</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.user_id)}
						<tr class="border-b border-[color:var(--ce-l-border-muted)]" data-testid="governance-row">
							<td class="py-2 pr-3 font-mono text-[11px]">{row.user_id}</td>
							<td class="py-2 pr-3">{row.role}</td>
							<td class="py-2">{row.unit}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
