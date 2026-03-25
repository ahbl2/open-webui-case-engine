<script lang="ts">
	import { onMount } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import {
		listAdminCases,
		getAdminCaseAssignments,
		addCaseAssignment,
		revokeCaseAssignment,
		setCaseLead,
		clearCaseLead,
		listCaseEngineLegacyUsers,
		listCaseEngineOwuiUsers,
		type AdminCaseRow,
		type AdminCaseAssignment,
		type CaseEngineLegacyUserRow,
		type CaseEngineOwuiUserRow
	} from '$lib/apis/caseEngine';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	const i18n = getContext('i18n');

	let cases: AdminCaseRow[] = [];
	let selectedCase: AdminCaseRow | null = null;
	let assignments: AdminCaseAssignment[] = [];
	let legacyUsers: CaseEngineLegacyUserRow[] = [];
	let owuiUsers: CaseEngineOwuiUserRow[] = [];

	let loadingCases = true;
	let loadingAssignments = false;
	let acting: string | null = null;
	let error = '';

	// Add member UI state
	let showAddMember = false;
	let addMemberId = '';
	let addMemberIsLead = false;
	let caseSearch = '';

	$: filteredCases = caseSearch.trim()
		? cases.filter(
				(c) =>
					c.case_number.toLowerCase().includes(caseSearch.toLowerCase()) ||
					c.title.toLowerCase().includes(caseSearch.toLowerCase())
			)
		: cases;

	$: lead = assignments.find((a) => a.is_lead) ?? null;
	$: members = assignments.filter((a) => !a.is_lead);

	// P27-06: Risky assignment state detection for OPEN cases.
	$: isOpenCase = selectedCase?.status === 'OPEN';
	$: hasNoLead = isOpenCase && !lead;
	$: hasDisabledLead = isOpenCase && lead?.user_status === 'disabled';
	$: allAssignedDisabled =
		isOpenCase && assignments.length > 0 && assignments.every((a) => a.user_status === 'disabled');

	// Combined user list for the add-member picker (active users only — disabled users can't do case work)
	type PickerUser = { id: string; label: string; status: string; principalType: string };
	$: userPickerList = [
		...legacyUsers
			.filter((u) => !assignments.some((a) => a.user_id === u.id))
			.map((u): PickerUser => ({ id: u.id, label: `${u.name} [${u.role}]`, status: u.status, principalType: 'legacy' })),
		...owuiUsers
			.filter((u) => !assignments.some((a) => a.user_id === u.owui_user_id))
			.map((u): PickerUser => ({ id: u.owui_user_id, label: u.display_name ?? u.username_or_email, status: u.status, principalType: 'owui' }))
	];

	async function loadCases() {
		const token = $caseEngineToken;
		if (!token) {
			error = 'Not connected to Case Engine. Sign in as an admin.';
			loadingCases = false;
			return;
		}
		try {
			const [c, lu, ou] = await Promise.all([
				listAdminCases(token),
				listCaseEngineLegacyUsers(token),
				listCaseEngineOwuiUsers(token)
			]);
			cases = c;
			legacyUsers = lu;
			owuiUsers = ou;
		} catch (e) {
			error = (e as Error).message ?? 'Failed to load cases';
		} finally {
			loadingCases = false;
		}
	}

	async function selectCase(c: AdminCaseRow) {
		selectedCase = c;
		showAddMember = false;
		addMemberId = '';
		addMemberIsLead = false;
		await refreshAssignments();
	}

	async function refreshAssignments() {
		if (!selectedCase) return;
		const token = $caseEngineToken;
		if (!token) return;
		loadingAssignments = true;
		try {
			assignments = await getAdminCaseAssignments(token, selectedCase.id);
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to load assignments');
		} finally {
			loadingAssignments = false;
		}
	}

	async function handleSetLead(assignment: AdminCaseAssignment) {
		if (!selectedCase) return;
		const token = $caseEngineToken;
		if (!token) return;
		acting = `lead:${assignment.id}`;
		try {
			await setCaseLead(token, selectedCase.id, assignment.id);
			toast.success(`Lead set to ${assignment.user_name ?? assignment.user_id}`);
			await refreshAssignments();
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to set lead');
		} finally {
			acting = null;
		}
	}

	async function handleClearLead() {
		if (!selectedCase || !lead) return;
		const token = $caseEngineToken;
		if (!token) return;
		acting = 'clear-lead';
		try {
			await clearCaseLead(token, selectedCase.id);
			toast.success('Lead cleared');
			await refreshAssignments();
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to clear lead');
		} finally {
			acting = null;
		}
	}

	async function handleRemoveMember(assignment: AdminCaseAssignment) {
		if (!selectedCase) return;
		const token = $caseEngineToken;
		if (!token) return;
		acting = `remove:${assignment.id}`;
		try {
			await revokeCaseAssignment(token, selectedCase.id, assignment.id, {
				clearLead: assignment.is_lead,
				allowZeroAssignments: true,
				revoke_reason: 'admin_reassignment'
			});
			toast.success(`Removed ${assignment.user_name ?? assignment.user_id}`);
			await refreshAssignments();
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to remove member');
		} finally {
			acting = null;
		}
	}

	async function handleAddMember() {
		if (!selectedCase || !addMemberId) return;
		const token = $caseEngineToken;
		if (!token) return;
		acting = 'add-member';
		try {
			await addCaseAssignment(token, selectedCase.id, addMemberId, addMemberIsLead);
			toast.success('Member added');
			showAddMember = false;
			addMemberId = '';
			addMemberIsLead = false;
			await refreshAssignments();
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to add member');
		} finally {
			acting = null;
		}
	}

	onMount(() => {
		loadCases();
	});
