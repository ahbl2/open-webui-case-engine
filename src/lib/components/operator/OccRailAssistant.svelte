<script lang="ts">
	/**
	 * P75-07 — OCC AI Assistant rail panel (extracted for dashboard column composition).
	 * P131.6-02 — Loading / empty / data states (session + binding).
	 * P131.6-03 — Binding failure uses standardized error + Retry (no raw messages).
	 * P131.6-04 — Region label (h3) + aria-labelledby.
	 * P131.7-08 — Header actions + input/send row + suggestion pill chrome (behavior unchanged).
	 * P131.8-06 — Input/send emphasis via `detectiveSurfaces.css` only (no logic changes).
	 */
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import { get } from 'svelte/store';

	import type { PersonalThreadAssociation } from '$lib/apis/caseEngine';
	import { ensureChatForThread, getChatById, getChatList } from '$lib/apis/chats';
	import { DS_BTN_CLASSES, DS_OCC_CLASSES, DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import OccStateContainer from '$lib/components/operator/OccStateContainer.svelte';
	import OccSkeletonList from '$lib/components/operator/OccSkeletonList.svelte';

	const i18n = getContext('i18n');

	export let newChat: () => void;
	export let bindingInProgress: boolean;
	export let hasToken: boolean;
	/** True when a personal-thread binding attempt failed (session present). */
	export let bindingErrorActive = false;
	export let onRetryBinding: (() => void) | undefined = undefined;

	/** Open an existing personal desktop thread (Case Engine binding + navigate). */
	export let openPersonalThread: (threadId: string) => void = () => {};
	export let activePersonalThreadId: string | null = null;
	export let threadsLoading = false;
	export let recentPersonalThreads: PersonalThreadAssociation[] = [];

	$: hasErr = Boolean(hasToken && bindingErrorActive);
	$: loading = Boolean(hasToken && bindingInProgress && !bindingErrorActive);
	$: empty = !hasToken;

	/** Populated when quick prompts are wired; structure only. */
	const HOME_ASSISTANT_SUGGESTIONS: { id: string; text: string }[] = [];

	/** Local draft for the quick-ask field (visual only; submit still routes to New Chat flow). */
	let assistDraft = '';

	/** OWUI chat titles keyed by thread id (from `GET /chats/:id`, not Case Engine). */
	let owuiChatTitleByThreadId: Record<string, string> = {};
	let owuiTitleFetchKey = '';
	let owuiTitleRequestId = 0;

	/** Session-only fallback so we do not flash "New Chat" while lists reload or after navigation. */
	const OWUI_RAIL_TITLE_CACHE_KEY = 'detective_occ_rail_chat_titles_v1';
	let sessionTitleCache: Record<string, string> | null = null;

	function ensureSessionTitleCache(): Record<string, string> {
		if (sessionTitleCache) return sessionTitleCache;
		if (!browser || typeof sessionStorage === 'undefined') {
			sessionTitleCache = {};
			return sessionTitleCache;
		}
		try {
			const raw = sessionStorage.getItem(OWUI_RAIL_TITLE_CACHE_KEY);
			sessionTitleCache = raw ? (JSON.parse(raw) as Record<string, string>) : {};
		} catch {
			sessionTitleCache = {};
		}
		return sessionTitleCache;
	}

	function mergeSessionTitleCache(next: Record<string, string>): void {
		if (!browser || typeof sessionStorage === 'undefined') return;
		const prev = ensureSessionTitleCache();
		const merged = { ...prev, ...next };
		sessionTitleCache = merged;
		try {
			sessionStorage.setItem(OWUI_RAIL_TITLE_CACHE_KEY, JSON.stringify(merged));
		} catch {
			// ignore quota / private mode
		}
	}

	function clearSessionTitleCache(): void {
		sessionTitleCache = {};
		if (!browser || typeof sessionStorage === 'undefined') return;
		try {
			sessionStorage.removeItem(OWUI_RAIL_TITLE_CACHE_KEY);
		} catch {
			// ignore
		}
	}

	function pickChatTitleFromDetail(
		res: { title?: string; chat?: { title?: string } } | null
	): string {
		if (!res) return '';
		const top = typeof res.title === 'string' ? res.title.trim() : '';
		if (top) return top;
		const inner = res.chat && typeof res.chat === 'object' && typeof res.chat.title === 'string'
			? res.chat.title.trim()
			: '';
		return inner;
	}

	/**
	 * OWUI often stores the chat UUID (or a hex fragment) as `title` when no human title exists.
	 * Treat those as missing so the rail shows "New Chat" instead of opaque ids.
	 */
	function normalizeChatDisplayTitle(raw: string, threadId: string, defaultLabel: string): string {
		const t = typeof raw === 'string' ? raw.trim() : '';
		if (!t) return defaultLabel;
		const tid = threadId.trim();
		if (!tid) return t;
		const tl = t.toLowerCase();
		const idl = tid.toLowerCase();
		if (tl === idl) {
			return defaultLabel;
		}

		// Full standard UUID string used as title
		if (/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(t)) {
			return defaultLabel;
		}

		// Hex / id fragment only (no spaces): truncated id or compact form
		if (/^[0-9a-f\-]+$/i.test(t) && !/\s/.test(t) && t.length >= 8) {
			const idCompact = idl.replace(/-/g, '');
			const tCompact = tl.replace(/-/g, '');
			if (idCompact.startsWith(tCompact) || tCompact.startsWith(idCompact.slice(0, tCompact.length))) {
				return defaultLabel;
			}
		}

		return t;
	}

	async function refreshOwuiChatTitles(
		threads: PersonalThreadAssociation[],
		requestId: number
	): Promise<void> {
		if (!browser || typeof localStorage === 'undefined') return;
		const defaultLabel = get(i18n).t('New Chat');

		if (threads.length === 0) {
			// Parent can pass [] briefly during load; keep prior titles until non-empty list arrives.
			return;
		}

		const token = localStorage.token;
		// Case Engine can be active without OWUI session token; still show a label (not indefinite …).
		if (!token) {
			if (requestId === owuiTitleRequestId) {
				const fallback: Record<string, string> = {};
				for (const t of threads) {
					fallback[t.thread_id] = defaultLabel;
				}
				owuiChatTitleByThreadId = fallback;
			}
			return;
		}

		const next: Record<string, string> = {};

		try {
			// Single lightweight call: GET /chats/ returns { id, title, … } for all user chats.
			const listRaw = await getChatList(token, null, true, true);
			if (requestId !== owuiTitleRequestId) return;
			const list = Array.isArray(listRaw) ? listRaw : [];
			const byId = new Map<string, string>();
			for (const row of list) {
				const r = row as { id?: string; chat_id?: string; title?: string };
				const id =
					typeof r.id === 'string' && r.id.length > 0
						? r.id
						: typeof r.chat_id === 'string' && r.chat_id.length > 0
							? r.chat_id
							: '';
				const title = typeof r.title === 'string' ? r.title.trim() : '';
				if (id) {
					byId.set(id, title);
					byId.set(id.toLowerCase(), title);
				}
			}
			for (const t of threads) {
				let name =
					byId.get(t.thread_id) ??
					byId.get(t.thread_id.toLowerCase()) ??
					'';
				if (!name) {
					// Case Engine can list thread_ids before an OWUI chat row exists; GET /chats/{id} then
					// returns 401 NOT_FOUND (see backend chats.py — misreported status). Create the chat first.
					await ensureChatForThread(token, t.thread_id);
					try {
						const res = await getChatById(token, t.thread_id, { silent: true });
						name = pickChatTitleFromDetail(res);
					} catch {
						name = '';
					}
				}
				const normalized = normalizeChatDisplayTitle(
					name && name.length > 0 ? name : '',
					t.thread_id,
					defaultLabel
				);
				next[t.thread_id] = normalized;
			}
		} catch {
			// Fallback: per-thread detail (top-level `title` on ChatResponse, not only `chat.title`).
			await Promise.all(
				threads.map(async (t) => {
					try {
						await ensureChatForThread(token, t.thread_id);
						const res = await getChatById(token, t.thread_id, { silent: true });
						const name = pickChatTitleFromDetail(res);
						const normalized = normalizeChatDisplayTitle(
							name && name.length > 0 ? name : '',
							t.thread_id,
							defaultLabel
						);
						next[t.thread_id] = normalized;
					} catch {
						next[t.thread_id] = defaultLabel;
					}
				})
			);
			if (requestId !== owuiTitleRequestId) return;
		}

		for (const t of threads) {
			if (next[t.thread_id] === undefined) {
				next[t.thread_id] = defaultLabel;
			}
		}

		if (requestId !== owuiTitleRequestId) return;
		owuiChatTitleByThreadId = next;
		mergeSessionTitleCache(next);
	}

	$: if (browser) {
		if (!hasToken) {
			owuiTitleFetchKey = '';
			owuiChatTitleByThreadId = {};
			clearSessionTitleCache();
		} else if (recentPersonalThreads.length === 0) {
			// Transient [] while threads/recompute load — do not clear titles or we flash "New Chat".
			owuiTitleFetchKey = '';
		} else {
			const key = recentPersonalThreads.map((t) => t.thread_id).join('|');
			const mapEmpty = Object.keys(owuiChatTitleByThreadId).length === 0;
			if (key !== owuiTitleFetchKey) {
				owuiTitleFetchKey = key;
				const req = ++owuiTitleRequestId;
				void refreshOwuiChatTitles(recentPersonalThreads, req);
			} else if (mapEmpty) {
				const req = ++owuiTitleRequestId;
				void refreshOwuiChatTitles(recentPersonalThreads, req);
			}
		}
	}

	function displayChatTitle(t: PersonalThreadAssociation): string {
		const def = get(i18n).t('New Chat');
		const id = t.thread_id;
		const v = owuiChatTitleByThreadId[id];
		if (v !== undefined) {
			return normalizeChatDisplayTitle(v || '', id, def);
		}
		const cached = ensureSessionTitleCache()[id];
		if (typeof cached === 'string' && cached.trim() !== '') {
			return normalizeChatDisplayTitle(cached, id, def);
		}
		return def;
	}

	function sendOrOpenChat(): void {
		assistDraft = '';
		newChat();
	}

	function activityIso(t: PersonalThreadAssociation): string {
		const u = Date.parse(t.updated_at) || 0;
		const c = Date.parse(t.created_at) || 0;
		return u >= c ? t.updated_at : t.created_at;
	}

	function formatActivityLabel(iso: string): string {
		try {
			return new Date(iso).toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			});
		} catch {
			return iso;
		}
	}

	function onRecentKeydown(e: KeyboardEvent, threadId: string): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			void openPersonalThread(threadId);
		}
	}
