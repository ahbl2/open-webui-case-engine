<script lang="ts">
	import { onMount } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import {
		listCaseEngineOwuiUsers,
		updateCaseEngineOwuiUserStatus,
		updateCaseEngineOwuiUserRole,
		updateCaseEngineOwuiUserUnits,
		listCaseEngineLegacyUsers,
		disableCaseEngineLegacyUser,
		enableCaseEngineLegacyUser,
		type CaseEngineOwuiUserRow,
		type CaseEngineLegacyUserRow
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
	let activeOwui: CaseEngineOwuiUserRow[] = [];
	let disabledOwui: CaseEngineOwuiUserRow[] = [];
	let legacyUsers: CaseEngineLegacyUserRow[] = [];
	let approvalByUser: Record<string, ApprovalSettings> = {};
	let loading = true;
	let error = '';
	let acting: string | null = null;
	let unitsDropdownOpen: string | null = null;

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

	// P27-27: Active and disabled user unit-edit and enable/disable actions removed from this surface.
	// Users Overview (Admin → Users) is the single hierarchy-enforced mutation surface for those actions.
	// The functions below are retained only for the pending-approval flow.

	// P27-12: Derived from already-loaded active users — no extra fetch.
	$: currentSystemAdmin = activeOwui.find((u) => u.is_system_admin) ?? null;

	async function load() {
		const token = $caseEngineToken;
		if (!token) {
			error = 'Case Engine not connected. Sign in with an admin account that has workspace access.';
			loading = false;
			return;
		}
		error = '';
		try {
			const [pendingRows, activeRows, disabledRows, legacy] = await Promise.all([
				listCaseEngineOwuiUsers(token, 'pending'),
				listCaseEngineOwuiUsers(token, 'active'),
				listCaseEngineOwuiUsers(token, 'disabled'),
				listCaseEngineLegacyUsers(token)
			]);
			pending = pendingRows;
			activeOwui = activeRows;
			disabledOwui = disabledRows;
			legacyUsers = legacy;
			approvalByUser = {};
		} catch (e) {
			error = (e as Error).message ?? 'Failed to load users';
			pending = [];
			activeOwui = [];
			disabledOwui = [];
			legacyUsers = [];
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

	async function disableOwui(row: CaseEngineOwuiUserRow) {
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

	// P27-27: enableOwui removed — enable action for workspace users is now exclusively in Admin → Users.

	async function disableLegacy(row: CaseEngineLegacyUserRow) {
		const token = $caseEngineToken;
		if (!token) return;
		acting = `legacy:${row.id}`;
		try {
			await disableCaseEngineLegacyUser(token, row.id);
			toast.success(`Disabled ${row.name}`);
			await load();
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to disable');
		} finally {
			acting = null;
		}
	}

	async function enableLegacy(row: CaseEngineLegacyUserRow) {
		const token = $caseEngineToken;
		if (!token) return;
		acting = `legacy:${row.id}`;
		try {
			await enableCaseEngineLegacyUser(token, row.id);
			toast.success(`Enabled ${row.name}`);
			await load();
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to enable');
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

<div class="p-4 max-w-4xl space-y-8">
	<div>
		<h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
			{$i18n.t('Workspace Access')}
		</h1>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Approve or reject pending users, and manage API users. Active and disabled users are managed in the Users section.
		</p>
		<!-- P27-28: Role terminology note. -->
		<p class="text-xs text-gray-400 dark:text-gray-600 mt-1">
			CE Role (detective / admin) is the Case Engine operational role. Workspace Role (admin / user) is the app-side hierarchy shown on the Users page.
		</p>
	</div>

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
	{:else}

		<!-- P27-12: Current System Admin summary — derived from is_system_admin flag in loaded data. -->
		<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 text-sm">
			<span class="text-xs font-semibold bg-violet-500/20 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded uppercase shrink-0">SYS ADMIN</span>
			{#if currentSystemAdmin}
				<span class="text-gray-800 dark:text-gray-200 font-medium">
					{currentSystemAdmin.display_name ?? currentSystemAdmin.username_or_email}
				</span>
				{#if currentSystemAdmin.display_name && currentSystemAdmin.display_name !== currentSystemAdmin.username_or_email}
					<span class="text-gray-400 dark:text-gray-500 text-xs">{currentSystemAdmin.username_or_email}</span>
				{/if}
			{:else}
				<span class="text-gray-400 dark:text-gray-500 italic">No System Admin currently designated.</span>
			{/if}
		</div>

		<!-- Pending Users (approval queue) -->
		<section>
			<h2 class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">Pending Approval</h2>
			{#if pending.length === 0}
				<p class="text-sm text-gray-500 dark:text-gray-400">No pending users.</p>
			{:else}
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
					<table class="w-full text-sm text-left">
						<thead class="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
							<tr>
								<th class="px-4 py-2 font-medium">Email / Name</th>
								<th class="px-4 py-2 font-medium">Created</th>
								<th class="px-4 py-2 font-medium">CE Role</th>
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
											on:click={() => disableOwui(row)}
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
		</section>

		<!-- Active Workspace Users -->
		<!-- P27-27: Read-only view. Unit editing and enable/disable are managed in Admin → Users (hierarchy-enforced). -->
		<section>
			<h2 class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">Active Workspace Users</h2>
			<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">User management actions (enable/disable, unit assignment) are managed in the <a href="/admin/users/overview" class="underline hover:text-gray-700 dark:hover:text-gray-200">Users</a> section.</p>
			{#if activeOwui.length === 0}
				<p class="text-sm text-gray-500 dark:text-gray-400">No active workspace users.</p>
			{:else}
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
					<table class="w-full text-sm text-left">
						<thead class="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
							<tr>
								<th class="px-4 py-2 font-medium">Email / Name</th>
								<th class="px-4 py-2 font-medium">CE Role</th>
								<th class="px-4 py-2 font-medium">Units</th>
								<th class="px-4 py-2 font-medium">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
							{#each activeOwui as row}
								<tr class="text-gray-900 dark:text-gray-100">
									<td class="px-4 py-2">
										<span class="font-medium">{row.username_or_email}</span>
										{#if row.display_name}
											<span class="text-gray-500 dark:text-gray-400 block text-xs">{row.display_name}</span>
										{/if}
									</td>
									<td class="px-4 py-2 text-gray-500 dark:text-gray-400 capitalize">{row.role}</td>
									<td class="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">
										{unitsSummary(row.units ?? [])}
									</td>
									<td class="px-4 py-2">
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">active</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<!-- Disabled Workspace Users -->
		<!-- P27-27: Read-only view. Enable action is managed in Admin → Users (hierarchy-enforced). -->
		<section>
			<h2 class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">Disabled Workspace Users</h2>
			{#if disabledOwui.length === 0}
				<p class="text-sm text-gray-500 dark:text-gray-400">No disabled workspace users.</p>
			{:else}
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
					<table class="w-full text-sm text-left">
						<thead class="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
							<tr>
								<th class="px-4 py-2 font-medium">Email / Name</th>
								<th class="px-4 py-2 font-medium">CE Role</th>
								<th class="px-4 py-2 font-medium">Units</th>
								<th class="px-4 py-2 font-medium">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
							{#each disabledOwui as row}
								<tr class="text-gray-900 dark:text-gray-100">
									<td class="px-4 py-2">
										<span class="font-medium">{row.username_or_email}</span>
										{#if row.display_name}
											<span class="text-gray-500 dark:text-gray-400 block text-xs">{row.display_name}</span>
										{/if}
									</td>
									<td class="px-4 py-2 text-gray-500 dark:text-gray-400 capitalize">{row.role}</td>
									<td class="px-4 py-2">
										<span class="text-xs text-gray-500 dark:text-gray-400">{unitsSummary(row.units ?? [])}</span>
									</td>
									<td class="px-4 py-2">
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">disabled</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<!-- Legacy API Users -->
		<section>
			<h2 class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">API Users</h2>
			<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Direct API login accounts (not linked to workspace). Disabling prevents login and API access.</p>
			{#if legacyUsers.length === 0}
				<p class="text-sm text-gray-500 dark:text-gray-400">No API users found.</p>
			{:else}
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
					<table class="w-full text-sm text-left">
						<thead class="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
							<tr>
								<th class="px-4 py-2 font-medium">Name</th>
								<th class="px-4 py-2 font-medium">CE Role</th>
								<th class="px-4 py-2 font-medium">Status</th>
								<th class="px-4 py-2 font-medium w-32">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
							{#each legacyUsers as row}
								<tr class="text-gray-900 dark:text-gray-100">
									<td class="px-4 py-2 font-medium">{row.name}</td>
									<td class="px-4 py-2 text-gray-500 dark:text-gray-400">{row.role}</td>
									<td class="px-4 py-2">
										{#if row.status === 'active'}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">active</span>
										{:else}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">disabled</span>
										{/if}
									</td>
									<td class="px-4 py-2">
										{#if row.status === 'active'}
											<button
												class="px-2 py-1 rounded bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium disabled:opacity-50"
												disabled={acting !== null}
												on:click={() => disableLegacy(row)}
											>
												{acting === `legacy:${row.id}` ? '…' : 'Disable'}
											</button>
										{:else}
											<button
												class="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-50"
												disabled={acting !== null}
												on:click={() => enableLegacy(row)}
											>
												{acting === `legacy:${row.id}` ? '…' : 'Enable'}
											</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

	{/if}
</div>
