<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		getCaseAudit,
		exportCaseAudit,
		getCaseDeleted,
		restoreTimelineEntry,
		restoreCaseFile,
		getCaseIntakeHistory
	} from '$lib/apis/caseEngine';
	import type { AuditLogItem, DeletedItemsResponse, IntakeHistoryResponse } from '$lib/apis/caseEngine';

	export let caseId: string;
	export let token: string;
	export let isAdmin: boolean = false;

	let auditItems: AuditLogItem[] = [];
	let auditLoading = false;
	let auditNextCursor: string | null = null;
	let actionFilter = '';
	let textFilter = '';

	let intakeHistory: IntakeHistoryResponse | null = null;
	let intakeLoading = false;
	let expandedIntakeId: string | null = null;

	let deletedData: DeletedItemsResponse | null = null;
	let deletedLoading = false;
	let restoreTarget: { type: 'entry' | 'file'; id: string } | null = null;

	let exportLoading = false;

	$: if (caseId && token) {
		loadAudit();
		loadIntakeHistory();
		if (isAdmin) loadDeleted();
	}

	async function loadAudit(cursor?: string) {
		auditLoading = true;
		try {
			const res = await getCaseAudit(caseId, token, {
				limit: 100,
				before: cursor,
				includeDeleted: isAdmin
			});
			if (cursor) {
				auditItems = [...auditItems, ...res.items];
			} else {
				auditItems = res.items;
			}
			auditNextCursor = res.next_cursor;
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load audit');
		} finally {
			auditLoading = false;
		}
	}

	async function loadIntakeHistory() {
		intakeLoading = true;
		try {
			intakeHistory = await getCaseIntakeHistory(caseId, token, {
				limit: 50,
				includeProposals: true,
				includeDeleted: isAdmin
			});
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load intake history');
		} finally {
			intakeLoading = false;
		}
	}

	async function loadDeleted() {
		if (!isAdmin) return;
		deletedLoading = true;
		try {
			deletedData = await getCaseDeleted(caseId, token);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Failed to load deleted items');
		} finally {
			deletedLoading = false;
		}
	}

	async function handleRestoreEntry(entryId: string) {
		restoreTarget = { type: 'entry', id: entryId };
	}

	async function handleRestoreFile(fileId: string) {
		restoreTarget = { type: 'file', id: fileId };
	}

	async function confirmRestore() {
		if (!restoreTarget) return;
		const { type, id } = restoreTarget;
		restoreTarget = null;
		try {
			if (type === 'entry') {
				await restoreTimelineEntry(caseId, id, token);
				toast.success('Entry restored');
			} else {
				await restoreCaseFile(caseId, id, token);
				toast.success('File restored');
			}
			loadDeleted();
			loadAudit();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Restore failed');
		}
	}

	function cancelRestore() {
		restoreTarget = null;
	}

	async function handleExportJson() {
		exportLoading = true;
		try {
			await exportCaseAudit(caseId, token, 'json', { includeDeleted: isAdmin });
			toast.success('Audit JSON downloaded');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Export failed');
		} finally {
			exportLoading = false;
		}
	}

	async function handleExportCsv() {
		exportLoading = true;
		try {
			await exportCaseAudit(caseId, token, 'csv', { includeDeleted: isAdmin });
			toast.success('Audit CSV downloaded');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Export failed');
		} finally {
			exportLoading = false;
		}
	}

	$: filteredAudit = auditItems.filter((item) => {
		if (actionFilter && item.action !== actionFilter) return false;
		if (textFilter) {
			const search = textFilter.toLowerCase();
			const str = JSON.stringify({
				action: item.action,
				entity_type: item.entity_type,
				entity_id: item.entity_id,
				details: item.details
			}).toLowerCase();
			if (!str.includes(search)) return false;
		}
		return true;
	});

	$: uniqueActions = [...new Set(auditItems.map((i) => i.action))].sort();
</script>

