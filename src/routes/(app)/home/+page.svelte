<script lang="ts">
	/**
	 * P19-08 — My Desktop (Personal Thread Integration)
	 *
	 * Provides the personal thread entry path for the detective's private workspace.
	 *
	 * Personal threads:
	 *   - Are visible only to the owning user (owner-only scope).
	 *   - Are backed by Case Engine (GET/PUT /desktop/threads).
	 *   - Are bound to 'personal' scope via backend confirmation before chat opens.
	 *   - Cannot be accessed from any case view (no cross-scope leakage).
	 *
	 * Binding behavior:
	 *   - "New Chat" → generates a UUID → calls PUT /desktop/threads/:id → navigates to /c/[id]
	 *     if and only if binding succeeds.
	 *   - Thread item click → idempotent PUT (restore or confirm) → navigate on success.
	 *   - On binding failure: show explicit error, do NOT navigate into unbound chat.
	 *
	 * DOCTRINE:
	 *   - Backend association is required before navigation. Fail-closed.
	 *   - No personal thread IDs or metadata are exposed to case views.
	 *   - activeThreadScope is set to 'personal' on successful binding.
	 */
	import { onMount, getContext } from 'svelte';
	import OperatorCommandCenterFrame from '$lib/components/operator/OperatorCommandCenterFrame.svelte';
	import OccSummaryKpiTiles from '$lib/components/operator/OccSummaryKpiTiles.svelte';
	import OccRightRailModules from '$lib/components/operator/OccRightRailModules.svelte';
	import HomeDesktopPanels from './HomeDesktopPanels.svelte';
	import OccMainColumnHome from './OccMainColumnHome.svelte';
	import { isDetectiveWave2AppShellEnabled } from '$lib/case/detectiveWave2Shell';
	import { goto } from '$app/navigation';
	import { v4 as uuidv4 } from 'uuid';

	import {
		caseEngineToken,
		activeThreadScope,
		threadScopeError,
		user,
		scope,
		activeCaseId,
		activeCaseNumber,
		caseContext,
		aiCaseContext
	} from '$lib/stores';
	import { DS_BADGE_CLASSES, DS_OCC_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		listPersonalThreadAssociations,
		upsertPersonalThreadAssociation,
		resolveBrowserAuthOnce,
		listCases,
		type PersonalThreadAssociation,
		type CaseEngineCase
	} from '$lib/apis/caseEngine';
	import { classifyBindError, bindErrorMessage } from '$lib/utils/threadScopeBinding';
	import type { ThreadListItem } from '$lib/components/case/CaseThreadList.svelte';
	import { activeUiThread } from '$lib/stores/activeUiThread';

	const i18n = getContext('i18n');

	/** P75-06-FU: OCC frame only when Wave 2 shell flag is on — legacy /home layout on rollback. */
	$: wave2ShellChrome = isDetectiveWave2AppShellEnabled();

	// ── Personal thread list ─────────────────────────────────────────────────
	let threads: PersonalThreadAssociation[] = [];
	let threadsLoading = false;
	let threadsLoadError = '';

	/** Derive active thread ID from the canonical store — desktop scope only. */
	$: activePersonalThreadId =
		$activeUiThread?.scope === 'desktop' ? $activeUiThread.threadId : null;

	$: normalizedThreads = threads.map<ThreadListItem>((t) => ({
		id: t.id,
		threadId: t.thread_id,
		createdAt: t.created_at
	}));

	async function loadThreads(): Promise<void> {
		if (!$caseEngineToken) {
			threadsLoading = false;
			return;
		}
		threadsLoading = true;
		threadsLoadError = '';
		try {
			threads = await listPersonalThreadAssociations($caseEngineToken);
		} catch (err) {
			threadsLoadError = err instanceof Error ? err.message : 'Failed to load personal threads.';
			threads = [];
		} finally {
			threadsLoading = false;
		}
	}

	onMount(() => { loadThreads(); loadCases(); });

	// ── Thread binding ───────────────────────────────────────────────────────
	let bindingInProgress = false;
	let localBindError: string | null = null;

	/**
	 * Bind a thread ID to personal scope (idempotent PUT). On success, set
	 * activeThreadScope and navigate to OWUI chat. On failure, show error
	 * and block navigation.
	 */
	async function openPersonalThread(threadId: string): Promise<void> {
		const token = $caseEngineToken;
		const hasValidToken = token && typeof token === 'string' && token.trim() !== '';
		if (!hasValidToken) {
			const message =
				'Case Engine session is not ready. Please refresh the page or sign in again.';
			localBindError = message;
			threadScopeError.set({ kind: 'access_denied', message, threadId });
			return;
		}

		bindingInProgress = true;
		localBindError = null;
		activeThreadScope.set(null);
		threadScopeError.set(null);

		const getFreshToken = async (): Promise<string | null> => {
			const u = $user;
			if (!u?.id) return null;
			try {
				const authResult = await resolveBrowserAuthOnce({
					owui_user_id: u.id,
					username_or_email: (u as { email?: string }).email ?? u.name ?? u.id,
					display_name: u.name
				});
				if (authResult.state === 'active' && typeof authResult.token === 'string' && authResult.token.trim() !== '') {
					caseEngineToken.set(authResult.token);
					return authResult.token;
				}
			} catch {
				// ignore
			}
			return null;
		};

		try {
			await upsertPersonalThreadAssociation(threadId, token, { getFreshToken });

		// Backend confirmed the binding — safe to navigate.
		// OWUI chat record is NOT created here; it is created on first message send.
		activeThreadScope.set({ threadId, scope: 'personal' });
		// Clear single-case chat routing: Chat.svelte uses persisted `scope`===THIS_CASE + activeCaseId
		// for Case Engine ask; desktop threads must use normal LLM path (user-wide / ALL).
		scope.set('ALL');
		activeCaseId.set(null);
		activeCaseNumber.set(null);
		caseContext.set(null);
		aiCaseContext.set(null);
		activeUiThread.set({ scope: 'desktop', threadId });
		await goto(`/c/${threadId}`);
		} catch (err) {
			const kind = classifyBindError(err);
			const originalMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : null;
			const message = bindErrorMessage(kind, 'personal', originalMsg);
			localBindError = message;
			threadScopeError.set({ kind, message, threadId });
			activeThreadScope.set(null);
		} finally {
			bindingInProgress = false;
		}
	}

	async function newChat(): Promise<void> {
		const threadId = uuidv4();
		sessionStorage.setItem(`rt:${threadId}`, '1');
		await openPersonalThread(threadId);
	}

	// ── Your Cases widget ────────────────────────────────────────────────────
	const MAX_CASES = 5;
	let recentCases: CaseEngineCase[] = [];
	/** Full `listCases` result for KPI metrics (same unit scope as recentCases). */
	let allCasesForMetrics: CaseEngineCase[] = [];
	let casesLoading = false;
	let casesError = '';

	/** Normalize scope store value to a unit accepted by listCases. */
	$: resolvedUnit = ($scope === 'CID' || $scope === 'SIU') ? $scope : 'ALL';

	/** P77-02 — Token-backed case status chips (same semantics as `/cases`; no new data). */
	function statusBadgeClass(status: string): string {
		const s = String(status ?? '').toLowerCase();
		if (s === 'active' || s === 'open') return DS_BADGE_CLASSES.success;
		return DS_BADGE_CLASSES.neutral;
	}

	$: activeOpenCaseCount = allCasesForMetrics.filter((c) => {
		const s = String(c.status ?? '').toLowerCase();
		return s === 'active' || s === 'open';
	}).length;

	async function loadCases(): Promise<void> {
		if (!$caseEngineToken) {
			recentCases = [];
			allCasesForMetrics = [];
			return;
		}
		casesLoading = true;
		casesError = '';
		try {
			const all = await listCases(resolvedUnit, $caseEngineToken);
			allCasesForMetrics = all;
			recentCases = all.slice(0, MAX_CASES);
		} catch (err) {
			casesError = err instanceof Error ? err.message : 'Failed to load cases.';
			recentCases = [];
			allCasesForMetrics = [];
		} finally {
			casesLoading = false;
		}
	}

	function goToCases() {
		goto('/cases');
	}
