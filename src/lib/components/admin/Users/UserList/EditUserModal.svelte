<script lang="ts">
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import { createEventDispatcher } from 'svelte';
	import { getContext } from 'svelte';

	import { updateUserById } from '$lib/apis/users';
	import { caseEngineToken } from '$lib/stores';
	import {
		listCaseEngineOwuiUsers,
		provisionCeUser,
		transferCeSystemAdmin,
		updateCaseEngineOwuiUserUnits,
		type CaseEngineOwuiUserRow,
		type CaseEngineUnit
	} from '$lib/apis/caseEngine';

	import Modal from '$lib/components/common/Modal.svelte';
	import localizedFormat from 'dayjs/plugin/localizedFormat';
	import XMark from '$lib/components/icons/XMark.svelte';
	import SensitiveInput from '$lib/components/common/SensitiveInput.svelte';
	import UserProfileImage from '$lib/components/chat/Settings/Account/UserProfileImage.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();
	dayjs.extend(localizedFormat);

	export let show = false;
	export let selectedUser;
	export let sessionUser;
	/** P27-10: CE row for the selected user; undefined when user has no CE profile. */
	export let ceUser: CaseEngineOwuiUserRow | undefined = undefined;
	/** P27-20: CE row for the session (actor) user; used for hierarchy enforcement. */
	export let sessionCeUser: CaseEngineOwuiUserRow | undefined = undefined;

	$: if (show) {
		init();
	}

	const init = () => {
		if (selectedUser) {
			_user = selectedUser;
			_user.password = '';
			// Initialise CE unit edit draft from current backend values.
			ceEditUnits = [...(ceUser?.units ?? [])];
			// P27-11: Load available transfer targets when editing the System Admin.
			availableAdmins = [];
			transferTarget = '';
			// P27-18: Clear inline provision notice on each fresh modal open.
			provisionedInline = false;
			// P27-19: Clear awaiting-refresh flag on each fresh modal open.
			_awaitingCeRefresh = false;
			if (ceUser?.is_system_admin) {
				loadAvailableAdmins();
			}
		}
	};

	let _user = {
		profile_image_url: '',
		role: 'pending',
		name: '',
		email: '',
		password: ''
	};

	// P27-10: CE unit edit state for this modal.
	const CE_UNIT_OPTIONS = ['CID', 'SIU'] as const;
	let ceEditUnits: CaseEngineUnit[] = [];
	let ceUnitActing = false;

	// P27-11: System Admin transfer state.
	let availableAdmins: CaseEngineOwuiUserRow[] = [];
	let transferTarget = '';
	let transferActing = false;

	// P27-16: CE profile provision state (for non-linked users).
	let provisionActing = false;

	// P27-18: Set to true when submitHandler auto-provisions inline; shows a success note in the modal.
	let provisionedInline = false;

	// P27-19: True between dispatch('refresh') and the parent's refreshed ceUser prop arriving.
	// Prevents the template from briefly flashing the "Not linked" section during that gap.
	let _awaitingCeRefresh = false;

	// P27-19: When the parent's refreshed ceUser prop arrives after inline auto-provision,
	// seed ceEditUnits from the backend-truth value and clear the awaiting-refresh flag.
	$: if (ceUser && _awaitingCeRefresh) {
		ceEditUnits = [...(ceUser.units ?? [])];
		_awaitingCeRefresh = false;
	}

	// P27-20: Hierarchy ranks — SA (3) > Admin (2) > Detective (1).
	// Used to gate mutation controls so the UI matches backend authority rules.
	// P27-31: Use CE role (sessionCeUser.role) for actor rank, matching the table's derivation.
	// Self password reset is gated by isSelf separately and is unaffected by this.
	$: _actorRank = sessionCeUser?.is_system_admin ? 3 : (sessionCeUser?.role === 'admin' ? 2 : 1);
	$: _targetRank = ceUser?.is_system_admin ? 3 : (ceUser?.role === 'admin' ? 2 : 1);
	/** True when the session actor can manage the target: actor rank > target rank. */
	$: canManageTarget = _actorRank > _targetRank;
	/** True when the actor is editing their own account (self-manage). */
	$: isSelf = selectedUser?.id === sessionUser?.id;

	async function loadAvailableAdmins() {
		const token = $caseEngineToken;
		if (!token) return;
		try {
		const all = await listCaseEngineOwuiUsers(token, 'active');
		availableAdmins = all.filter((u) => u.role === 'admin' && !u.is_system_admin);
		transferTarget = availableAdmins[0]?.owui_user_id ?? '';
		} catch {
			availableAdmins = [];
		}
	}

	async function doTransfer() {
		const token = $caseEngineToken;
		if (!token || !transferTarget) return;
		transferActing = true;
		try {
			await transferCeSystemAdmin(token, transferTarget);
			toast.success('System Admin transferred');
			dispatch('save');
			show = false;
		} catch (e) {
			toast.error((e as Error).message ?? 'Transfer failed');
		} finally {
			transferActing = false;
		}
	}

	async function doProvision() {
		const token = $caseEngineToken;
		if (!token || !selectedUser) return;
		provisionActing = true;
		try {
			// P27-22: Provision with CE role matching OWUI role so admin users get CE rank 2 (not detective).
			const ceRole = _user?.role === 'admin' ? 'admin' : 'detective';
			await provisionCeUser(token, selectedUser.id, selectedUser.email, selectedUser.name ?? null, ceRole);
			toast.success('Case Engine profile created');
			dispatch('save');
			show = false;
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to create CE profile');
		} finally {
			provisionActing = false;
		}
	}

	function toggleCeUnit(unit: CaseEngineUnit) {
		const next = ceEditUnits.includes(unit)
			? ceEditUnits.filter((u) => u !== unit)
			: [...ceEditUnits, unit];
		// Prevent deselecting the last unit.
		ceEditUnits = next.length > 0 ? next : ceEditUnits;
	}

	async function saveCeUnits() {
		const token = $caseEngineToken;
		if (!token || !ceUser) return;
		if (ceEditUnits.length === 0) {
			toast.error('Select at least one unit');
			return;
		}
		ceUnitActing = true;
		try {
			await updateCaseEngineOwuiUserUnits(token, ceUser.owui_user_id, ceEditUnits);
			toast.success('Units updated');
			dispatch('save');
		} catch (e) {
			toast.error((e as Error).message ?? 'Failed to update units');
		} finally {
			ceUnitActing = false;
		}
	}

	const submitHandler = async () => {
		const res = await updateUserById(localStorage.token, selectedUser.id, _user).catch((error) => {
			toast.error(`${error}`);
		});

		if (!res) return;

		// P27-17/P27-18: Auto-provision CE profile when admin saves a non-linked user with an
		// active/approved role. On success, stay open and refresh CE state from backend truth
		// (P27-18) rather than closing the modal and forcing a reopen to reach unit controls.
		const token = $caseEngineToken;
		const needsProvision = !ceUser && _user.role !== 'pending' && !!token;

		if (needsProvision) {
			try {
				// P27-22: Provision with CE role matching OWUI role so OWUI admins become CE admins (rank 2).
				const ceRole = _user.role === 'admin' ? 'admin' : 'detective';
				await provisionCeUser(token!, selectedUser.id, selectedUser.email, selectedUser.name ?? null, ceRole);

				// P27-19: Parent owns the single CE reload. Set flags before dispatching so the
				// template bridges the gap between dispatch and prop arrival without flashing
				// "Not linked". ceUser and ceEditUnits update via the reactive statement below
				// when the parent's refreshed prop arrives.
				provisionedInline = true;
				_awaitingCeRefresh = true;
				dispatch('refresh');
				return;
			} catch {
				// Provision failed: fall through to normal close behavior.
				// The manual "Link to Case Engine" button remains as a fallback.
			}
		}

		dispatch('save');
		show = false;
	};