</script>

<section
	class={DS_OCC_CLASSES.railPanel}
	data-occ-rail-slot="assistant"
	data-testid="occ-rail-assistant"
	aria-labelledby="occ-home-assistant-heading"
>
	<div class={DS_OCC_CLASSES.boardCardHeader}>
		<div class={DS_OCC_CLASSES.sectionHeaderRow}>
			<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
				<h3
					id="occ-home-assistant-heading"
					class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
				>
					{$i18n.t('AI Assistant')}
				</h3>
			</div>
			<button
				type="button"
				class="{DS_BTN_CLASSES.secondary} ds-occ-rail-assist-header-new-chat shrink-0 text-sm inline-flex items-center gap-1.5"
				on:click={newChat}
				disabled={bindingInProgress || !hasToken}
				data-testid="occ-rail-header-new-chat"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-4 w-4 shrink-0"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				<span>{$i18n.t('New Chat')}</span>
			</button>
		</div>
	</div>
	<div class={DS_OCC_CLASSES.boardCardBody}>
		<OccStateContainer
			hasError={hasErr}
			onRetry={onRetryBinding}
			retryDisabled={bindingInProgress}
			retryAriaLabel={$i18n.t('Retry personal thread setup')}
			isLoading={loading}
			isEmpty={empty}
			emptyTitle={$i18n.t('Case Engine session required.')}
			emptySubtext=""
			regionMinClass="min-h-[8rem]"
		>
			<svelte:fragment slot="loading">
				<OccSkeletonList rows={2} />
			</svelte:fragment>
			<div class="ds-occ-rail-assist-stack">
				<div class="ds-occ-rail-assist-input-shell">
					<textarea
						class="ds-occ-rail-assist-input"
						rows="3"
						bind:value={assistDraft}
						disabled={bindingInProgress || !hasToken}
						placeholder={$i18n.t('Ask anything about your investigations...')}
						aria-label={$i18n.t('Ask a question')}
					/>
					<button
						type="button"
						class="ds-occ-rail-assist-send"
						on:click={sendOrOpenChat}
						disabled={bindingInProgress || !hasToken}
						data-testid="occ-rail-new-chat"
						aria-label={$i18n.t('New Chat')}
					>
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
							/>
						</svg>
					</button>
				</div>
				<nav class="ds-occ-rail-assist-recent" aria-label={$i18n.t('Chat history')}>
					{#if threadsLoading}
						<p class="ds-occ-rail-assist-recent__hint {DS_TYPE_CLASSES.meta}">
							{$i18n.t('Loading…')}
						</p>
					{:else if recentPersonalThreads.length === 0}
						<p class="ds-occ-rail-assist-recent__hint {DS_TYPE_CLASSES.meta}">
							{$i18n.t('No chats yet.')}
						</p>
					{:else}
						<ul class="ds-occ-rail-assist-recent__list" role="list">
							{#each recentPersonalThreads as t (t.id)}
								{@const recentLabel = displayChatTitle(t)}
								<li class="ds-occ-rail-assist-recent__item">
									<button
										type="button"
										class="ds-occ-rail-assist-recent__btn"
										disabled={bindingInProgress || !hasToken}
										data-testid="occ-rail-assist-recent-item"
										data-thread-id={t.thread_id}
										aria-current={activePersonalThreadId === t.thread_id ? 'true' : undefined}
										aria-label={`${$i18n.t('Open chat')} ${recentLabel} ${formatActivityLabel(activityIso(t))}`}
										on:click={() => void openPersonalThread(t.thread_id)}
										on:keydown={(e) => onRecentKeydown(e, t.thread_id)}
									>
										<span class="ds-occ-rail-assist-recent__title" title={recentLabel}>
											{recentLabel}
										</span>
										<span class="ds-occ-rail-assist-recent__time" aria-hidden="true">
											{formatActivityLabel(activityIso(t))}
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</nav>
				{#if HOME_ASSISTANT_SUGGESTIONS.length > 0}
					<ul class="ds-occ-rail-assist-pills" aria-label={$i18n.t('Suggested prompts')}>
						{#each HOME_ASSISTANT_SUGGESTIONS as s (s.id)}
							<li>
								<div class="ds-occ-rail-assist-pill" role="presentation">
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
										<path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
									</svg>
									<span>{s.text}</span>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</OccStateContainer>
	</div>
</section>