</script>

<svelte:head>
	<title>Case Assignments • Admin</title>
</svelte:head>

<div class="p-4 max-w-5xl flex gap-6 h-full">

	<!-- Case list panel -->
	<div class="w-64 flex-none flex flex-col gap-2">
		<h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Cases</h2>

		{#if !$caseEngineToken}
			<p class="text-sm text-amber-600 dark:text-amber-400">Sign in as a Case Engine admin to manage assignments.</p>
		{:else if error}
			<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
		{:else if loadingCases}
			<p class="text-sm text-gray-500">Loading…</p>
		{:else}
			<input
				class="w-full text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1"
				placeholder="Search cases…"
				bind:value={caseSearch}
			/>
			<div class="flex-1 overflow-y-auto space-y-0.5 max-h-[calc(100vh-180px)]">
				{#each filteredCases as c}
					<button
						class="w-full text-left px-2 py-1.5 rounded text-sm {selectedCase?.id === c.id
							? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 font-medium'
							: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'} transition"
						on:click={() => selectCase(c)}
					>
						<span class="block font-mono text-xs text-gray-500 dark:text-gray-400">{c.case_number}</span>
						<span class="block truncate">{c.title}</span>
						<span class="text-xs text-gray-400">{c.unit} · {c.status}</span>
					</button>
				{/each}
				{#if filteredCases.length === 0}
					<p class="text-sm text-gray-500 px-2">No cases found.</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Assignment detail panel -->
	<div class="flex-1 min-w-0">
		{#if !selectedCase}
			<div class="flex items-center justify-center h-48 text-sm text-gray-400 dark:text-gray-600">
				Select a case to manage assignments.
			</div>
		{:else}
			<div class="space-y-6">
				<div>
					<h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedCase.title}</h1>
					<p class="text-sm text-gray-500 dark:text-gray-400">{selectedCase.case_number} · {selectedCase.unit} · {selectedCase.status}</p>
				</div>

			{#if loadingAssignments}
				<p class="text-sm text-gray-500">Loading assignments…</p>
			{:else}

				<!-- P27-06: Open-case risky assignment state warnings -->
				{#if hasNoLead}
					<div class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
						<p class="font-semibold">No lead assigned on an open case.</p>
						<p class="mt-0.5 text-amber-800 dark:text-amber-300">This case is operational but has no lead investigator. Assign a lead before this case can proceed.</p>
					</div>
				{:else if hasDisabledLead}
					<div class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
						<p class="font-semibold">Lead investigator is disabled on an open case.</p>
						<p class="mt-0.5 text-amber-800 dark:text-amber-300">Promote an active member to lead or add a new active member and promote them.</p>
					</div>
				{/if}
				{#if allAssignedDisabled}
					<div class="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-900 dark:text-red-200">
						<p class="font-semibold">All assigned members are disabled on an open case.</p>
						<p class="mt-0.5 text-red-800 dark:text-red-300">This case has no active investigators. Add at least one active member and assign a lead.</p>
					</div>
				{/if}

				<!-- Lead -->
					<section>
						<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Case Lead</h3>
						{#if lead}
							<div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
								<div class="flex-1 min-w-0">
									<span class="font-medium text-gray-900 dark:text-gray-100">{lead.user_name ?? lead.user_id}</span>
									<span class="ml-2 text-xs text-gray-500 dark:text-gray-400">{lead.principal_type}</span>
									{#if lead.user_status === 'disabled'}
										<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">disabled</span>
									{/if}
								</div>
								<button
									class="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 disabled:opacity-50"
									disabled={acting !== null}
									on:click={handleClearLead}
									title="Clear lead (does not remove from case)"
								>
									{acting === 'clear-lead' ? '…' : 'Clear Lead'}
								</button>
							</div>
						{:else}
							<p class="text-sm text-gray-500 dark:text-gray-400 italic">No lead assigned.</p>
						{/if}
					</section>

					<!-- Members -->
					<section>
						<div class="flex items-center justify-between mb-2">
							<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Members</h3>
							<button
								class="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
								disabled={acting !== null}
								on:click={() => { showAddMember = !showAddMember; addMemberId = ''; addMemberIsLead = false; }}
							>
								{showAddMember ? 'Cancel' : 'Add Member'}
							</button>
						</div>

						{#if showAddMember}
							<div class="mb-3 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 space-y-2">
								<label class="block text-xs font-medium text-gray-700 dark:text-gray-300">Select user</label>
								<select
									class="w-full text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1"
									bind:value={addMemberId}
									disabled={acting !== null}
								>
									<option value="">— choose user —</option>
									{#each userPickerList as u}
										<option value={u.id}>
											{u.label}{u.status === 'disabled' ? ' [disabled]' : ''}
										</option>
									{/each}
								</select>
								<label class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
									<input type="checkbox" bind:checked={addMemberIsLead} disabled={acting !== null} />
									Assign as lead
								</label>
								<button
									class="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
									disabled={acting !== null || !addMemberId}
									on:click={handleAddMember}
								>
									{acting === 'add-member' ? '…' : 'Confirm Add'}
								</button>
							</div>
						{/if}

						{#if members.length === 0 && !lead}
							<p class="text-sm text-gray-500 dark:text-gray-400 italic">No members assigned.</p>
						{:else if members.length === 0}
							<p class="text-sm text-gray-500 dark:text-gray-400 italic">No non-lead members.</p>
						{:else}
							<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
								<table class="w-full text-sm text-left">
									<thead class="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
										<tr>
											<th class="px-3 py-2 font-medium">User</th>
											<th class="px-3 py-2 font-medium">Type</th>
											<th class="px-3 py-2 font-medium">Status</th>
											<th class="px-3 py-2 font-medium w-36">Actions</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
										{#each members as m}
											<tr class="text-gray-900 dark:text-gray-100">
												<td class="px-3 py-2 font-medium">{m.user_name ?? m.user_id}</td>
												<td class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{m.principal_type}</td>
												<td class="px-3 py-2">
													{#if m.user_status === 'disabled'}
														<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">disabled</span>
													{:else if m.user_status}
														<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">{m.user_status}</span>
													{:else}
														<span class="text-xs text-gray-400">—</span>
													{/if}
												</td>
												<td class="px-3 py-2 flex gap-1">
													<button
														class="px-2 py-0.5 text-xs rounded bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50"
														disabled={acting !== null}
														on:click={() => handleSetLead(m)}
														title="Promote to lead"
													>
														{acting === `lead:${m.id}` ? '…' : 'Set Lead'}
													</button>
													<button
														class="px-2 py-0.5 text-xs rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
														disabled={acting !== null}
														on:click={() => handleRemoveMember(m)}
														title="Remove from case"
													>
														{acting === `remove:${m.id}` ? '…' : 'Remove'}
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</section>

				<!-- Disabled-lead quick-swap: promote options for active members -->
				{#if hasDisabledLead && members.length > 0}
					<div class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
						<p class="font-medium mb-2">Promote an existing active member to lead:</p>
						<div class="flex flex-wrap gap-2">
							{#each members.filter((m) => m.user_status !== 'disabled') as m}
								<button
									class="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
									disabled={acting !== null}
									on:click={() => handleSetLead(m)}
								>
									{acting === `lead:${m.id}` ? '…' : `Promote ${m.user_name ?? m.user_id}`}
								</button>
							{/each}
							{#if members.filter((m) => m.user_status !== 'disabled').length === 0}
								<span class="text-xs text-amber-700 dark:text-amber-300">All members are also disabled. Add an active member first.</span>
							{/if}
						</div>
					</div>
				{/if}

				{/if}
			</div>
		{/if}
	</div>

</div>