</script>

{#if wave2ShellChrome}
	<OperatorCommandCenterFrame>
		<div class="contents" slot="summary">
			<OccSummaryKpiTiles
				hasToken={Boolean($caseEngineToken && String($caseEngineToken).trim() !== '')}
				{casesLoading}
				{casesError}
				totalCasesInScope={allCasesForMetrics.length}
				activeOpenCount={activeOpenCaseCount}
				{threadsLoading}
				threadCount={threads.length}
			/>
		</div>
		<div class="contents" slot="rail">
			<OccRightRailModules {newChat} {bindingInProgress} hasToken={Boolean($caseEngineToken)} {goToCases} />
		</div>
		<div class={DS_OCC_CLASSES.mainCanvas}>
			<!-- Header — OCC landing (P75-06); P77-02 — DS hierarchy -->
			<div
				class="flex items-start gap-3 mb-6 pb-4 border-b border-[color:var(--ds-border-default)]"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-7 shrink-0 text-[color:var(--ds-accent)] opacity-90"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
					/>
				</svg>
				<div class="min-w-0">
					<h1 class={DS_TYPE_CLASSES.display}>{$i18n.t('Operator Command Center')}</h1>
					<p class="{DS_TYPE_CLASSES.meta} mt-1 max-w-2xl">
						{$i18n.t('Personal workspace and case shortcuts')}
					</p>
				</div>
			</div>

			<OccMainColumnHome
				{newChat}
				{bindingInProgress}
				localBindError={localBindError}
				onDismissBindError={() => {
					localBindError = null;
				}}
				{threadsLoading}
				{threadsLoadError}
				{loadThreads}
				threads={threads}
				{normalizedThreads}
				{activePersonalThreadId}
				openPersonalThread={openPersonalThread}
				{casesLoading}
				{casesError}
				{loadCases}
				{recentCases}
				{goToCases}
				{statusBadgeClass}
			/>
		</div>
	</OperatorCommandCenterFrame>
{:else}
	<!-- P75-06-FU: legacy pre–Wave-2 / pre-OCC home shell (no OCC summary band / right rail). -->
	<div
		class="flex-1 flex flex-col w-full min-w-0 h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8"
		data-testid="home-legacy-shell"
	>
		<div class="max-w-4xl w-full mx-auto">
			<div class="flex items-center gap-3 mb-6">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-6 text-gray-600 dark:text-gray-300"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
					/>
				</svg>
				<h1 class="text-xl font-semibold text-gray-800 dark:text-gray-100">My Desktop</h1>
			</div>

			<HomeDesktopPanels
				{newChat}
				{bindingInProgress}
				localBindError={localBindError}
				onDismissBindError={() => {
					localBindError = null;
				}}
				{threadsLoading}
				{threadsLoadError}
				{loadThreads}
				threads={threads}
				{normalizedThreads}
				{activePersonalThreadId}
				openPersonalThread={openPersonalThread}
				{casesLoading}
				{casesError}
				{loadCases}
				{recentCases}
				{goToCases}
				{statusBadgeClass}
			/>
		</div>
	</div>
{/if}
