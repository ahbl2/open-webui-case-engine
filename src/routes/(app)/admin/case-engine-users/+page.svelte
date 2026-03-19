<script lang="ts">
	import { onMount } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import {
		listCaseEngineOwuiUsers,
		updateCaseEngineOwuiUserStatus,
		updateCaseEngineOwuiUserUnits,
		updateCaseEngineOwuiUserRole,
		type CaseEngineOwuiUserRow
	} from '$lib/apis/caseEngine';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	const i18n = getContext('i18n');

	const ROLE_OPTIONS: Array<{ value: 'detective' | 'admin'; label: string }> = [
		{ value: 'detective', label: 'Detective' },
		{ value: 'admin', label: 'Admin' }
	];
	const UNIT_OPTIONS = ['CID', 'SIU'] as const;

	type ApprovalSettings = { role: 'detective' | 'admin'; units: string[] };
	let pending: CaseEngineOwuiUserRow[] = [];
	let approvalByUser: Record<string, ApprovalSettings> = {};
	let loading = true;
	let error = '';
	let acting: string | null = null;

	function getApprovalSettings(row: CaseEngineOwuiUserRow): ApprovalSettings {
		if (!approvalByUser[row.owui_user_id]) {
			approvalByUser[row.owui_user_id] = { role: 'detective', units: ['CID', 'SIU'] };
		}
		return approvalByUser[row.owui_user_id];
	}
	function setRole(row: CaseEngineOwuiUserRow, role: 'detective' | 'admin') {
		getApprovalSettings(row);
		approvalByUser[row.owui_user_id].role = role;
		approvalByUser = approvalByUser;
	}
	function toggleUnit(row: CaseEngineOwuiUserRow, unit: string) {
		const s = getApprovalSettings(row);
		const units = s.units.includes(unit) ? s.units.filter((u) => u !== unit) : [...s.units, unit];
		approvalByUser[row.owui_user_id].units = units.length ? units : s.units;
		approvalByUser = approvalByUser;
	}
	function unitsSummary(units: string[]): string {
		return units.length === 0 ? 'None' : units.slice().sort().join(', ');
	}
	function openUnitsFor(row: CaseEngineOwuiUserRow) {
		unitsDropdownOpen = unitsDropdownOpen === row.owui_user_id ? null : row.owui_user_id;
	}
	let unitsDropdownOpen: string | null = null;

	async function load() {
		const token = $caseEngineToken;
		if (!token) {
			error = 'Case Engine not connected. Sign in with an admin account that has workspace access.';
			loading = false;
			return;
		}
		error = '';
		try {
			pending = await listCaseEngineOwuiUsers(token, 'pending');
			approvalByUser = {};
		} catch (e) {
			error = (e as Error).message ?? 'Failed to load pending users';
			pending = [];
		} finally {
			loading = false;
		}
	}

	async function approve(row: CaseEngineOwuiUserRow) {
		const token = $caseEngineToken;
		if (!token) return;
		const { role, units } = getApprovalSettings(row);
		if (units.length === 0) {
			toast.error('Select at least one unit');
			return;
		}
		acting = row.owui_user_id;
		try {
			await updateCaseEngineOwuiUserStatus(token, row.owui_user_id, 'active');
			await updateCaseEngineOwuiUserRole(token, row.owui_user_id, role);
			await updateCaseEngineOwuiUserUnits(token, row.owui_user_id, units);
			toast.success(`Approved ${row.username_or_email}`);
			await load();
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to approve');
		} finally {
			acting = null;
		}
	}

	async function disable(row: CaseEngineOwuiUserRow) {
		const token = $caseEngineToken;
		if (!token) return;
		acting = row.owui_user_id;
		try {
			await updateCaseEngineOwuiUserStatus(token, row.owui_user_id, 'disabled');
			toast.success(`Disabled ${row.username_or_email}`);
			await load();
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to disable');
		} finally {
			acting = null;
		}
	}

	onMount(() => {
		load();
	});

	function handleWindowClick(e: MouseEvent) {
		const el = (e.target as Element | null);
		if (unitsDropdownOpen != null && el && !el.closest('[data-units-dropdown]')) {
			unitsDropdownOpen = null;
		}
	}
</script>

<svelte:window on:click={handleWindowClick} />

<svelte:head>
	<title>Workspace Access • Admin</title>
</svelte:head>

<div class="p-4 max-w-4xl">
	<h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
		{$i18n.t('Workspace Access')}
	</h1>
	<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
		Approve or disable users who have signed up. Pending users cannot access the detective workspace until approved.
	</p>

	{#if !$caseEngineToken}
		<div class="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
			You must be signed in with workspace access (Case Engine admin) to manage users here. Use the main app and ensure your account is approved for the workspace.
		</div>
	{:else if error}
		<div class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-800 dark:text-red-200">
			{error}
		</div>
	{:else if loading}
		<p class="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
	{:else if pending.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">No pending users.</p>
	{:else}
		<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
			<table class="w-full text-sm text-left">
				<thead class="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
					<tr>
						<th class="px-4 py-2 font-medium">Email / Name</th>
						<th class="px-4 py-2 font-medium">Created</th>
						<th class="px-4 py-2 font-medium">Role</th>
						<th class="px-4 py-2 font-medium">Units</th>
						<th class="px-4 py-2 font-medium w-48">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each pending as row}
						{@const settings = getApprovalSettings(row)}
						<tr class="text-gray-900 dark:text-gray-100">
							<td class="px-4 py-2">
								<span class="font-medium">{row.username_or_email}</span>
								{#if row.display_name}
									<span class="text-gray-500 dark:text-gray-400 block text-xs">{row.display_name}</span>
								{/if}
							</td>
							<td class="px-4 py-2 text-gray-500 dark:text-gray-400">{row.created_at}</td>
							<td class="px-4 py-2">
								<select
									class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs py-1 px-2"
									value={settings.role}
									on:change={(e) => setRole(row, (e.currentTarget.value as 'detective' | 'admin'))}
									disabled={acting !== null}
								>
									{#each ROLE_OPTIONS as opt}
										<option value={opt.value}>{opt.label}</option>
									{/each}
								</select>
							</td>
							<td class="px-4 py-2 relative" data-units-dropdown>
								<button
									type="button"
									class="text-xs py-1 px-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 min-w-[5rem] text-left flex items-center justify-between gap-1"
									disabled={acting !== null}
									on:click={() => openUnitsFor(row)}
									title="Configure units"
								>
									<span>{unitsSummary(settings.units)}</span>
									<span class="text-gray-400" aria-hidden="true">▾</span>
								</button>
								{#if unitsDropdownOpen === row.owui_user_id}
									<div
										class="absolute left-0 top-full mt-0.5 z-10 py-1.5 px-2 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg"
										role="menu"
									>
										{#each UNIT_OPTIONS as unit}
											<label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
												<input
													type="checkbox"
													checked={settings.units.includes(unit)}
													on:change={() => toggleUnit(row, unit)}
													disabled={acting !== null}
													class="rounded border-gray-300 dark:border-gray-600"
												/>
												{unit}
											</label>
										{/each}
										<p class="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">At least one required</p>
									</div>
								{/if}
							</td>
							<td class="px-4 py-2 flex gap-2">
								<button
									class="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50"
									disabled={acting !== null || settings.units.length === 0}
									on:click={() => approve(row)}
								>
									{acting === row.owui_user_id ? '…' : 'Approve'}
								</button>
								<button
									class="px-2 py-1 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium disabled:opacity-50"
									disabled={acting !== null}
									on:click={() => disable(row)}
								>
									{acting === row.owui_user_id ? '…' : 'Disable'}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
