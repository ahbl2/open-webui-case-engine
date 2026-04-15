<!--
	P131-03 — Cross-case activity feed (GET-only). Case identifier navigates to /case/:id on explicit click.
	P131.5-02 — Optional `dataSource="parent"` when CommandCenterPanel owns the fetch.
	P131.5-04 — Dashboard row layout (presentation only; ordering and fields unchanged).
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { caseEngineToken, caseEngineUser, unitFilter } from '$lib/stores';
	import {
		fetchCommandCenterActivityRows,
		type CommandCenterActivityRow
	} from '$lib/case/commandCenterActivity';
	import { navigateCommandCenterToCaseWorkspace } from '$lib/case/commandCenterGuardrails';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		P131_5_COMMAND_CENTER_ACTIVITY_CARD_TITLE,
		P131_COMMAND_CENTER_ACTIVITY_EMPTY,
		P131_COMMAND_CENTER_ACTIVITY_LOADING,
		P131_COMMAND_CENTER_ACTIVITY_NO_TOKEN,
		P132_COMMAND_CENTER_GENERIC_LOAD_ERROR
	} from '$lib/case/p131CommandCenterCopy';

	export let dataSource: 'self' | 'parent' = 'self';
	export let parentRows: CommandCenterActivityRow[] = [];
	export let parentLoading = false;
	export let parentLoadError: string | null = null;

	let internalRows: CommandCenterActivityRow[] = [];
	let internalLoading = false;
	let internalLoadError: string | null = null;
	let loadKeyPrev = '';

	$: rows = dataSource === 'parent' ? parentRows : internalRows;
	$: loading = dataSource === 'parent' ? parentLoading : internalLoading;
	$: loadError = dataSource === 'parent' ? parentLoadError : internalLoadError;

	async function loadInternal(): Promise<void> {
		const token = $caseEngineToken;
		if (!token) {
			internalRows = [];
			internalLoadError = null;
			internalLoading = false;
			return;
		}
		internalRows = [];
		internalLoading = true;
		internalLoadError = null;
		try {
			const unit = $unitFilter ?? 'ALL';
			internalRows = await fetchCommandCenterActivityRows(token, unit);
		} catch {
			internalRows = [];
			internalLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
		} finally {
			internalLoading = false;
		}
	}

	function onCaseNavigate(caseId: string): void {
		navigateCommandCenterToCaseWorkspace(goto, caseId, 'activity_feed');
	}

	function onCaseKeydown(e: KeyboardEvent, caseId: string): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onCaseNavigate(caseId);
		}
	}

	$: if (browser && dataSource === 'self') {
		const k = `${$caseEngineToken ?? ''}|${$unitFilter ?? ''}|${$caseEngineUser?.id ?? ''}`;
		if (k !== loadKeyPrev) {
			loadKeyPrev = k;
			void loadInternal();
		}
	}
</script>

<section
	class="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent"
	aria-label={P131_5_COMMAND_CENTER_ACTIVITY_CARD_TITLE}
	data-testid="command-center-activity-feed"
	data-p131-5-activity-feed-body="true"
>
	{#if !$caseEngineToken}
		<div class="flex flex-1 flex-col justify-center px-4 py-8 sm:px-5">
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-activity-no-token"
			>
				{P131_COMMAND_CENTER_ACTIVITY_NO_TOKEN}
			</p>
		</div>
	{:else if loading}
		<div class="flex flex-1 flex-col justify-center px-4 py-10 sm:px-5">
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-activity-loading"
			>
				{P131_COMMAND_CENTER_ACTIVITY_LOADING}
			</p>
		</div>
	{:else if loadError}
		<div class="flex flex-1 flex-col justify-center px-4 py-8 sm:px-5">
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200"
				role="alert"
				data-testid="command-center-activity-error"
			>
				{loadError}
			</p>
		</div>
	{:else if rows.length === 0}
		<div class="flex flex-1 flex-col justify-center px-4 py-10 sm:px-5">
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-activity-empty"
			>
				{P131_COMMAND_CENTER_ACTIVITY_EMPTY}
			</p>
		</div>
	{:else}
		<ol
			class="m-0 min-h-0 flex-1 list-none divide-y divide-[color:var(--ce-l-border-subtle)] overflow-y-auto p-0 [divide-opacity:0.85]"
			data-testid="command-center-activity-list"
			role="list"
		>
			{#each rows as r (r.event_id)}
				<li class="m-0 p-0" role="listitem" data-testid="command-center-activity-row" data-event-id={r.event_id} data-case-id={r.case_id}>
					<div class="px-5 py-5 leading-relaxed sm:px-6 sm:py-6">
						<p
							class="m-0 text-base font-semibold leading-relaxed tracking-tight text-[color:var(--ce-l-text-primary)] [overflow-wrap:anywhere]"
						>
							{r.event_type}
						</p>
						<p
							class="{DS_TYPE_CLASSES.meta} m-0 mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs leading-relaxed text-[color:var(--ce-l-text-muted)]"
						>
							<span class="font-mono tabular-nums text-[0.8rem] text-[color:var(--ce-l-text-secondary)]"
								>{r.actor_user_id}</span
							>
							<span aria-hidden="true" class="text-[color:var(--ce-l-border-default)]">·</span>
							<button
								type="button"
								class="cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-[color:var(--ce-l-text-primary)] underline decoration-[color:var(--ce-l-border-default)] underline-offset-2 transition-colors hover:text-[color:var(--ce-l-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ce-l-border-default)] focus-visible:ring-offset-2"
								data-testid="command-center-activity-case-link"
								aria-label={`Open case ${r.case_id}`}
								on:click={() => onCaseNavigate(r.case_id)}
								on:keydown={(e) => onCaseKeydown(e, r.case_id)}
							>
								{r.case_identifier}
							</button>
							<span aria-hidden="true" class="text-[color:var(--ce-l-border-default)]">·</span>
							<span class="font-mono text-[0.8rem] tabular-nums">{r.occurred_at}</span>
						</p>
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</section>
