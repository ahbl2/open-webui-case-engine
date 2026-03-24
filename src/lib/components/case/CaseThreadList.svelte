<script context="module" lang="ts">
	// Module-level scroll cache — shared across all instances, survives re-mounts within a session.
	const scrollCache = new Map<string, number>();

	/** Number of threads revealed per batch (initial + each incremental load). */
	const BATCH_SIZE = 20;

	/** Normalized thread shape passed by each parent after mapping from their API type. */
	export interface ThreadListItem {
		id: string;       // association record primary key
		threadId: string; // OWUI thread UUID
		createdAt: string; // ISO date string
	}

	type GroupKey = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';

	/** Canonical group rendering order — always newest-first. */
	const GROUP_ORDER: readonly GroupKey[] = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

	interface ThreadGroup {
		key: GroupKey;
		items: ThreadListItem[];
	}

	/**
	 * Returns the number of whole calendar days between `todayMs` (midnight of today)
	 * and the calendar day of `iso`. Returns 9999 for unparseable dates (→ Older).
	 */
	function calendarDaysAgo(iso: string, todayMs: number): number {
		try {
			const d = new Date(iso);
			const dMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
			return Math.max(0, Math.floor((todayMs - dMs) / 86400000));
		} catch {
			return 9999;
		}
	}

	function toGroupKey(daysAgo: number): GroupKey {
		if (daysAgo === 0) return 'Today';
		if (daysAgo === 1) return 'Yesterday';
		if (daysAgo <= 7) return 'Previous 7 Days';
		return 'Older';
	}

	/**
	 * Group `items` (already sorted descending by createdAt) into recency buckets.
	 * Items within each bucket preserve their existing sort order (newest-first).
	 * Only non-empty buckets are returned, in GROUP_ORDER sequence.
	 */
	function buildGroups(items: ThreadListItem[], todayMs: number): ThreadGroup[] {
		const buckets = new Map<GroupKey, ThreadListItem[]>();
		for (const item of items) {
			const key = toGroupKey(calendarDaysAgo(item.createdAt, todayMs));
			if (!buckets.has(key)) buckets.set(key, []);
			buckets.get(key)!.push(item);
		}
		return GROUP_ORDER
			.filter((k) => buckets.has(k))
			.map((k) => ({ key: k, items: buckets.get(k)! }));
	}

	/**
	 * Consume up to `limit` total items from `groups` in order.
	 * Each group is sliced to its remaining budget; exhausted groups are omitted.
	 * This decouples the rendering window from group membership — items never
	 * change groups as the limit grows, only the slice boundary within each group shifts.
	 */
	function consumeGroups(groups: ThreadGroup[], limit: number): ThreadGroup[] {
		let remaining = limit;
		const result: ThreadGroup[] = [];
		for (const group of groups) {
			if (remaining <= 0) break;
			const items = group.items.slice(0, remaining);
			result.push({ key: group.key, items });
			remaining -= items.length;
		}
		return result;
	}
</script>

