<script lang="ts">
	/**
	 * P19-14 — Case Activity Route
	 *
	 * Route-native activity/audit page for the case workspace.
	 * Renders inside the P19-06 case shell layout.
	 *
	 * Shows the case audit log from Case Engine — who did what and when.
	 * This is the authoritative backend audit trail, not a frontend-synthesized
	 * shadow log. All activity items reflect real backend events.
	 *
	 * Backend endpoint used:
	 *   GET /cases/:id/audit   — paginated audit log, newest first
	 *
	 * Limitations honestly stated:
	 *   - The audit log reflects actions that were recorded with ENTRY_CREATE,
	 *     ENTRY_UPDATE, FILE_UPLOAD, etc. — it does not show OWUI chat activity.
	 *   - Pagination is supported; this page loads 50 items per page.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import { getCaseAudit, type AuditLogItem } from '$lib/apis/caseEngine';

	const caseId = $page.params.id;

	let items: AuditLogItem[] = [];
	let loading = true;
	let loadError = '';
	let nextCursor: string | null = null;
	let loadingMore = false;
	/** Client-side filter: show only items with this action ('' = all). Uses already-loaded data only. */
	let filterAction = '';

	const PAGE_SIZE = 50;

	$: uniqueActions = [...new Set(items.map((i) => i.action))].sort();
	$: displayedItems = !filterAction ? items : items.filter((i) => i.action === filterAction);

	async function loadActivity(cursor?: string): Promise<void> {
		if (!$caseEngineToken) return;
		if (cursor) {
			loadingMore = true;
		} else {
			loading = true;
			loadError = '';
			items = [];
		}
		try {
			const result = await getCaseAudit(caseId, $caseEngineToken, {
				limit: PAGE_SIZE,
				cursor
			});
			items = cursor ? [...items, ...result.items] : result.items;
			nextCursor = result.next_cursor ?? null;
		} catch (e: unknown) {
			loadError = e instanceof Error ? e.message : 'Failed to load activity';
		} finally {
			loading = false;
			loadingMore = false;
		}
	}

	onMount(() => { loadActivity(); });

	/**
	 * Map an audit action string to a human-readable label.
	 * Returns the raw action if no mapping exists, so nothing is hidden.
	 */
	function actionLabel(action: string): string {
		const map: Record<string, string> = {
			CASE_CREATE:          'Case created',
			CASE_UPDATE:          'Case updated',
			CASE_DELETE_SOFT:     'Case deleted',
			CASE_RESTORE:         'Case restored',
			ENTRY_CREATE:         'Timeline entry added',
			ENTRY_UPDATE:         'Timeline entry edited',
			ENTRY_DELETE_SOFT:    'Timeline entry deleted',
			ENTRY_RESTORE:        'Timeline entry restored',
			FILE_UPLOAD:          'File uploaded',
			FILE_DELETE_SOFT:     'File deleted',
			FILE_RESTORE:         'File restored',
			FILE_EXTRACT_TEXT:    'File text extracted',
			INTAKE_SUBMITTED:     'Intake submitted',
			INTAKE_PROPOSED:      'Intake proposed (AI)',
			INTAKE_APPROVED_AND_COMMITTED: 'Intake approved and committed',
			INTAKE_REJECTED:      'Intake rejected',
			NOTEBOOK_NOTE_CREATED:  'Working note created',
			NOTEBOOK_NOTE_VERSION_CREATED: 'Working note updated',
			NOTEBOOK_NOTE_DELETED:  'Working note deleted',
			NOTEBOOK_NOTE_RESTORED: 'Working note restored',
			PROPOSAL_CREATED:     'Proposal created',
			PROPOSAL_UPDATED:     'Proposal updated',
			PROPOSAL_APPROVED:    'Proposal approved',
			PROPOSAL_REJECTED:    'Proposal rejected',
			PROPOSAL_COMMITTED:   'Proposal committed to record',
			EVIDENCE_TAG_ADDED:   'Evidence tag added',
			EVIDENCE_TAG_REMOVED: 'Evidence tag removed',
			AUTH_LOGIN_SUCCESS:   'Login',
			CASE_EXPORT_AUDIT_LOG: 'Audit log exported',
			CASE_EXPORT_RUNNING_NOTES: 'Running notes exported'
		};
		return map[action] ?? action;
	}

	/**
	 * Entity type → readable label.
	 */
	function entityLabel(entityType: string): string {
		const map: Record<string, string> = {
			case:           'Case',
			timeline_entry: 'Entry',
			case_file:      'File',
			intake:         'Intake',
			notebook_note:  'Note',
			proposal_record: 'Proposal'
		};
		return map[entityType] ?? entityType;
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleString(undefined, {
				month: 'short', day: 'numeric', year: 'numeric',
				hour: '2-digit', minute: '2-digit'
			});
		} catch {
			return iso;
		}
	}

	/** Actor display: role + short user id from backend. No fabrication. */
	function actorLabel(item: AuditLogItem): string {
		const role = item.user_role ? `${item.user_role} ` : '';
		const id = item.user_id ? item.user_id.slice(0, 8) : '—';
		return `${role}${id}`.trim() || '—';
	}

	/** Case relevance: entity type + short id. */
	function caseRelevanceLabel(item: AuditLogItem): string {
		return `${entityLabel(item.entity_type)} ${item.entity_id.slice(0, 8)}`;
	}

	/** Metadata keys we skip when rendering details (internal/noise). */
	const DETAIL_SKIP_KEYS = new Set(['_metadata_parse_error', '_raw_metadata']);

	/** Useful metadata entries from backend details, for display only. */
	function detailEntries(item: AuditLogItem): Array<{ k: string; v: string }> {
		const d = item.details;
		if (!d || typeof d !== 'object') return [];
		return Object.entries(d)
			.filter(([k, v]) => !DETAIL_SKIP_KEYS.has(k) && v !== undefined && v !== null)
			.map(([k, v]) => ({ k, v: String(v) }))
			.slice(0, 8);
	}

	/**
	 * Color-code audit actions for quick scanning.
	 */
	function actionBadgeClass(action: string): string {
		if (action.includes('_CREATE') || action.includes('_SUBMITTED') || action.includes('_UPLOAD')) {
			return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
		}
		if (action.includes('_DELETE')) {
			return 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400';
		}
		if (action.includes('_RESTORE') || action.includes('_COMMITTED')) {
			return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
		}
		if (action.includes('_UPDATE') || action.includes('_APPROVED') || action.includes('_REJECTED')) {
			return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
		}
		return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
	}
