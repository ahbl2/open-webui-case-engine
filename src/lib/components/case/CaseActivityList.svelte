<!--
	P129-03 — Read-only chronological activity list (Case Engine order preserved; no client reorder).
-->
<script lang="ts">
	import { listCaseActivityEvents, type CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
	import { caseEngineToken } from '$lib/stores';
	import {
		DS_BANNER_CLASSES,
		DS_EMPTY_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import {
		p129ActivityEventTypeLabel,
		p129ActivityMetadataLines,
		p129ActivityTargetLine
	} from '$lib/case/p129ActivityDisplay';
	import {
		P129_ACTIVITY_LIST_EMPTY_BODY,
		P129_ACTIVITY_LIST_EMPTY_TITLE,
		P129_ACTIVITY_LIST_ERROR_GENERIC,
		P129_ACTIVITY_LIST_LOADING,
		P129_ACTIVITY_LIST_LOAD_MORE,
		P129_ACTIVITY_LIST_METADATA_HEADING,
		P129_ACTIVITY_LIST_ROW_ACTOR_PREFIX,
		P129_ACTIVITY_LIST_ROW_TARGET_PREFIX,
		P129_ACTIVITY_LIST_ROW_TIME_PREFIX
	} from '$lib/caseContext/p129ActivityListCopy';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';

	/** Route case id (from `getRouteCaseIdString` in parent). */
	export let caseId: string;

	const PAGE = 50;

	let events: CaseActivityEvent[] = [];
	let loading = true;
	let errorMsg = '';
	let totalCount = 0;
	let loadMoreBusy = false;
	let activeGen = 0;

	async function runLoad(reset: boolean): Promise<void> {
		const token = $caseEngineToken;
		if (!caseId?.trim() || !token) {
			loading = false;
			if (reset) {
				events = [];
				errorMsg = '';
				totalCount = 0;
			}
			return;
		}
		const gen = ++activeGen;
		if (reset) {
			loading = true;
			errorMsg = '';
			events = [];
			totalCount = 0;
		} else {
			loadMoreBusy = true;
		}
		const offset = reset ? 0 : events.length;
		try {
			const res = await listCaseActivityEvents(caseId, token, { limit: PAGE, offset });
			if (gen !== activeGen) return;
			errorMsg = '';
			if (reset) {
				events = res.activity_events;
			} else {
				events = [...events, ...res.activity_events];
			}
			totalCount = res.pagination.total_count;
		} catch (e: unknown) {
			if (gen !== activeGen) return;
			const msg = e instanceof Error ? e.message : P129_ACTIVITY_LIST_ERROR_GENERIC;
			if (reset) {
				errorMsg = msg;
				events = [];
			} else {
				errorMsg = msg;
			}
		} finally {
			if (gen === activeGen) {
				loading = false;
				loadMoreBusy = false;
			}
		}
	}

	let prevWatch = '';
	$: watch = `${caseId}::${$caseEngineToken ?? ''}`;
	$: if (watch !== prevWatch) {
		prevWatch = watch;
		if (caseId?.trim() && $caseEngineToken) {
			void runLoad(true);
		} else {
			activeGen += 1;
			events = [];
			loading = false;
			errorMsg = '';
			totalCount = 0;
		}
	}

	function onLoadMore(): void {
		void runLoad(false);
	}

	$: canLoadMore = !loading && !loadMoreBusy && events.length < totalCount && totalCount > 0;
</script>

<div class="flex min-h-0 flex-1 flex-col" data-testid="case-activity-list-root">
	{#if loading && events.length === 0}
		<div class="flex flex-1 flex-col items-start gap-2 px-1 py-2" data-testid="case-activity-list-loading">
			<CaseLoadingState label={P129_ACTIVITY_LIST_LOADING} testId="case-activity-list-loading-spinner" />
		</div>
	{:else if errorMsg && events.length === 0}
		<div
			class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
			data-testid="case-activity-list-error"
			role="alert"
		>
			<p class="{DS_BANNER_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">{errorMsg}</p>
		</div>
	{:else}
		{#if events.length === 0}
			<div
				class="{DS_EMPTY_CLASSES.root} {DS_EMPTY_CLASSES.compact} border-0 bg-transparent px-1 py-4"
				data-testid="case-activity-list-empty"
			>
				<p class="{DS_EMPTY_CLASSES.title} m-0 text-sm text-[color:var(--ce-l-text-secondary)]">
					{P129_ACTIVITY_LIST_EMPTY_TITLE}
				</p>
				<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
					{P129_ACTIVITY_LIST_EMPTY_BODY}
				</p>
			</div>
		{:else}
			<ol
				class="m-0 flex list-none flex-col gap-0 p-0"
				data-testid="case-activity-list"
				aria-label="Recorded activity"
			>
				{#each events as ev (ev.event_id)}
					<li
						class="border-b border-[color:var(--ce-l-border-subtle)] py-3 first:pt-0"
						data-testid="case-activity-row"
						data-activity-event-id={ev.event_id}
					>
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm font-medium text-[color:var(--ce-l-text-primary)]">
							{p129ActivityEventTypeLabel(ev.event_type)}
						</p>
						<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
							{P129_ACTIVITY_LIST_ROW_TIME_PREFIX}: {formatCaseDateTime(ev.occurred_at)}
						</p>
						{#if ev.actor_user_id}
							<p class="{DS_TYPE_CLASSES.meta} m-0 mt-0.5 text-[color:var(--ce-l-text-muted)]">
								{P129_ACTIVITY_LIST_ROW_ACTOR_PREFIX}: {ev.actor_user_id}
							</p>
						{/if}
						<p class="{DS_TYPE_CLASSES.meta} m-0 mt-0.5 text-[color:var(--ce-l-text-muted)]">
							{P129_ACTIVITY_LIST_ROW_TARGET_PREFIX}: {p129ActivityTargetLine(ev.target_type, ev.target_id)}
						</p>
						{#if ev.metadata && Object.keys(ev.metadata).length > 0}
							{@const metaLines = p129ActivityMetadataLines(ev.metadata)}
							{#if metaLines.length > 0}
								<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1.5 text-[color:var(--ce-l-text-muted)]">
									{P129_ACTIVITY_LIST_METADATA_HEADING}
								</p>
								<ul class="m-0 mt-0.5 list-none p-0 pl-0">
									{#each metaLines as line, mi (mi)}
										<li class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]">{line}</li>
									{/each}
								</ul>
							{/if}
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
		{#if errorMsg && events.length > 0}
			<div
				class="{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier} mt-3 border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
				data-testid="case-activity-list-error-append"
				role="alert"
			>
				<p class="{DS_BANNER_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-primary)]">{errorMsg}</p>
			</div>
		{/if}
	{/if}

	{#if canLoadMore}
		<div class="mt-3 shrink-0" data-testid="case-activity-load-more-wrap">
			<button
				type="button"
				class="rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-3 py-1.5 text-xs text-[color:var(--ce-l-text-primary)]"
				disabled={loadMoreBusy}
				data-testid="case-activity-load-more"
				on:click={onLoadMore}
			>
				{loadMoreBusy ? P129_ACTIVITY_LIST_LOADING : P129_ACTIVITY_LIST_LOAD_MORE}
			</button>
		</div>
	{/if}
</div>
