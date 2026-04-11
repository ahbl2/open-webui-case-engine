<script lang="ts">
	/**
	 * P82-02 — Case workspace header + compact context strip (identity + optional metadata + pending proposals).
	 * Uses only data passed from the case layout (existing stores / getCaseById mapping); no new API calls.
	 */
	import { goto } from '$app/navigation';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import {
		DS_BADGE_CLASSES,
		DS_CASE_SHELL_CLASSES,
		DS_CHIP_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { caseStatusDsBadgeCompound, displayCaseTitle } from '$lib/utils/caseIdentityStrip';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';
	import type { CaseMeta } from '$lib/stores/caseEngine';
	import type { CaseEngineUiState } from '$lib/utils/caseEngineUiState';

	export let caseId: string;
	export let loading: boolean;
	export let loadError: string;
	export let meta: CaseMeta | null;
	export let shellHeaderDataUiState: CaseEngineUiState | '';
	export let identityStripExpanded: boolean;
	export let wave3CaseShellEnabled: boolean;
	export let pendingProposalsShellCount: number | null;
	export let onEdit: () => void;

	$: createdAtLabel =
		meta?.created_at && String(meta.created_at).trim()
			? formatCaseDateTime(String(meta.created_at))
			: '';
	$: showContextStrip =
		!!createdAtLabel || (pendingProposalsShellCount !== null && pendingProposalsShellCount > 0);
</script>

<div
	class="flex shrink-0 flex-col border-b border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)]"
	data-testid="case-workspace-header"
	data-region="case-shell-header-stack"
>
	<header
		class="ce-l-identity-bar z-10 flex flex-wrap items-start gap-x-2 gap-y-2 px-3 sm:items-center {identityStripExpanded
			? 'py-3 sm:min-h-[3.5rem]'
			: 'py-2.5 sm:min-h-12 sm:py-2'}"
		aria-label="Case identity"
		data-testid="case-identity-bar"
		data-case-identity-posture={identityStripExpanded ? 'expanded' : 'compact'}
		data-region={wave3CaseShellEnabled ? 'case-shell-identity' : undefined}
	>
		<button
			type="button"
			class="ce-l-identity-back shrink-0"
			on:click={() => goto('/cases')}
			aria-label="Back to cases"
		>
			<ChevronLeft className="size-4 shrink-0" />
			<span class="text-xs font-medium">Cases</span>
		</button>

		<div class="h-4 w-px shrink-0 bg-[color:var(--ce-l-border-default)]" aria-hidden="true"></div>

		{#if loading && !meta}
			<span
				class="text-sm animate-pulse text-[color:var(--ce-l-text-muted)]"
				data-testid="case-shell-loading"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>Loading…</span>
		{:else if loadError}
			<span
				class="text-sm text-red-500 dark:text-red-400"
				data-testid="case-shell-load-error"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>
				{loadError}
			</span>
		{:else if meta}
			<div
				class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
				data-testid="case-shell-loaded"
				data-case-engine-ui-state={shellHeaderDataUiState}
			>
				<div class="flex min-w-0 flex-1 flex-col gap-2 {identityStripExpanded ? 'sm:gap-2.5' : 'gap-1.5'}">
					<div
						class="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1"
						data-testid="case-identity-primary"
					>
						<span
							class="{DS_TYPE_CLASSES.mono} shrink-0 select-all text-xs tabular-nums text-[color:var(--ce-l-text-muted)]"
						>
							{meta.case_number}
						</span>
						<h1
							class="{DS_TYPE_CLASSES.body} min-w-0 max-w-full flex-1 basis-[min(100%,14rem)] truncate font-semibold leading-snug text-[color:var(--ce-l-text-primary)] sm:max-w-xl md:max-w-2xl {identityStripExpanded
								? 'text-base sm:text-lg'
								: 'text-sm sm:text-base'}"
							title={displayCaseTitle(meta.title)}
						>
							{displayCaseTitle(meta.title)}
						</h1>
					</div>
					<div
						class="flex flex-wrap items-center gap-2"
						data-testid="case-identity-secondary"
						aria-label="Case metadata"
					>
						{#if meta.unit?.trim()}
							<span class="{DS_CHIP_CLASSES.base} max-w-[14rem] truncate" title={meta.unit}>
								{meta.unit}
							</span>
						{/if}
						{#if meta.status?.trim()}
							<span class={caseStatusDsBadgeCompound(meta.status)}>
								{meta.status}
							</span>
						{:else}
							<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}">No status</span>
						{/if}
						{#if meta.incident_date}
							<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
								Incident {meta.incident_date}
							</span>
						{:else}
							<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]">No incident date</span>
						{/if}
					</div>
				</div>

				<button
					type="button"
					class="ce-l-identity-edit shrink-0 self-start sm:self-center"
					on:click={onEdit}
				>
					Edit Case
				</button>
			</div>
		{/if}
	</header>

	{#if meta && !loadError && !loading && showContextStrip}
		<div
			class="{DS_CASE_SHELL_CLASSES.contextBand} flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[color:var(--ce-l-chrome-border)]"
			role="region"
			aria-label="Case context"
			data-testid="case-shell-context-band"
			data-region={wave3CaseShellEnabled ? 'case-shell-context-band' : undefined}
		>
			<div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
				{#if createdAtLabel}
					<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">
						Created {createdAtLabel}
					</span>
				{/if}
			</div>
			{#if pendingProposalsShellCount !== null && pendingProposalsShellCount > 0}
				<a
					href={`/case/${caseId}/proposals`}
					class="inline-flex max-w-full min-w-0 shrink-0 items-center gap-2 rounded-md px-1 py-0.5 text-[color:var(--ce-l-text-primary)] outline-none ring-offset-2 transition-colors hover:bg-[color:var(--ce-l-surface-muted)] focus-visible:ring-2 focus-visible:ring-[color:var(--ce-l-tab-active-border)]"
					data-testid="case-shell-context-band-pending-proposals"
				>
					<span class="{DS_BADGE_CLASSES.warning} tabular-nums">{pendingProposalsShellCount}</span>
					<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-secondary)]">Pending proposals</span>
				</a>
			{/if}
		</div>
	{/if}
</div>
