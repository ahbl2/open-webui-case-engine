<script lang="ts">
	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';
	import { WEBUI_NAME, config, user, showSidebar } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { onMount, getContext, onDestroy } from 'svelte';

	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	import localizedFormat from 'dayjs/plugin/localizedFormat';
	dayjs.extend(relativeTime);
	dayjs.extend(localizedFormat);

	import { toast } from 'svelte-sonner';

	import { updateUserRole, getUsers } from '$lib/apis/users';
	import { caseEngineToken } from '$lib/stores';
	import {
		detectCeAdminRoleMismatches,
		listCaseEngineOwuiUsers,
		repairCeAdminRoleAlignment,
		updateCaseEngineOwuiUserStatus,
		type CaseEngineOwuiUserRow
	} from '$lib/apis/caseEngine';

	import Pagination from '$lib/components/common/Pagination.svelte';
	import ChatBubbles from '$lib/components/icons/ChatBubbles.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	import EditUserModal from '$lib/components/admin/Users/UserList/EditUserModal.svelte';
	import UserChatsModal from '$lib/components/admin/Users/UserList/UserChatsModal.svelte';
	import AddUserModal from '$lib/components/admin/Users/UserList/AddUserModal.svelte';

	import Badge from '$lib/components/common/Badge.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import About from '$lib/components/chat/Settings/About.svelte';
	import Banner from '$lib/components/common/Banner.svelte';
	import Markdown from '$lib/components/chat/Messages/Markdown.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import ProfilePreview from '$lib/components/channel/Messages/Message/ProfilePreview.svelte';

	const i18n = getContext('i18n');

	let page = 1;

	let users = null;
	let total = null;

	let query = '';
	let searchDebounceTimer: ReturnType<typeof setTimeout>;
	let orderBy = 'created_at'; // default sort key
	let direction = 'asc'; // default sort order

	let selectedUser = null;

	let showAddUserModal = false;

	// P27-07: Case Engine OWUI user status map (keyed by owui_user_id === OWUI user.id).
	let ceUserMap = new Map<string, CaseEngineOwuiUserRow>();
	let ceActing: string | null = null;

	let showUserChatsModal = false;
	let showEditUserModal = false;

	const setSortKey = (key) => {
		if (orderBy === key) {
			direction = direction === 'asc' ? 'desc' : 'asc';
		} else {
			orderBy = key;
			direction = 'asc';
		}
		// P27-24: Clear CE-column client-sort when switching to a server-sort column.
		ceSortKey = '';
	};

	const getUserList = async () => {
		try {
			const res = await getUsers(localStorage.token, query, orderBy, direction, page).catch(
				(error) => {
					toast.error(`${error}`);
					return null;
				}
			);

			if (res) {
				users = res.users;
				total = res.total;
			}
		} catch (err) {
			console.error(err);
		}
	};

	$: if (query !== undefined) {
		clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			page = 1;
			getUserList();
		}, 300);
	}

	$: if (page !== null && orderBy !== null && direction !== null) {
		getUserList();
	}

	onDestroy(() => {
		clearTimeout(searchDebounceTimer);
	});

	// P27-07: Load Case Engine OWUI user statuses.
	const loadCeUsers = async () => {
		const token = $caseEngineToken;
		if (!token) {
			ceUserMap = new Map();
			return;
		}
		try {
			const ceUsers = await listCaseEngineOwuiUsers(token);
			ceUserMap = new Map(ceUsers.map((u) => [u.owui_user_id, u]));
		} catch (err) {
			ceUserMap = new Map();
		}
	};

	const disableOwuiUser = async (userId: string, name: string) => {
		const token = $caseEngineToken;
		if (!token) return;
		ceActing = userId;
		try {
			await updateCaseEngineOwuiUserStatus(token, userId, 'disabled');
			toast.success(`Disabled ${name}`);
			await Promise.all([getUserList(), loadCeUsers()]);
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to disable user');
		} finally {
			ceActing = null;
		}
	};

	const enableOwuiUser = async (userId: string, name: string) => {
		const token = $caseEngineToken;
		if (!token) return;
		ceActing = userId;
		try {
			await updateCaseEngineOwuiUserStatus(token, userId, 'active');
			toast.success(`Enabled ${name}`);
			await Promise.all([getUserList(), loadCeUsers()]);
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to enable user');
		} finally {
			ceActing = null;
		}
	};

	// Load CE statuses on mount alongside OWUI users.
	// Guard: only reload when the token value actually changes, not on every store emission.
	let _ceTokenRef: string | null | undefined;
	$: if ($caseEngineToken !== undefined && $caseEngineToken !== _ceTokenRef) {
		_ceTokenRef = $caseEngineToken;
		loadCeUsers();
	}

	// P27-10: Derive the CE row for the currently selected user so the modal can use it.
	$: selectedCeUser = selectedUser ? (ceUserMap.get(selectedUser.id) ?? undefined) : undefined;

	// P27-20: Derive the session user's CE profile for hierarchy enforcement in the modal.
	$: sessionCeUser = ceUserMap.get($user?.id ?? '');

	// P27-24: Client-side filter state — applied on top of the server-loaded user page.
	let filterRole: string = '';     // '' | 'sa' | 'admin' | 'user' | 'pending'
	let filterCeStatus: string = ''; // '' | 'active' | 'disabled' | 'pending' | 'not_linked'
	let filterUnit: string = '';     // '' | 'CID' | 'SIU'

	// P27-24: Client-side sort for CE-only columns (CE Status, Unit) that are not sortable server-side.
	// When ceSortKey is set it overrides the ordering within the already-loaded page.
	// When a server-sort column is clicked (setSortKey), ceSortKey is cleared.
	let ceSortKey: string = '';       // '' | 'ce_status' | 'unit'
	let ceSortDir: 'asc' | 'desc' = 'asc';

	function setCeSort(key: string) {
		if (ceSortKey === key) {
			ceSortDir = ceSortDir === 'asc' ? 'desc' : 'asc';
		} else {
			ceSortKey = key;
			ceSortDir = 'asc';
		}
	}

	// P27-24: Derived list — client-side filter and optional CE-column sort applied to current page data.
	$: displayUsers = (() => {
		let result = (users ?? []).filter((u) => {
			const ce = ceUserMap.get(u.id);

			// Role filter — 'sa' targets the is_system_admin flag; others target OWUI role.
			if (filterRole) {
				if (filterRole === 'sa') {
					if (!ce?.is_system_admin) return false;
				} else if (filterRole === 'admin') {
					// Exclude SA from the plain 'admin' filter so SYS ADMIN stays distinct.
					if (u.role !== 'admin' || ce?.is_system_admin) return false;
				} else {
					if (u.role !== filterRole) return false;
				}
			}

			// CE Status filter.
			if (filterCeStatus) {
				if (filterCeStatus === 'not_linked') {
					if (ce !== undefined) return false;
				} else {
					if (ce?.status !== filterCeStatus) return false;
				}
			}

			// Unit filter — user must have the selected unit assigned.
			if (filterUnit) {
				if (!(ce?.units ?? []).includes(filterUnit as 'CID' | 'SIU')) return false;
			}

			return true;
		});

		// Client-side sort for CE columns (overrides server order within the loaded page).
		if (ceSortKey) {
			// Stable sort order values: put unlinked users at end.
			const ceStatusOrder: Record<string, number> = { active: 0, pending: 1, disabled: 2 };
			result = [...result].sort((a, b) => {
				const ceA = ceUserMap.get(a.id);
				const ceB = ceUserMap.get(b.id);
				let cmp = 0;
				if (ceSortKey === 'ce_status') {
					const oA = ceA ? (ceStatusOrder[ceA.status] ?? 3) : 4;
					const oB = ceB ? (ceStatusOrder[ceB.status] ?? 3) : 4;
					cmp = oA - oB;
				} else if (ceSortKey === 'unit') {
					const uA = ceA?.units?.join(',') ?? '\uffff';
					const uB = ceB?.units?.join(',') ?? '\uffff';
					cmp = uA.localeCompare(uB);
				}
				return ceSortDir === 'asc' ? cmp : -cmp;
			});
		}

		return result;
	})();

	// P27-24: Count visible after filtering (for "X of Y" indicator).
	$: _filteredCount = displayUsers.length;
	$: _pageCount = (users ?? []).length;
	$: _filtersActive = filterRole !== '' || filterCeStatus !== '' || filterUnit !== '';

	function clearFilters() {
		filterRole = '';
		filterCeStatus = '';
		filterUnit = '';
	}

	// P27-23: Detect OWUI-admin / CE-detective mismatches in the current page.
	// A mismatch is an OWUI admin whose CE profile exists but has CE role !== 'admin' (and is not SA).
	$: adminRoleMismatches = (users ?? []).filter((u) => {
		if (u.role !== 'admin') return false;
		const ce = ceUserMap.get(u.id);
		return ce !== undefined && ce.role !== 'admin' && !ce.is_system_admin;
	});
	let repairActing = false;

	async function repairAdminRoles() {
		const token = $caseEngineToken;
		if (!token || adminRoleMismatches.length === 0) return;
		repairActing = true;
		try {
			const ids = adminRoleMismatches.map((u) => u.id);

			// P27-23b: Backend confirmed detection — compare with local detection before repairing.
			// Passes the OWUI admin IDs so the backend can confirm CE-side mismatches.
			// Any discrepancy between local and backend counts is logged for visibility.
			try {
				const backendDetection = await detectCeAdminRoleMismatches(token, ids);
				if (backendDetection.count !== ids.length) {
					console.warn(
						`[P27-23] Backend confirmed ${backendDetection.count} mismatches; frontend detected ${ids.length}. ` +
						`IDs not confirmed by backend: ${ids.filter((id) => !backendDetection.users.some((u) => u.owui_user_id === id)).join(', ')}`
					);
				}
			} catch {
				// Detection failure is non-blocking — repair can still proceed.
			}

			const result = await repairCeAdminRoleAlignment(token, ids);
			if (result.repaired.length > 0) {
				toast.success(`Repaired CE admin role for ${result.repaired.length} user(s)`);
			} else {
				toast.success('No changes needed — all users already aligned');
			}
			await loadCeUsers();
		} catch (e) {
			toast.error((e as Error).message ?? 'Repair failed');
		} finally {
			repairActing = false;
		}
	}
