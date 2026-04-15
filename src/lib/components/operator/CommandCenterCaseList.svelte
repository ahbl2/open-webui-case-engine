<!--
	P131-02 — Cross-case case list (GET-only). Rows navigate to /case/:id on explicit click.
	P131.5-02 — Optional `dataSource="parent"` + `parent*` props when CommandCenterPanel owns the fetch.
	P131.5-03 — Dashboard row layout (presentation only; ordering and fields unchanged).
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { caseEngineToken, caseEngineUser, unitFilter } from '$lib/stores';
	import { fetchCommandCenterCaseRows, type CommandCenterCaseRow } from '$lib/case/commandCenterCases';
	import { navigateCommandCenterToCaseWorkspace } from '$lib/case/commandCenterGuardrails';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		P131_5_COMMAND_CENTER_CASES_CARD_TITLE,
		P131_COMMAND_CENTER_CASE_LIST_EMPTY,
		P131_COMMAND_CENTER_CASE_LIST_EMPTY_CELL,
		P131_COMMAND_CENTER_CASE_LIST_LOADING,
		P131_COMMAND_CENTER_CASE_LIST_NO_TOKEN,
		P132_COMMAND_CENTER_GENERIC_LOAD_ERROR
	} from '$lib/case/p131CommandCenterCopy';

	/** When `parent`, use `parentRows` / `parentLoading` / `parentLoadError` from CommandCenterPanel. */
	export let dataSource: 'self' | 'parent' = 'self';
	export let parentRows: CommandCenterCaseRow[] = [];
	export let parentLoading = false;
	export let parentLoadError: string | null = null;

	let internalRows: CommandCenterCaseRow[] = [];
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
			internalRows = await fetchCommandCenterCaseRows(token, unit);
		} catch {
			internalRows = [];
			internalLoadError = P132_COMMAND_CENTER_GENERIC_LOAD_ERROR;
		} finally {
			internalLoading = false;
		}
	}

	function onRowActivate(caseId: string): void {
		navigateCommandCenterToCaseWorkspace(goto, caseId, 'case_list');
	}

	function onRowKeydown(e: KeyboardEvent, caseId: string): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onRowActivate(caseId);
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
	aria-label={P131_5_COMMAND_CENTER_CASES_CARD_TITLE}
	data-testid="command-center-case-list"
	data-p131-5-case-list-body="true"
>
	{#if !$caseEngineToken}
		<div class="flex flex-1 flex-col justify-center px-4 py-8 sm:px-5">
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-case-list-no-token"
			>
				{P131_COMMAND_CENTER_CASE_LIST_NO_TOKEN}
			</p>
		</div>
	{:else if loading}
		<div class="flex flex-1 flex-col justify-center px-4 py-10 sm:px-5">
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-case-list-loading"
			>
				{P131_COMMAND_CENTER_CASE_LIST_LOADING}
			</p>
		</div>
	{:else if loadError}
		<div class="flex flex-1 flex-col justify-center px-4 py-8 sm:px-5">
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200"
				role="alert"
				data-testid="command-center-case-list-error"
			>
				{loadError}
			</p>
		</div>
	{:else if rows.length === 0}
		<div class="flex flex-1 flex-col justify-center px-4 py-10 sm:px-5">
			<p
				class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]"
				data-testid="command-center-case-list-empty"
			>
				{P131_COMMAND_CENTER_CASE_LIST_EMPTY}
			</p>
		</div>
	{:else}
		<ul
			class="m-0 min-h-0 flex-1 list-none divide-y divide-[color:var(--ce-l-border-subtle)] overflow-y-auto p-0 [divide-opacity:0.85]"
			role="list"
		>
			{#each rows as r (r.case_id)}
				<li class="m-0 p-0" role="listitem">
					<div
						class="group block w-full cursor-pointer px-4 py-5 text-left leading-relaxed transition-colors hover:bg-[color:var(--ce-l-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ce-l-border-default)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ce-l-surface-muted)] sm:px-6 sm:py-6"
						role="link"
						tabindex="0"
						data-testid="command-center-case-row"
						data-case-id={r.case_id}
						data-p131-5-case-row="true"
						on:click={() => onRowActivate(r.case_id)}
						on:keydown={(e) => onRowKeydown(e, r.case_id)}
					>
						<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
							<div class="min-w-0 flex-1">
								<p
									class="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[color:var(--ce-l-text-primary)]"
								>
									<span
										class="shrink-0 font-mono text-sm font-semibold tabular-nums text-[color:var(--ce-l-text-secondary)]"
									>
										{r.case_number}
									</span>
									<span
										class="min-w-0 text-base font-semibold leading-snug tracking-tight [overflow-wrap:anywhere] sm:text-[1.05rem]"
									>
										{r.title}
									</span>
								</p>
							</div>
							<div
								class="shrink-0 text-xs leading-relaxed text-[color:var(--ce-l-text-muted)] sm:max-w-[min(24rem,42%)] sm:text-right sm:tabular-nums"
							>
								<span>{r.unit}</span>
								<span aria-hidden="true" class="mx-1.5 text-[color:var(--ce-l-border-default)]">·</span>
								<span>{r.status}</span>
								<span aria-hidden="true" class="mx-1.5 text-[color:var(--ce-l-border-default)]">·</span>
								<span class="font-mono text-[0.8rem]">
									{r.last_timeline_entry_occurred_at ?? P131_COMMAND_CENTER_CASE_LIST_EMPTY_CELL}
								</span>
							</div>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
