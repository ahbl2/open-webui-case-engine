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
	import { browser } from '$app/environment';
	import { onMount, getContext } from 'svelte';
	import { get } from 'svelte/store';
	import OperatorCommandCenterFrame from '$lib/components/operator/OperatorCommandCenterFrame.svelte';
	import OccHeroCitySkyline from '$lib/components/operator/OccHeroCitySkyline.svelte';
	import OccSummaryKpiTiles from '$lib/components/operator/OccSummaryKpiTiles.svelte';
	import OccSkeletonTileRow from '$lib/components/operator/OccSkeletonTileRow.svelte';
	import OccStateContainer from '$lib/components/operator/OccStateContainer.svelte';
	import HomeDesktopPanels from './HomeDesktopPanels.svelte';
	import OccHomeLeftColumn from './OccHomeLeftColumn.svelte';
	import OccHomeCenterColumn from './OccHomeCenterColumn.svelte';
	import OccHomeRightColumn from './OccHomeRightColumn.svelte';
	import OccHomeBoardCases from './OccHomeBoardCases.svelte';
	import OccHomeBoardActivity from './OccHomeBoardActivity.svelte';
	import OccHomeWorkflowQueueZone from './OccHomeWorkflowQueueZone.svelte';
	import OccRailIntel from '$lib/components/operator/OccRailIntel.svelte';
	import OccRailAssistant from '$lib/components/operator/OccRailAssistant.svelte';
	import OccRailProposals from '$lib/components/operator/OccRailProposals.svelte';
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
	import { DS_BADGE_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		listPersonalThreadAssociations,
		upsertPersonalThreadAssociation,
		resolveBrowserAuthOnce,
		listCases,
		type PersonalThreadAssociation,
		type CaseEngineCase
	} from '$lib/apis/caseEngine';
	import { getChatList } from '$lib/apis/chats';
	import { classifyBindError, bindErrorMessage } from '$lib/utils/threadScopeBinding';
	import type { ThreadListItem } from '$lib/components/case/CaseThreadList.svelte';
	import { activeUiThread } from '$lib/stores/activeUiThread';
	import OccIconHome from '$lib/components/icons/occ/OccIconHome.svelte';

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

	/** OCC AI Assistant rail: up to four threads that are both CE-bound and OWUI chats, ordered by OWUI recency. */
	const ASSISTANT_RECENT_CHAT_COUNT = 4;

	function ceRecencySort(a: PersonalThreadAssociation, b: PersonalThreadAssociation): number {
		const ta = Math.max(Date.parse(a.updated_at) || 0, Date.parse(a.created_at) || 0);
		const tb = Math.max(Date.parse(b.updated_at) || 0, Date.parse(b.created_at) || 0);
		return tb - ta;
	}

	function threadLookupKey(s: string): string {
		return String(s ?? '').trim().toLowerCase();
	}
	function threadLookupKeyCompact(s: string): string {
		return threadLookupKey(s).replace(/-/g, '');
	}

	/** OWUI chat list uses Unix seconds (see getTimeRange). */
	function owuiUpdatedAtToIso(updatedAt: number | undefined): string {
		if (updatedAt == null || Number.isNaN(updatedAt)) return new Date().toISOString();
		return new Date(updatedAt * 1000).toISOString();
	}

	function syntheticPersonalThread(
		threadId: string,
		row: { updated_at?: number },
		ownerUserId: string
	): PersonalThreadAssociation {
		const iso = owuiUpdatedAtToIso(row.updated_at);
		return {
			id: `owui-chat:${threadId}`,
			owner_user_id: ownerUserId,
			thread_id: threadId,
			scope_type: 'personal',
			created_at: iso,
			created_by: ownerUserId,
			updated_at: iso
		};
	}

	let recentPersonalThreads: PersonalThreadAssociation[] = [];

	/** Invalidates in-flight `recomputeAssistantRecentThreads` so stale async completions cannot overwrite. */
	let recomputeAssistantSeq = 0;

	async function recomputeAssistantRecentThreads(t: PersonalThreadAssociation[]): Promise<void> {
		if (!browser) {
			recentPersonalThreads = [];
			return;
		}
		const seq = ++recomputeAssistantSeq;
		const applyRecent = (next: PersonalThreadAssociation[]) => {
			if (seq !== recomputeAssistantSeq) return;
			recentPersonalThreads = next;
		};

		const ow = typeof localStorage !== 'undefined' ? String(localStorage.token ?? '').trim() : '';
		if (!ow) {
			applyRecent(
				t.length > 0
					? [...t].sort(ceRecencySort).slice(0, ASSISTANT_RECENT_CHAT_COUNT)
					: []
			);
			return;
		}
		const ownerUserId = get(user)?.id ?? '';
		try {
			const listRaw = await getChatList(ow, null, true, true);
			const list = Array.isArray(listRaw) ? listRaw : [];
			if (list.length === 0) {
				applyRecent(
					t.length > 0
						? [...t].sort(ceRecencySort).slice(0, ASSISTANT_RECENT_CHAT_COUNT)
						: []
				);
				return;
			}
			const byKey = new Map<string, PersonalThreadAssociation>();
			for (const assoc of t) {
				byKey.set(threadLookupKey(assoc.thread_id), assoc);
				byKey.set(threadLookupKeyCompact(assoc.thread_id), assoc);
			}
			type ChatListRow = { id?: string; chat_id?: string; title?: string; updated_at?: number };
			const defaultOwuiTitle = get(i18n).t('New Chat').trim().toLowerCase();
			const isDefaultTitle = (title: string | undefined) => {
				const s = String(title ?? '').trim().toLowerCase();
				return s === '' || s === defaultOwuiTitle;
			};
			const listRows = list as ChatListRow[];
			const sortedRows = [...listRows].sort((a, b) => {
				const aDef = isDefaultTitle(a.title);
				const bDef = isDefaultTitle(b.title);
				if (aDef !== bDef) return aDef ? 1 : -1;
				return (b.updated_at ?? 0) - (a.updated_at ?? 0);
			});
			const seenThread = new Set<string>();
			const out: PersonalThreadAssociation[] = [];
			for (const row of sortedRows) {
				const id =
					typeof row.id === 'string' && row.id.length > 0
						? row.id
						: typeof row.chat_id === 'string' && row.chat_id.length > 0
							? row.chat_id
							: '';
				if (!id || seenThread.has(id)) continue;
				seenThread.add(id);
				const assoc =
					byKey.get(threadLookupKey(id)) ?? byKey.get(threadLookupKeyCompact(id));
				const iso = owuiUpdatedAtToIso(row.updated_at);
				if (assoc) {
					out.push({ ...assoc, updated_at: iso });
				} else {
					out.push(syntheticPersonalThread(id, row, ownerUserId));
				}
				if (out.length >= ASSISTANT_RECENT_CHAT_COUNT) break;
			}
			applyRecent(
				out.length > 0
					? out
					: t.length > 0
						? [...t].sort(ceRecencySort).slice(0, ASSISTANT_RECENT_CHAT_COUNT)
						: []
			);
		} catch {
			applyRecent(
				t.length > 0
					? [...t].sort(ceRecencySort).slice(0, ASSISTANT_RECENT_CHAT_COUNT)
					: []
			);
		}
	}

	$: if (browser) {
		void recomputeAssistantRecentThreads(threads);
	}

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

	/** P131.9-05B — Desktop OCC bottom board uses 3×2 grid; <1200px keeps three column stacks. */
	let occDesktopBoard = false;

	onMount(() => {
		void loadThreads();
		void loadCases();
		const mq = window.matchMedia('(min-width: 1200px)');
		const sync = () => (occDesktopBoard = mq.matches);
		sync();
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});

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

	$: summaryToken = Boolean($caseEngineToken && String($caseEngineToken).trim() !== '');
	$: hasSummaryError =
		summaryToken &&
		(Boolean(String(casesError ?? '').trim()) || Boolean(String(threadsLoadError ?? '').trim()));

	function retrySummaryLoads() {
		void loadCases();
		void loadThreads();
	}

	function retryAssistantBinding() {
		localBindError = null;
		void newChat();
	}

	$: intelRetryAriaLabel = $i18n.t('Retry loading intelligence feed');