</script>

<Modal size="sm" bind:show>
	<div>
		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4 pb-2">
			<div class=" text-lg font-medium self-center">{$i18n.t('Edit User')}</div>
			<button
				class="self-center"
				aria-label={$i18n.t('Close')}
				on:click={() => {
					show = false;
				}}
			>
				<XMark className={'size-5'} />
			</button>
		</div>

		<div class="flex flex-col md:flex-row w-full md:space-x-4 dark:text-gray-200">
			<div class=" flex flex-col w-full sm:flex-row sm:justify-center sm:space-x-6">
				<form
					class="flex flex-col w-full"
					on:submit|preventDefault={() => {
						submitHandler();
					}}
				>
					<div class=" px-5 pt-3 pb-5 w-full">
						<div class="flex self-center w-full">
							<div class=" self-start h-full mr-6">
								<UserProfileImage
									imageClassName="size-14"
									bind:profileImageUrl={_user.profile_image_url}
									user={_user}
								/>
							</div>

							<div class=" flex-1">
								<div class="overflow-hidden w-ful mb-2">
									<div class=" self-center capitalize font-medium truncate">
										{selectedUser.name}
									</div>

									<div class="text-xs text-gray-500">
										{$i18n.t('Created at')}
										{dayjs(selectedUser.created_at * 1000).format('LL')}
									</div>
								</div>

								<div class=" flex flex-col space-y-1.5">
									<!-- P27-29: User Groups section removed — Groups tab removed in P27-25. -->

									<div class="flex flex-col w-full">
										<div class=" mb-1 text-xs text-gray-500">Workspace Role</div>

										<div class="flex-1">
											<select
												class="w-full text-sm bg-transparent disabled:text-gray-500 dark:disabled:text-gray-500 outline-hidden"
												bind:value={_user.role}
												aria-label={$i18n.t('Role')}
												disabled={_user.id == sessionUser.id}
												required
											>
												<option value="admin">{$i18n.t('Admin')}</option>
												<option value="user">{$i18n.t('User')}</option>
												<option value="pending">{$i18n.t('Pending')}</option>
											</select>
										</div>
									</div>

									<div class="flex flex-col w-full">
										<div class=" mb-1 text-xs text-gray-500">{$i18n.t('Name')}</div>

										<div class="flex-1">
											<input
												class="w-full text-sm bg-transparent outline-hidden"
												type="text"
												bind:value={_user.name}
												aria-label={$i18n.t('Name')}
												placeholder={$i18n.t('Enter Your Name')}
												autocomplete="off"
												required
											/>
										</div>
									</div>

									<div class="flex flex-col w-full">
										<div class=" mb-1 text-xs text-gray-500">{$i18n.t('Email')}</div>

										<div class="flex-1">
											<input
												class="w-full text-sm bg-transparent disabled:text-gray-500 dark:disabled:text-gray-500 outline-hidden"
												type="email"
												bind:value={_user.email}
												aria-label={$i18n.t('Email')}
												placeholder={$i18n.t('Enter Your Email')}
												autocomplete="off"
												required
											/>
										</div>
									</div>

									{#if _user?.oauth}
										<div class="flex flex-col w-full">
											<div class=" mb-1 text-xs text-gray-500">{$i18n.t('OAuth ID')}</div>

											<div class="flex-1 text-sm break-all mb-1 flex flex-col space-y-1">
												{#each Object.keys(_user.oauth) as key}
													<div>
														<span class="text-gray-500">{key}</span>
														<span class="">{_user.oauth[key]?.sub}</span>
													</div>
												{/each}
											</div>
										</div>
									{/if}

								<!-- P27-20: Password reset — visible only when actor outranks target (canManageTarget)
								     or when editing one's own account (isSelf).
								     Backend password management is handled by OWUI; this is a UI-level guard. -->
								{#if canManageTarget || isSelf}
									<div class="flex flex-col w-full">
										<div class=" mb-1 text-xs text-gray-500">{$i18n.t('New Password')}</div>

										<div class="flex-1">
											<SensitiveInput
												class="w-full text-sm bg-transparent outline-hidden"
												type="password"
												aria-label={$i18n.t('New Password')}
												placeholder={$i18n.t('Enter New Password')}
												bind:value={_user.password}
												autocomplete="new-password"
												required={false}
											/>
										</div>
									</div>
								{/if}
								</div>
							</div>
						</div>

			<!-- P27-10/P27-11/P27-15/P27-16/P27-17/P27-18: Case Engine section.
			     ceUser is defined  → user has a CE profile (show status + units).
			     ceUser is undefined → user has no CE profile (show Not linked + provision action).
			     Unit editing is gated on ceUser.status === 'active' AND sessionUser.role === 'admin'.
			     Ordinary users see units read-only only.
			     P27-18: After inline auto-provision, ceUser is locally updated and provisionedInline
			     is true — modal stays open so admin can assign units without reopening. -->
				{#if ceUser}
					<div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col space-y-2">
						<div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Case Engine</div>

						<!-- P27-18: Inline provision success notice — visible only immediately after auto-provision. -->
						{#if provisionedInline}
							<div class="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
								<svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
								</svg>
								Case Engine profile created — assign units below.
							</div>
						{/if}

							<!-- P27-11: System Admin block — shown only when backend is_system_admin is true. -->
							{#if ceUser.is_system_admin}
									<div class="flex flex-col space-y-2 p-2.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700">
										<div class="flex items-center gap-2">
											<span class="text-xs font-semibold bg-violet-500/20 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded uppercase">SYS ADMIN</span>
											<span class="text-xs text-gray-500 dark:text-gray-400">This account holds the System Admin role.</span>
										</div>
										<p class="text-[11px] text-amber-700 dark:text-amber-400">
											This account cannot be disabled directly. Transfer the System Admin role to another active admin first.
										</p>
										<!-- Transfer section -->
										{#if $caseEngineToken}
											<div class="flex flex-col space-y-1.5 pt-1">
												<div class="text-xs text-gray-500">Transfer to active admin</div>
												{#if availableAdmins.length === 0}
													<!-- P27-22: Eligible targets must be CE-linked active CE admins. OWUI admins without CE profiles don't appear here — link them to Case Engine first. -->
													<p class="text-xs text-gray-400 italic">No eligible active admins available. Admins must be linked to Case Engine before they can receive the System Admin role.</p>
												{:else}
													<select
														bind:value={transferTarget}
														class="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
													>
														{#each availableAdmins as admin}
															<option value={admin.owui_user_id}>
																{admin.display_name ?? admin.username_or_email}
															</option>
														{/each}
													</select>
													<button
														type="button"
														class="self-start px-2.5 py-1 text-xs rounded bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50"
														disabled={transferActing || !transferTarget}
														on:click={doTransfer}
													>
														{transferActing ? '…' : 'Transfer System Admin'}
													</button>
												{/if}
											</div>
										{/if}
									</div>
							{/if}

							<!-- CE lifecycle status — always shown for CE-linked users.
							     Mirrors the CE Status column in the users table. -->
							<div class="flex items-center gap-2">
								<span class="text-xs text-gray-500">CE Status</span>
								{#if ceUser.status === 'active'}
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Active</span>
								{:else if ceUser.status === 'disabled'}
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Disabled</span>
								{:else if ceUser.status === 'pending'}
									<span class="text-xs text-amber-600 dark:text-amber-400 italic">Pending approval</span>
								{/if}
							</div>

						<!-- Unit assignment display / edit.
						     Editable for active CE-linked users by actors who outrank the target only.
						     P27-17: gated on sessionUser.role === 'admin'.
						     P27-20: additionally gated on canManageTarget (actor rank > target rank). -->
						<div class="flex flex-col space-y-1">
							<div class="text-xs text-gray-500">Units</div>
							{#if ceUser.status === 'active' && sessionUser?.role === 'admin' && canManageTarget}
									<!-- Active user + admin session + actor outranks target: editable unit checkboxes. -->
										<div class="flex flex-col space-y-1">
											<div class="flex gap-3">
												{#each CE_UNIT_OPTIONS as unit}
													<label class="flex items-center gap-1.5 text-xs cursor-pointer select-none">
														<input
															type="checkbox"
															checked={ceEditUnits.includes(unit)}
															on:change={() => toggleCeUnit(unit)}
															disabled={ceUnitActing}
															class="rounded border-gray-300 dark:border-gray-600"
														/>
														{unit}
													</label>
												{/each}
											</div>
											<div class="flex items-center gap-2">
												<button
													type="button"
													class="px-2.5 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
													disabled={ceUnitActing || ceEditUnits.length === 0}
													on:click={saveCeUnits}
												>
													{ceUnitActing ? '…' : 'Update Units'}
												</button>
												<span class="text-[10px] text-gray-400">At least one required</span>
											</div>
										</div>
									{:else}
										<!-- Disabled / pending: read-only. -->
										<div class="text-xs text-gray-500 dark:text-gray-400">
											{(ceUser.units ?? []).length > 0 ? ceUser.units.join(', ') : '—'}
											{#if ceUser.status === 'disabled'}
												<span class="ml-1 italic">(read-only while disabled)</span>
											{/if}
										</div>
									{/if}
								</div>
							</div>
					{:else if _awaitingCeRefresh}
						<!-- P27-19: Provision succeeded; waiting for parent-owned CE refresh to propagate.
						     Shown instead of "Not linked" to prevent a flash of incorrect state. -->
						<div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
							<div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Case Engine</div>
							<div class="text-xs text-gray-400 dark:text-gray-500 italic">Setting up Case Engine profile…</div>
						</div>
					{:else if $caseEngineToken}
						<!-- P27-16: No CE profile linked — show status + provision action. -->
							<div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col space-y-2">
								<div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Case Engine</div>
								<div class="flex items-center gap-2">
									<span class="text-xs text-gray-500">CE Status</span>
									<span class="text-xs text-gray-400 dark:text-gray-500 italic">Not linked</span>
								</div>
								<div class="flex flex-col space-y-1">
									<div class="text-xs text-gray-500">Units</div>
									<div class="text-xs text-gray-400 dark:text-gray-500 italic">
										Unavailable until linked to Case Engine
									</div>
								</div>
								<button
									type="button"
									class="self-start px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-medium disabled:opacity-50"
									disabled={provisionActing}
									on:click={doProvision}
								>
									{provisionActing ? '…' : 'Link to Case Engine'}
								</button>
							</div>
						{/if}

						<div class="flex justify-end pt-3 text-sm font-medium">
							<button
								class="px-3.5 py-1.5 text-sm font-medium bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition rounded-full flex flex-row space-x-1 items-center"
								type="submit"
							>
								{$i18n.t('Save')}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</Modal>

<style>
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		/* display: none; <- Crashes Chrome on hover */
		-webkit-appearance: none;
		margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
	}

	.tabs::-webkit-scrollbar {
		display: none; /* for Chrome, Safari and Opera */
	}

	.tabs {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	input[type='number'] {
		-moz-appearance: textfield; /* Firefox */
	}
</style>
