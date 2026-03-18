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

	const PAGE_SIZE = 50;

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
		class="shrink-0 flex items-center gap-2 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800"
	>
		<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Case Activity</h2>
		<span class="text-xs text-gray-400 dark:text-gray-500">
			— backend audit trail, newest first
		</span>
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
		{:else}
			<ol
				class="flex flex-col gap-px"
				data-testid="case-activity-list"
				aria-label="Case activity feed"
			>
				{#each items as item (item.id)}
					<li
						class="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-800/60 last:border-0"
						data-testid="case-activity-item"
					>
						<!-- Action badge -->
						<span
							class="shrink-0 mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded whitespace-nowrap
							       {actionBadgeClass(item.action)}"
						>
							{actionLabel(item.action)}
						</span>

						<!-- Entity context -->
						<div class="flex-1 min-w-0">
							<p class="text-xs text-gray-500 dark:text-gray-400 truncate">
								<span class="text-gray-400 dark:text-gray-500">{entityLabel(item.entity_type)}</span>
								<span class="font-mono text-gray-300 dark:text-gray-600 ml-1 select-all">{item.entity_id.slice(0, 8)}</span>
							</p>
						</div>

						<!-- Actor + timestamp -->
						<div class="shrink-0 text-right">
							<p class="text-xs text-gray-600 dark:text-gray-400">
								{item.user_role ? `${item.user_role} ` : ''}{item.user_id.slice(0, 8)}
							</p>
							<p class="text-xs text-gray-400 dark:text-gray-500">{formatDate(item.created_at)}</p>
						</div>
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
