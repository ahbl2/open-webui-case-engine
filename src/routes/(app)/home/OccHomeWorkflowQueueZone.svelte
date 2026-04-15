<script lang="ts">
	/**
	 * P131.6-01 — Workflow / task queue placement zone.
	 * P131.6-02 — Explicit empty state (no workspace task API; factual copy only).
	 * P131.6-03 — Optional error surface when parent wires a failed request (none today).
	 * P131.6-04 — Section label (h3) for assistive tech.
	 * P131.7-06 — Command-center row chrome + filter strip (data wiring unchanged; queue remains empty until API exists).
	 */
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';

	import { DS_BADGE_CLASSES, DS_BTN_CLASSES, DS_OCC_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import OccStateContainer from '$lib/components/operator/OccStateContainer.svelte';

	const i18n = getContext('i18n');

	export let hasError = false;
	export let onRetry: (() => void) | undefined = undefined;
	export let retryDisabled = false;

	type WfFilter = 'all' | 'overdue' | 'today' | 'week';
	let wfFilter: WfFilter = 'all';

	/** Factual counts for an empty queue (no workspace-wide task list API yet). */
	const WF_COUNT_ALL = 0;
	const WF_COUNT_OVERDUE = 0;
	const WF_COUNT_TODAY = 0;
	const WF_COUNT_WEEK = 0;

	type WfIcon = 'doc' | 'signal' | 'vehicle' | 'legal' | 'forensics';
	type WfBucket = 'overdue' | 'today' | 'week';

	type HomeWorkflowTaskRow = {
		id: string;
		title: string;
		caseRef: string;
		context: string;
		icon: WfIcon;
		bucket: WfBucket;
		dueDateLabel: string;
	};

	/** Populated when a workspace task feed exists; markup + CSS are ready. */
	const HOME_WORKFLOW_TASKS: HomeWorkflowTaskRow[] = [];

	function wfBucketBadgeClass(bucket: WfBucket): string {
		if (bucket === 'overdue') return DS_BADGE_CLASSES.danger;
		if (bucket === 'today') return DS_BADGE_CLASSES.warning;
		return DS_BADGE_CLASSES.info;
	}

	function goTasks(): void {
		void goto('/cases');
	}
</script>

<section
	class="{DS_OCC_CLASSES.mainSection} min-w-0"
	data-testid="occ-home-workflow-queue-zone"
	aria-labelledby="occ-home-workflow-heading"
>
	<div class={DS_OCC_CLASSES.boardCardHeader}>
		<div class={DS_OCC_CLASSES.sectionHeaderRow}>
			<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
				<h3
					id="occ-home-workflow-heading"
					class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
				>
					{$i18n.t('Workflow / task queue')}
				</h3>
			</div>
			<button type="button" class="{DS_BTN_CLASSES.ghost} text-sm shrink-0" on:click={goTasks}>
				{$i18n.t('View all tasks →')}
			</button>
		</div>
	</div>
	<div class={DS_OCC_CLASSES.boardCardBody}>
		<div class="ds-occ-cwf">
			<div
				class="ds-occ-cwf-filters"
				role="tablist"
				aria-label={$i18n.t('Workflow task filters')}
			>
				<button
					type="button"
					class="ds-occ-cwf-filters__pill {wfFilter === 'all' ? 'ds-occ-cwf-filters__pill--active' : ''}"
					role="tab"
					aria-selected={wfFilter === 'all'}
					on:click={() => (wfFilter = 'all')}
				>
					{$i18n.t('All Tasks')}
					<span class="ds-occ-cwf-filters__count">({WF_COUNT_ALL})</span>
				</button>
				<button
					type="button"
					class="ds-occ-cwf-filters__pill {wfFilter === 'overdue' ? 'ds-occ-cwf-filters__pill--active' : ''}"
					role="tab"
					aria-selected={wfFilter === 'overdue'}
					on:click={() => (wfFilter = 'overdue')}
				>
					{$i18n.t('Overdue')}
					<span class="ds-occ-cwf-filters__count">({WF_COUNT_OVERDUE})</span>
				</button>
				<button
					type="button"
					class="ds-occ-cwf-filters__pill {wfFilter === 'today' ? 'ds-occ-cwf-filters__pill--active' : ''}"
					role="tab"
					aria-selected={wfFilter === 'today'}
					on:click={() => (wfFilter = 'today')}
				>
					{$i18n.t('Today')}
					<span class="ds-occ-cwf-filters__count">({WF_COUNT_TODAY})</span>
				</button>
				<button
					type="button"
					class="ds-occ-cwf-filters__pill {wfFilter === 'week' ? 'ds-occ-cwf-filters__pill--active' : ''}"
					role="tab"
					aria-selected={wfFilter === 'week'}
					on:click={() => (wfFilter = 'week')}
				>
					{$i18n.t('This Week')}
					<span class="ds-occ-cwf-filters__count">({WF_COUNT_WEEK})</span>
				</button>
			</div>
			<div class="ds-occ-cwf-state">
				<OccStateContainer
					{hasError}
					{onRetry}
					{retryDisabled}
					isLoading={false}
					isEmpty={!hasError}
					emptyTitle={$i18n.t('No tasks found.')}
					emptySubtext={$i18n.t('Items will appear here when available.')}
					regionMinClass="min-h-[6rem]"
				>
					<div class="ds-occ-cwf-task-list" role="list">
						{#each HOME_WORKFLOW_TASKS as t (t.id)}
							<div class="ds-occ-cwf-task-row" role="listitem">
								<div class="ds-occ-cwf-task-row__check">
									<input type="checkbox" disabled aria-disabled="true" tabindex="-1" />
								</div>
								<div
									class="ds-occ-cwf-task-row__icon ds-occ-cwf-task-row__icon--{t.icon}"
									aria-hidden="true"
								>
									{#if t.icon === 'doc'}
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
										</svg>
									{:else if t.icon === 'signal'}
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 5.304a3.75 3.75 0 0 0 0-5.304m-7.425 7.425a6.75 6.75 0 0 1 0-9.546m9.546 9.546a6.75 6.75 0 0 0 0-9.546M4.5 19.5l15-15" />
										</svg>
									{:else if t.icon === 'vehicle'}
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0h.375c.621 0 1.125.504 1.125 1.125V21M18 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h.375c.621 0 1.125.504 1.125 1.125V21M4.5 3.75h15l-1.5 6h-12l-1.5-6Z" />
										</svg>
									{:else if t.icon === 'legal'}
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 3h-1.5c-.621 0-1.125.504-1.125 1.125v15.75c0 .621.504 1.125 1.125 1.125h1.5m-13.5 0h1.5c.621 0 1.125-.504 1.125-1.125V4.125c0-.621-.504-1.125-1.125-1.125h-1.5" />
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.575.395a2.25 2.25 0 0 1-2.25-2.25v-2.835a2.25 2.25 0 0 1 2.25-2.25h2.835a2.25 2.25 0 0 1 2.25 2.25v2.835a2.25 2.25 0 0 1-2.25 2.25h-2.835a2.25 2.25 0 0 1-2.25-2.25v-2.835Z" />
										</svg>
									{/if}
								</div>
								<div class="ds-occ-cwf-task-row__text">
									<p class="ds-occ-cwf-task-row__title">{t.title}</p>
									<p class="ds-occ-cwf-task-row__sub">
										{t.caseRef}
										{#if t.context}
											<span aria-hidden="true"> · </span>
											{t.context}
										{/if}
									</p>
								</div>
								<div class="ds-occ-cwf-task-row__meta">
									<span class={wfBucketBadgeClass(t.bucket)}>
										{#if t.bucket === 'overdue'}
											{$i18n.t('OVERDUE')}
										{:else if t.bucket === 'today'}
											{$i18n.t('TODAY')}
										{:else}
											{$i18n.t('THIS WEEK')}
										{/if}
									</span>
									<span class="ds-occ-cwf-task-row__date">{t.dueDateLabel}</span>
								</div>
							</div>
						{/each}
					</div>
				</OccStateContainer>
			</div>
		</div>
	</div>
</section>