</script>

<AddUserModal
	bind:show={showAddUserModal}
	on:save={async () => {
		getUserList();
	}}
/>

<EditUserModal
	bind:show={showEditUserModal}
	{selectedUser}
	sessionUser={$user}
	ceUser={selectedCeUser}
	{sessionCeUser}
	on:save={async () => {
		getUserList();
		loadCeUsers();
	}}
	on:refresh={async () => {
		// P27-18: Modal stays open after inline auto-provision; sync ceUserMap without closing.
		loadCeUsers();
	}}
/>

{#if selectedUser}
	<UserChatsModal bind:show={showUserChatsModal} user={selectedUser} />
{/if}

{#if ($config?.license_metadata?.seats ?? null) !== null && total && total > $config?.license_metadata?.seats}
	<div class=" mt-1 mb-2 text-xs text-red-500">
		<Banner
			className="mx-0"
			banner={{
				type: 'error',
				title: 'License Error',
				content:
					'Exceeded the number of seats in your license. Please contact support to increase the number of seats.'
			}}
		/>
	</div>
{/if}

{#if users === null || total === null}
	<div class="my-10">
		<Spinner className="size-5" />
	</div>
{:else}
	<div
		class="pt-0.5 pb-1 gap-1 flex flex-col md:flex-row justify-between sticky top-0 z-10 bg-white dark:bg-gray-900"
	>
		<div class="flex md:self-center text-lg font-medium px-0.5 gap-2">
			<div class="flex-shrink-0">
				{$i18n.t('Users')}
			</div>

			<div>
				{#if ($config?.license_metadata?.seats ?? null) !== null}
					{#if total > $config?.license_metadata?.seats}
						<span class="text-lg font-medium text-red-500"
							>{total} of {$config?.license_metadata?.seats}
							<span class="text-sm font-normal">{$i18n.t('available users')}</span></span
						>
					{:else}
						<span class="text-lg font-medium text-gray-500 dark:text-gray-300"
							>{total} of {$config?.license_metadata?.seats}
							<span class="text-sm font-normal">{$i18n.t('available users')}</span></span
						>
					{/if}
				{:else}
					<span class="text-lg font-medium text-gray-500 dark:text-gray-300">{total}</span>
				{/if}
			</div>
		</div>

		<div class="flex gap-1">
			<div class=" flex w-full space-x-2">
				<div class="flex flex-1">
					<div class=" self-center ml-1 mr-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-4 h-4"
						>
							<path
								fill-rule="evenodd"
								d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<input
						class=" w-full text-sm pr-4 py-1 rounded-r-xl outline-hidden bg-transparent"
						bind:value={query}
						aria-label={$i18n.t('Search')}
						placeholder={$i18n.t('Search')}
					/>
				</div>

				<div>
					<Tooltip content={$i18n.t('Add User')}>
						<button
							class=" p-2 rounded-xl hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-850 transition font-medium text-sm flex items-center space-x-1"
							on:click={() => {
								showAddUserModal = !showAddUserModal;
							}}
						>
							<Plus className="size-3.5" />
						</button>
					</Tooltip>
				</div>
			</div>
		</div>
	</div>

	<!-- P27-24: Client-side filter bar — Role, CE Status, Unit. -->
	<div class="flex flex-wrap items-center gap-2 mb-2">
		<!-- Workspace Role filter -->
		<select
			bind:value={filterRole}
			class="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 px-2 py-1 outline-none cursor-pointer"
			aria-label="Filter by Workspace Role"
		>
			<option value="">All Workspace Roles</option>
			<option value="sa">SYS ADMIN</option>
			<option value="admin">Admin</option>
			<option value="user">User</option>
			<option value="pending">Pending</option>
		</select>

		<!-- CE Status filter -->
		<select
			bind:value={filterCeStatus}
			class="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 px-2 py-1 outline-none cursor-pointer"
			aria-label="Filter by CE Status"
		>
			<option value="">All CE Status</option>
			<option value="active">Active</option>
			<option value="disabled">Disabled</option>
			<option value="pending">Pending approval</option>
			<option value="not_linked">Not linked</option>
		</select>

		<!-- Unit filter -->
		<select
			bind:value={filterUnit}
			class="text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-700 dark:text-gray-300 px-2 py-1 outline-none cursor-pointer"
			aria-label="Filter by Unit"
		>
			<option value="">All Units</option>
			<option value="CID">CID</option>
			<option value="SIU">SIU</option>
		</select>

		<!-- Clear filters + count indicator -->
		{#if _filtersActive}
			<button
				type="button"
				class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
				on:click={clearFilters}
			>
				Clear filters
			</button>
			<span class="text-xs text-gray-400 dark:text-gray-500">
				{_filteredCount} of {_pageCount} on this page
			</span>
		{/if}
	</div>

	<!-- P27-23: Admin-role repair banner — shown when OWUI admins have CE role 'detective' (pre-P27-22 mismatch). -->
	{#if $caseEngineToken && adminRoleMismatches.length > 0}
		<div class="mb-3 flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3.5 py-2.5">
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
			</svg>
			<div class="flex-1 min-w-0">
				<p class="text-xs font-medium text-amber-800 dark:text-amber-300">
					{adminRoleMismatches.length} admin user{adminRoleMismatches.length > 1 ? 's have' : ' has'} a Case Engine role mismatch (CE role = detective instead of admin).
				</p>
				<p class="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
					These users will not appear as System Admin transfer targets until repaired.
				</p>
			</div>
			<button
				type="button"
				class="flex-shrink-0 px-2.5 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50"
				disabled={repairActing}
				on:click={repairAdminRoles}
			>
				{repairActing ? '…' : 'Repair'}
			</button>
		</div>
	{/if}

	<div class="scrollbar-hidden relative whitespace-nowrap overflow-x-auto max-w-full">
		<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400 table-auto max-w-full">
			<thead class="text-xs text-gray-800 uppercase bg-transparent dark:text-gray-200">
				<tr class=" border-b-[1.5px] border-gray-50 dark:border-gray-850/30">
					<th
						scope="col"
						class="px-2.5 py-2 cursor-pointer select-none"
						on:click={() => setSortKey('role')}
					>
					<div class="flex gap-1.5 items-center">
						Workspace Role

						{#if orderBy === 'role'}
								<span class="font-normal"
									>{#if direction === 'asc'}
										<ChevronUp className="size-2" />
									{:else}
										<ChevronDown className="size-2" />
									{/if}
								</span>
							{:else}
								<span class="invisible">
									<ChevronUp className="size-2" />
								</span>
							{/if}
						</div>
					</th>
					<th
						scope="col"
						class="px-2.5 py-2 cursor-pointer select-none"
						on:click={() => setSortKey('name')}
					>
						<div class="flex gap-1.5 items-center">
							{$i18n.t('Name')}

							{#if orderBy === 'name'}
								<span class="font-normal"
									>{#if direction === 'asc'}
										<ChevronUp className="size-2" />
									{:else}
										<ChevronDown className="size-2" />
									{/if}
								</span>
							{:else}
								<span class="invisible">
									<ChevronUp className="size-2" />
								</span>
							{/if}
						</div>
					</th>
					<th
						scope="col"
						class="px-2.5 py-2 cursor-pointer select-none"
						on:click={() => setSortKey('email')}
					>
						<div class="flex gap-1.5 items-center">
							{$i18n.t('Email')}

							{#if orderBy === 'email'}
								<span class="font-normal"
									>{#if direction === 'asc'}
										<ChevronUp className="size-2" />
									{:else}
										<ChevronDown className="size-2" />
									{/if}
								</span>
							{:else}
								<span class="invisible">
									<ChevronUp className="size-2" />
								</span>
							{/if}
						</div>
					</th>

					<th
						scope="col"
						class="px-2.5 py-2 cursor-pointer select-none"
						on:click={() => setSortKey('last_active_at')}
					>
						<div class="flex gap-1.5 items-center">
							{$i18n.t('Last Active')}

							{#if orderBy === 'last_active_at'}
								<span class="font-normal"
									>{#if direction === 'asc'}
										<ChevronUp className="size-2" />
									{:else}
										<ChevronDown className="size-2" />
									{/if}
								</span>
							{:else}
								<span class="invisible">
									<ChevronUp className="size-2" />
								</span>
							{/if}
						</div>
					</th>
					<th
						scope="col"
						class="px-2.5 py-2 cursor-pointer select-none"
						on:click={() => setSortKey('created_at')}
					>
						<div class="flex gap-1.5 items-center">
							{$i18n.t('Created at')}
							{#if orderBy === 'created_at'}
								<span class="font-normal"
									>{#if direction === 'asc'}
										<ChevronUp className="size-2" />
									{:else}
										<ChevronDown className="size-2" />
									{/if}
								</span>
							{:else}
								<span class="invisible">
									<ChevronUp className="size-2" />
								</span>
							{/if}
						</div>
					</th>

	<!-- CE Status = CE account lifecycle (active / disabled) or linkage state (pending / not linked).
	     Lifecycle states use colored badges; linkage states use italic plain text.
	     Distinct from Role and System Admin identity.
	     P27-24: Client-side sortable. -->
	<th
		scope="col"
		class="px-2.5 py-2 cursor-pointer select-none"
		on:click={() => setCeSort('ce_status')}
	>
		<div class="flex gap-1.5 items-center">
			CE Status
			{#if ceSortKey === 'ce_status'}
				<span class="font-normal">
					{#if ceSortDir === 'asc'}<ChevronUp className="size-2" />{:else}<ChevronDown className="size-2" />{/if}
				</span>
			{:else}
				<span class="invisible"><ChevronUp className="size-2" /></span>
			{/if}
		</div>
	</th>

	<!-- P27-17: Unit column — CID/SIU from CE backend truth. Empty/dash if not linked.
	     P27-24: Client-side sortable. -->
	<th
		scope="col"
		class="px-2.5 py-2 cursor-pointer select-none"
		on:click={() => setCeSort('unit')}
	>
		<div class="flex gap-1.5 items-center">
			Units
			{#if ceSortKey === 'unit'}
				<span class="font-normal">
					{#if ceSortDir === 'asc'}<ChevronUp className="size-2" />{:else}<ChevronDown className="size-2" />{/if}
				</span>
			{:else}
				<span class="invisible"><ChevronUp className="size-2" /></span>
			{/if}
		</div>
	</th>

			<th scope="col" class="px-2.5 py-2 text-right" />
				</tr>
			</thead>
		<tbody class="">
		{#each displayUsers as user, userIdx (user.id)}
				{@const ceUser = ceUserMap.get(user.id)}
				<tr class="bg-white dark:bg-gray-900 dark:border-gray-850 text-xs">
						<td class="px-3 py-1 min-w-[7rem] w-28">
					<button
							class=" translate-y-0.5"
							aria-label="Edit user"
							on:click={() => {
								selectedUser = user;
								showEditUserModal = !showEditUserModal;
							}}
						>
							<!-- P27-11: True System Admin (backend is_system_admin flag) → violet SYS ADMIN badge. -->
							{#if ceUser?.is_system_admin}
								<span class="text-xs font-medium bg-violet-500/20 text-violet-700 dark:text-violet-300 w-fit px-[5px] rounded-lg uppercase line-clamp-1 mr-0.5">SYS ADMIN</span>
							{:else}
								<Badge
									type={user.role === 'admin' ? 'info' : user.role === 'user' ? 'success' : 'muted'}
									content={$i18n.t(user.role)}
								/>
							{/if}
						</button>
						</td>
						<td class="px-3 py-1 font-medium text-gray-900 dark:text-white max-w-48">
							<div class="flex items-center gap-2">
								<ProfilePreview {user} side="right" align="center" sideOffset={6}>
									<img
										class="rounded-full w-6 min-w-6 h-6 object-cover mr-0.5 flex-shrink-0"
										src={`${WEBUI_API_BASE_URL}/users/${user.id}/profile/image`}
										alt="user"
									/>
								</ProfilePreview>

								<div class="font-medium truncate">{user.name}</div>

								{#if user?.last_active_at && Date.now() / 1000 - user.last_active_at < 180}
									<div>
										<span class="relative flex size-1.5">
											<span
												class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
											></span>
											<span class="relative inline-flex size-1.5 rounded-full bg-green-500"></span>
										</span>
									</div>
								{/if}
							</div>
						</td>
						<td class=" px-3 py-1"> {user.email} </td>

						<td class=" px-3 py-1">
							{dayjs(user.last_active_at * 1000).fromNow()}
						</td>

					<td class=" px-3 py-1">
						{dayjs(user.created_at * 1000).format('LL')}
					</td>

			<!-- CE Status column.
			     Lifecycle states (active / disabled) → colored badge pill.
			     Linkage/pending states → italic plain text, visually distinct.
			     This prevents admins from reading "Pending approval" as the
			     same kind of state as "Disabled". -->
			<td class="px-3 py-1">
				{#if ceUser?.status === 'active'}
						<!-- CE lifecycle: account is active -->
						<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Active</span>
					{:else if ceUser?.status === 'disabled'}
						<!-- CE lifecycle: account access has been disabled by an admin -->
						<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Disabled</span>
					{:else if ceUser?.status === 'pending'}
						<!-- CE linkage: user exists in CE but has not been approved yet.
						     NOT a lifecycle/access state — shown as plain text, not a badge. -->
						<span class="text-xs text-amber-600 dark:text-amber-400 italic">Pending approval</span>
					{:else}
			<!-- CE linkage: no CE record exists for this OWUI user.
					     NOT an account state — shown as plain text, not a badge. -->
					<span class="text-xs text-gray-400 dark:text-gray-500 italic">Not linked</span>
				{/if}
			</td>

		<!-- P27-17: Unit column. Show backend units for CE-linked users; dash otherwise. -->
		<td class="px-3 py-1">
			{#if ceUser?.units && ceUser.units.length > 0}
				<span class="text-xs font-medium">{ceUser.units.join(', ')}</span>
			{:else}
				<span class="text-xs text-gray-400 dark:text-gray-500 italic">—</span>
			{/if}
		</td>

				<td class="px-3 py-1 text-right">
						<div class="flex justify-end w-full">
							{#if $config.features.enable_admin_chat_access && user.role !== 'admin'}
								<Tooltip content={$i18n.t('Chats')}>
									<button
										class="self-center w-fit text-sm px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
										aria-label={$i18n.t('Chats')}
										on:click={async () => {
											showUserChatsModal = !showUserChatsModal;
											selectedUser = user;
										}}
									>
										<ChatBubbles />
									</button>
								</Tooltip>
							{/if}

							<Tooltip content={$i18n.t('Edit User')}>
								<button
									class="self-center w-fit text-sm px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl"
									aria-label={$i18n.t('Edit User')}
									on:click={async () => {
										showEditUserModal = !showEditUserModal;
										selectedUser = user;
									}}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="w-4 h-4"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
										/>
									</svg>
								</button>
							</Tooltip>

				<!-- P27-07/P27-10/P27-20: Disable / Enable replaces Delete. No hard-delete path.
				     P27-11: CE System Admin never shows the Disable action — transfer required first.
				     P27-20: Hierarchy enforcement — actor must strictly outrank target.
				       SA (rank 3) > Admin (rank 2) > Detective (rank 1).
				       Non-SA admins (rank 2) cannot enable/disable other admins or the SA (rank ≥ 2). -->
				{#if $caseEngineToken}
					{@const _actorRank = sessionCeUser?.is_system_admin ? 3 : (sessionCeUser?.role === 'admin' ? 2 : 1)}
					{@const _targetRank = ceUser?.is_system_admin ? 3 : (ceUser?.role === 'admin' ? 2 : 1)}
					{@const _canManage = _actorRank > _targetRank}
					{#if ceUser?.status === 'disabled' && _canManage}
						<!-- Enable: shown only when actor outranks target. -->
						<Tooltip content={$i18n.t('Enable workspace access')}>
							<button
								class="self-center w-fit text-sm px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-green-600 dark:text-green-400"
								aria-label={$i18n.t('Enable User')}
								disabled={ceActing !== null}
								on:click={() => enableOwuiUser(user.id, user.name)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
								</svg>
							</button>
						</Tooltip>
					{:else if (ceUser?.status === 'active' || ceUser?.status === 'pending') && !ceUser?.is_system_admin && _canManage}
						<!-- Disable: hidden for SA (no direct disable allowed) and cross-rank violations. -->
						<Tooltip content={$i18n.t('Disable workspace access')}>
							<button
								class="self-center w-fit text-sm px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-red-500 dark:hover:text-red-400"
								aria-label={$i18n.t('Disable User')}
								disabled={ceActing !== null}
								on:click={() => disableOwuiUser(user.id, user.name)}
							>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
									<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
								</svg>
							</button>
						</Tooltip>
					{/if}
				{/if}
						</div>
					</td>
					</tr>
			{/each}
			<!-- P27-32: Empty state when client-side filters return no results on the current page. -->
			{#if _filtersActive && _filteredCount === 0}
				<tr>
					<td colspan="8" class="px-3 py-8 text-center text-xs text-gray-400 dark:text-gray-500">
						No users match the active filters on this page.
						<button
							type="button"
							class="underline hover:text-gray-600 dark:hover:text-gray-300 ml-1"
							on:click={clearFilters}
						>Clear filters</button>
						or use the search field to find users across all pages.
					</td>
				</tr>
			{/if}
		</tbody>
		</table>
	</div>

	<!-- P27-29: Merged stale ⓘ hint + P27-28 terminology footnote into one cleaner note. -->
	<div class="text-gray-400 dark:text-gray-600 text-xs mt-1.5 text-right">
		ⓘ Click a user's Workspace Role to open the editor. Workspace Role controls app/admin hierarchy; CE Role (detective/admin) is shown in Workspace Access.
	</div>

	<!-- P27-32: Hide server-side pagination when client-side filters are active.
	     Pagination navigates server pages and reapplies the filter to a fresh load,
	     which can produce unexpectedly sparse or empty views. Instead, show a note
	     pointing to the search field, which is server-side and works across all pages. -->
	{#if total > 30}
		{#if _filtersActive}
			<p class="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
				Filters apply to this page only ({_pageCount} loaded). Clear filters or use the search field to find users across all {total} users.
			</p>
		{:else}
			<Pagination bind:page count={total} perPage={30} />
		{/if}
	{/if}
{/if}

{#if !$config?.license_metadata}
	{#if total > 50}
		<div class="text-sm">
			<Markdown
				content={`
> [!NOTE]
> # **Hey there! 👋**
>
> It looks like you have over 50 users, that usually falls under organizational usage.
> 
> Open WebUI is completely free to use as-is, with no restrictions or hidden limits, and we'd love to keep it that way. 🌱  
>
> By supporting the project through sponsorship or an enterprise license, you’re not only helping us stay independent, you’re also helping us ship new features faster, improve stability, and grow the project for the long haul. With an *enterprise license*, you also get additional perks like dedicated support, customization options, and more, all at a fraction of what it would cost to build and maintain internally.  
> 
> Your support helps us stay independent and continue building great tools for everyone. 💛
> 
> - 👉 **[Click here to learn more about enterprise licensing](https://docs.openwebui.com/enterprise)**
> - 👉 *[Click here to sponsor the project on GitHub](https://github.com/sponsors/tjbck)*
`}
			/>
		</div>
	{/if}
{/if}