<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy, afterUpdate } from 'svelte';

	/** Already-filtered thread items — scope filtering stays in the parent. */
	export let threads: ThreadListItem[] = [];

	/** OWUI thread UUID of the currently open/active thread. null = none active. */
	export let activeThreadId: string | null = null;

	/** Disable all buttons while a binding operation is in progress. */
	export let bindingInProgress = false;

	/**
	 * Stable, context-specific key for scroll position caching.
	 * Use 'personal' for the desktop view and 'case:{caseId}' for case views
	 * so each context independently preserves its scroll position.
	 */
	export let scrollKey = 'default';

	/**
	 * CSS classes applied to the outer scroll container div.
	 * Override to match the mounting context — e.g. 'flex-1 overflow-y-auto px-2 pb-2'
	 * for the case sidebar, or 'flex flex-col' for the full-page desktop list.
	 */
	export let containerClass = 'flex-1 overflow-y-auto';

	const dispatch = createEventDispatcher<{ open: string }>();

	let scrollEl: HTMLDivElement;
	let sentinelEl: HTMLDivElement;
	let observer: IntersectionObserver | null = null;
	let visibleCount = BATCH_SIZE;

	// Stable midnight timestamp for grouping — recalculated on mount and context change.
	let todayMs = getTodayMidnight();

	function getTodayMidnight(): number {
		const n = new Date();
		return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
	}

	// ── Sorted, grouped, windowed ───────────────────────────────────────────
	// 1. Sort ALL threads descending — establishes within-group order.
	// 2. Build full recency groups from the complete sorted list — group membership
	//    is always derived from the full dataset, never from the visible window.
	// 3. consumeGroups slices each group to fit the visibleCount budget — this is
	//    the only place the batch window is applied, so no item ever changes group
	//    as more batches are revealed.
	$: sortedThreads = [...threads].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
	$: allGroups = buildGroups(sortedThreads, todayMs);
	$: visibleGroupedThreads = consumeGroups(allGroups, visibleCount);
	$: hasMore = visibleCount < threads.length;

	// Reset batch and recalculate today when context changes (same instance, new scrollKey).
	let prevScrollKey = '';
	$: if (scrollKey !== prevScrollKey) {
		if (prevScrollKey && scrollEl) scrollCache.set(prevScrollKey, scrollEl.scrollTop);
		prevScrollKey = scrollKey;
		visibleCount = BATCH_SIZE;
		todayMs = getTodayMidnight();
	}

	// ── Incremental loading ─────────────────────────────────────────────────
	function loadMore() {
		if (!hasMore) return;
		visibleCount = Math.min(visibleCount + BATCH_SIZE, threads.length);
	}

	/**
	 * Scroll-event trigger — fires for containers with their own overflow scroll
	 * (e.g. the case sidebar). Loads next batch when within 80px of the bottom.
	 */
	function handleScroll() {
		if (!scrollEl || !hasMore) return;
		const { scrollTop, scrollHeight, clientHeight } = scrollEl;
		if (scrollHeight - scrollTop - clientHeight < 80) loadMore();
	}

	/**
	 * IntersectionObserver trigger — fires for full-page scroll contexts
	 * (e.g. the desktop view) where the component's own div doesn't scroll.
	 * Uses viewport as root; browser accounts for intermediate overflow clips.
	 */
	function setupObserver() {
		observer?.disconnect();
		if (!sentinelEl) return;
		observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasMore) loadMore();
			},
			{ root: null, threshold: 0.1 }
		);
		observer.observe(sentinelEl);
	}

	// ── Lifecycle ───────────────────────────────────────────────────────────
	onMount(() => {
		todayMs = getTodayMidnight();
		const saved = scrollCache.get(scrollKey);
		if (saved != null && scrollEl) scrollEl.scrollTop = saved;
	});

	onDestroy(() => {
		if (scrollEl) scrollCache.set(scrollKey, scrollEl.scrollTop);
		observer?.disconnect();
	});

	// Re-attach observer after every DOM update so the sentinel is always observed
	// when present and released when hasMore becomes false (sentinel leaves DOM).
	afterUpdate(() => {
		setupObserver();
	});

	// ── Item interaction ────────────────────────────────────────────────────
	function openThread(threadId: string) {
		dispatch('open', threadId);
	}

	function handleKeydown(e: KeyboardEvent, threadId: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openThread(threadId);
		}
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return iso;
		}
	}
</script>

<div class={containerClass} bind:this={scrollEl} on:scroll={handleScroll}>
	{#each visibleGroupedThreads as group (group.key)}
		<div class="px-2 pt-2 pb-0.5" role="rowgroup">
			<span
				class="text-[10px] font-semibold uppercase tracking-wider
				       text-gray-400 dark:text-gray-500 select-none"
				aria-label="{group.key} threads"
			>
				{group.key}
			</span>
		</div>
		{#each group.items as t (t.id)}
			{@const isActive = activeThreadId === t.threadId}
			<button
				type="button"
				class="w-full text-left px-2 py-2 rounded-md text-xs mb-0.5 transition
				       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
				       disabled:opacity-50 disabled:cursor-not-allowed
				       {isActive
					? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 font-medium border-l-2 border-blue-500'
					: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'}"
				on:click={() => openThread(t.threadId)}
				on:keydown={(e) => handleKeydown(e, t.threadId)}
				disabled={bindingInProgress}
				aria-current={isActive ? 'true' : undefined}
				aria-label="Open thread from {formatDate(t.createdAt)}"
				data-testid="thread-list-item"
			>
				<span class="block truncate font-mono text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">
					{t.threadId.slice(0, 8)}…
				</span>
				<span class="block text-gray-500 dark:text-gray-500">
					{formatDate(t.createdAt)}
				</span>
			</button>
		{/each}
	{/each}

	{#if hasMore}
		<!-- Sentinel: observed by IntersectionObserver (desktop) and scroll handler reaches it naturally. -->
		<div
			bind:this={sentinelEl}
			aria-hidden="true"
			class="py-2 text-center pointer-events-none"
		>
			<span class="text-[10px] text-gray-300 dark:text-gray-600">Loading more…</span>
		</div>
	{/if}
</div>