<div class="flex flex-col gap-6 p-4 max-h-full overflow-auto">
	<h2 class="text-sm font-medium">Integrity &amp; Audit Review</h2>

	<!-- 1) Audit Log Viewer -->
	<section class="flex flex-col gap-2">
		<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400">Audit Log</h3>
		<div class="flex flex-wrap gap-2 items-center">
			<select
				bind:value={actionFilter}
				class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
			>
				<option value="">All actions</option>
				{#each uniqueActions as action}
					<option value={action}>{action}</option>
				{/each}
			</select>
			<input
				type="text"
				bind:value={textFilter}
				placeholder="Search..."
				class="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 w-40"
			/>
		</div>
		<div class="border border-gray-200 dark:border-gray-700 rounded overflow-auto max-h-64">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
					<tr>
						<th class="text-left px-2 py-1.5">Time</th>
						<th class="text-left px-2 py-1.5">Action</th>
						<th class="text-left px-2 py-1.5">User</th>
						<th class="text-left px-2 py-1.5">Entity</th>
						<th class="text-left px-2 py-1.5 w-8"></th>
					</tr>
				</thead>
				<tbody>
					{#if auditLoading && auditItems.length === 0}
						<tr>
							<td colspan="5" class="px-2 py-4 text-gray-500">Loading...</td>
						</tr>
					{:else if filteredAudit.length === 0}
						<tr>
							<td colspan="5" class="px-2 py-4 text-gray-500">No audit records</td>
						</tr>
					{:else}
						{#each filteredAudit as item (item.id)}
							<tr class="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
								<td class="px-2 py-1 whitespace-nowrap text-xs">{item.created_at?.slice?.(0, 19) ?? item.created_at}</td>
								<td class="px-2 py-1">{item.action}</td>
								<td class="px-2 py-1">{item.user_role ?? item.user_id}</td>
								<td class="px-2 py-1">{item.entity_type} / {item.entity_id?.slice?.(0, 8)}</td>
								<td class="px-2 py-1">
									<details class="cursor-pointer">
										<summary class="text-xs text-gray-500">...</summary>
										<pre class="text-xs p-2 mt-1 bg-gray-100 dark:bg-gray-900 rounded max-h-32 overflow-auto">{JSON.stringify(item.details, null, 2)}</pre>
									</details>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
		{#if auditNextCursor}
			<button
				type="button"
				class="text-sm text-blue-600 dark:text-blue-400 hover:underline self-start"
				on:click={() => loadAudit(auditNextCursor!)}
				disabled={auditLoading}
			>
				Load more
			</button>
		{/if}
	</section>

	<!-- 2) AI Intake History -->
	<section class="flex flex-col gap-2">
		<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400">AI Intake History</h3>
		{#if intakeLoading}
			<div class="text-sm text-gray-500">Loading...</div>
		{:else if intakeHistory?.intakes?.length}
			<div class="border border-gray-200 dark:border-gray-700 rounded divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-auto">
				{#each intakeHistory.intakes as intake (intake.id)}
					<div class="p-2">
						<button
							type="button"
							class="w-full text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-2 py-1"
							on:click={() => (expandedIntakeId = expandedIntakeId === intake.id ? null : intake.id)}
						>
							<span class="text-sm">{intake.status} – {intake.created_at?.slice?.(0, 16) ?? ''}</span>
							<span class="text-xs text-gray-500">{expandedIntakeId === intake.id ? '▼' : '▶'}</span>
						</button>
						{#if expandedIntakeId === intake.id}
							<div class="mt-2 pl-2 space-y-2 text-sm border-l-2 border-gray-200 dark:border-gray-600">
								<details>
									<summary class="cursor-pointer text-gray-600 dark:text-gray-400">Raw text</summary>
									<pre class="text-xs p-2 bg-gray-100 dark:bg-gray-900 rounded mt-1 max-h-24 overflow-auto whitespace-pre-wrap">{intake.raw_text ?? ''}</pre>
								</details>
								{#if intake.proposals?.length}
									<div>
										<span class="text-gray-600 dark:text-gray-400">Proposals:</span>
										{#each intake.proposals as p (p.id)}
											<details class="mt-1">
												<summary class="cursor-pointer text-xs">{p.text_cleaned ?? p.text_original ?? '—'}</summary>
												<pre class="text-xs p-2 bg-gray-100 dark:bg-gray-900 rounded mt-1 overflow-auto">{p.text_original ?? ''}</pre>
											</details>
										{/each}
									</div>
								{/if}
								{#if intake.decided_outcome}
									<div class="text-xs">
										Decision: {intake.decided_outcome}
										{#if intake.decision_reason}
											– {intake.decision_reason}
										{/if}
										{#if intake.decided_at}
											by {intake.decided_by} at {intake.decided_at}
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-sm text-gray-500">No intake history</div>
		{/if}
	</section>

	<!-- 3) Deleted Items (ADMIN only – hidden entirely for non-admin) -->
	{#if isAdmin}
	<section class="flex flex-col gap-2">
		<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400">Deleted Items</h3>
			{#if deletedLoading}
				<div class="text-sm text-gray-500">Loading...</div>
			{:else if deletedData}
				<div class="space-y-2">
					{#if (deletedData.entries?.length ?? 0) > 0}
						<div>
							<span class="text-xs font-medium">Entries:</span>
							<ul class="list-disc list-inside text-sm">
								{#each deletedData.entries as e (e.id)}
									<li class="flex items-center gap-2">
										{e.occurred_at?.slice?.(0, 10)} – {e.type} – {e.text_original?.slice?.(0, 40)}...
										<button
											type="button"
											class="text-xs text-blue-600 hover:underline"
											on:click={() => handleRestoreEntry(e.id)}
										>Restore</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if (deletedData.files?.length ?? 0) > 0}
						<div>
							<span class="text-xs font-medium">Files:</span>
							<ul class="list-disc list-inside text-sm">
								{#each deletedData.files as f (f.id)}
									<li class="flex items-center gap-2">
										{f.original_filename}
										<button
											type="button"
											class="text-xs text-blue-600 hover:underline"
											on:click={() => handleRestoreFile(f.id)}
										>Restore</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if (deletedData.entries?.length ?? 0) === 0 && (deletedData.files?.length ?? 0) === 0 && (deletedData.intakes?.length ?? 0) === 0}
						<div class="text-sm text-gray-500">No deleted items</div>
					{/if}
				</div>
			{/if}
	</section>
	{/if}

	<!-- 4) Export Audit Logs -->
	<section class="flex flex-col gap-2">
		<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400">Export Audit Logs</h3>
		<p class="text-xs text-gray-600 dark:text-gray-400">
			Download the case-scoped audit log. Format: JSON (machine-readable) or CSV (spreadsheet).
		</p>
		<div class="flex gap-2">
			<button
				type="button"
				class="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
				on:click={handleExportJson}
				disabled={exportLoading}
			>
				Export Audit JSON
			</button>
			<button
				type="button"
				class="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
				on:click={handleExportCsv}
				disabled={exportLoading}
			>
				Export Audit CSV
			</button>
		</div>
	</section>

	<!-- Restore confirmation modal -->
	{#if restoreTarget}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
			role="dialog"
			aria-modal="true"
		>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-sm shadow-xl">
				<p class="text-sm mb-4">
					Restore this {restoreTarget.type === 'entry' ? 'entry' : 'file'}?
				</p>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600"
						on:click={cancelRestore}
					>
						Cancel
					</button>
					<button
						type="button"
						class="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
						on:click={confirmRestore}
					>
						Restore
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