</script>

<!--
	Case Activity — Backend Audit Log
	Shows real backend-recorded events for this case, not a frontend-synthesized log.
	This page renders inside the P19-06 case shell (+layout.svelte).
-->
<div
	class="flex flex-col h-full overflow-y-auto"
	data-testid="case-activity-page"
>
	<!-- Section header -->
	<div
		class="shrink-0 flex flex-wrap items-center gap-2 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800"
	>
		<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Case Activity</h2>
		<span class="text-xs text-gray-400 dark:text-gray-500">
			— backend audit trail, newest first
		</span>
		{#if items.length > 0}
			<label class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span>Filter:</span>
				<select
					class="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs py-1 px-2"
					bind:value={filterAction}
				>
					<option value="">All</option>
					{#each uniqueActions as action}
						<option value={action}>{actionLabel(action)}</option>
					{/each}
				</select>
			</label>
		{/if}
		<button
			type="button"
			class="ml-auto text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
			on:click={() => loadActivity()}
			title="Refresh activity"
		>
			Refresh
		</button>
	</div>

	<!-- Activity feed -->
	<div class="flex-1 px-4 pt-3 pb-4 min-h-0">
		{#if loading}
			<div class="flex items-center justify-center h-32">
				<p class="text-sm text-gray-400 dark:text-gray-500" data-testid="case-activity-loading">
					Loading activity…
				</p>
			</div>
		{:else if loadError}
			<div class="flex items-center justify-center h-24">
				<p class="text-sm text-red-500 dark:text-red-400">{loadError}</p>
			</div>
		{:else if items.length === 0}
			<div
				class="flex flex-col items-center justify-center h-32 gap-1"
				data-testid="case-activity-empty"
			>
				<p class="text-sm text-gray-400 dark:text-gray-500">No activity recorded yet.</p>
				<p class="text-xs text-gray-300 dark:text-gray-600">
					Activity appears here as case actions are performed.
				</p>
			</div>
		{:else if displayedItems.length === 0}
			<div class="flex flex-col items-center justify-center h-24 gap-1">
				<p class="text-sm text-gray-400 dark:text-gray-500">No activity matches the selected filter.</p>
				<p class="text-xs text-gray-500 dark:text-gray-500">Choose “All” or another action.</p>
			</div>
		{:else}
			<ol
				class="flex flex-col gap-px"
				data-testid="case-activity-list"
				aria-label="Case activity feed"
			>
				{#each displayedItems as item (item.id)}
					<li
						class="py-3 px-3 border-b border-gray-100 dark:border-gray-800/80 last:border-0 rounded-sm hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
						data-testid="case-activity-item"
					>
						<!-- Row 1: Timestamp · Actor -->
						<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
							<time datetime={item.created_at} class="font-medium text-gray-600 dark:text-gray-300">
								{formatDate(item.created_at)}
							</time>
							<span class="text-gray-300 dark:text-gray-600" aria-hidden="true">·</span>
							<span title="Actor (from backend)"> {actorLabel(item)}</span>
						</div>

						<!-- Row 2: Action + case relevance -->
						<div class="flex flex-wrap items-center gap-2 min-w-0">
							<span
								class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap
								       {actionBadgeClass(item.action)}"
							>
								{actionLabel(item.action)}
							</span>
							<span class="text-xs text-gray-500 dark:text-gray-400 truncate" title={item.entity_type + ' ' + item.entity_id}>
								{caseRelevanceLabel(item)}
							</span>
						</div>

						<!-- Row 3: Metadata when available (backend details only) -->
						{#if detailEntries(item).length > 0}
							<dl class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 dark:text-gray-500">
								{#each detailEntries(item) as { k, v }}
									<span class="inline"><span class="text-gray-400 dark:text-gray-500">{k}:</span> <span class="font-mono text-gray-500 dark:text-gray-400">{v.length > 32 ? v.slice(0, 32) + '…' : v}</span></span>
								{/each}
							</dl>
						{/if}
					</li>
				{/each}
			</ol>

			<!-- Load more -->
			{#if nextCursor}
				<div class="flex justify-center pt-4">
					<button
						type="button"
						disabled={loadingMore}
						class="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
						on:click={() => loadActivity(nextCursor ?? undefined)}
						data-testid="case-activity-load-more"
					>
						{loadingMore ? 'Loading…' : 'Load more'}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