</script>

{#if wave2ShellChrome}
	<OperatorCommandCenterFrame occDesktopBoard={occDesktopBoard}>
		<div class="ds-occ-dashboard-hero-banner__stack" slot="heroBanner">
			<OccHeroCitySkyline />
			<div class="ds-occ-hero-band__inner ds-occ-hero-band__inner--on-banner w-full">
				<div class="flex items-center gap-3 min-w-0 flex-1">
					<OccIconHome
						variant="hero"
						className="shrink-0 text-[color:var(--ds-accent)] opacity-90"
					/>
					<div class="min-w-0">
						<h1 id="occ-home-hero-heading" class={DS_TYPE_CLASSES.display}>
							{$i18n.t('Operator Command Center')}
						</h1>
						<p class="{DS_TYPE_CLASSES.meta} mt-1 max-w-2xl">
							{$i18n.t('Personal workspace and case shortcuts')}
						</p>
					</div>
				</div>
				<div class="ds-occ-hero-actions" data-testid="occ-hero-actions">
					<span class="ds-occ-hero-actions__placeholder" aria-hidden="true">
						{$i18n.t('Reserved')}
					</span>
				</div>
			</div>
		</div>
		<div class="hidden" slot="hero" aria-hidden="true"></div>
		<div class="contents" slot="summary">
			{#if hasSummaryError}
				<OccStateContainer
					hasError={true}
					onRetry={retrySummaryLoads}
					retryDisabled={casesLoading || threadsLoading}
					retryAriaLabel={$i18n.t('Retry loading summary metrics')}
					regionMinClass="min-h-[5.5rem]"
				/>
			{:else if summaryToken && (casesLoading || threadsLoading)}
				<OccSkeletonTileRow />
			{:else}
				<OccSummaryKpiTiles
					hasToken={summaryToken}
					{casesLoading}
					{casesError}
					totalCasesInScope={allCasesForMetrics.length}
					activeOpenCount={activeOpenCaseCount}
					{threadsLoading}
					threadCount={threads.length}
				/>
			{/if}
		</div>
		<div class="contents" slot="colLeft">
			<OccHomeLeftColumn
				{casesLoading}
				{casesError}
				{loadCases}
				{recentCases}
				{goToCases}
				{statusBadgeClass}
			/>
		</div>
		<div class="contents" slot="colCenter">
			<OccHomeCenterColumn />
		</div>
		<div class="contents" slot="colRight">
			<OccHomeRightColumn
				{newChat}
				{bindingInProgress}
				hasToken={summaryToken}
				bindingErrorActive={Boolean(localBindError) && summaryToken}
				onRetryBinding={retryAssistantBinding}
				{goToCases}
				{openPersonalThread}
				{activePersonalThreadId}
				{threadsLoading}
				{recentPersonalThreads}
			/>
		</div>

		<OccHomeBoardCases
			slot="boardCases"
			casesLoading={casesLoading}
			casesError={casesError}
			loadCases={loadCases}
			recentCases={recentCases}
			{goToCases}
			statusBadgeClass={statusBadgeClass}
		/>
		<OccHomeBoardActivity slot="boardActivity" />
		<OccRailAssistant
			slot="boardAssistant"
			{newChat}
			bindingInProgress={bindingInProgress}
			hasToken={summaryToken}
			bindingErrorActive={Boolean(localBindError) && summaryToken}
			onRetryBinding={retryAssistantBinding}
			{openPersonalThread}
			activePersonalThreadId={activePersonalThreadId}
			{threadsLoading}
			{recentPersonalThreads}
		/>
		<OccHomeWorkflowQueueZone slot="boardWorkflow" />
		<OccRailIntel slot="boardIntel" retryAriaLabel={intelRetryAriaLabel} />
		<OccRailProposals slot="boardProposals" {goToCases} />
	</OperatorCommandCenterFrame>
{:else}
	<!-- P75-06-FU: legacy pre–Wave-2 / pre-OCC home shell (no OCC summary band / right rail). -->
	<div
		class="flex-1 flex flex-col w-full min-w-0 h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8"
		data-testid="home-legacy-shell"
	>
		<div class="max-w-4xl w-full mx-auto">
			<div class="flex items-center gap-3 mb-6">
				<OccIconHome variant="legacy" className="text-gray-600 dark:text-gray-300" />
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
