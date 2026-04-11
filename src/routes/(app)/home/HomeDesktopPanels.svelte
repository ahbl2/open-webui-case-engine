<script lang="ts">
	/**
	 * Shared My Desktop body: personal threads + recent cases (used by /home Wave 2 and legacy layouts).
	 */
	import type { ThreadListItem } from '$lib/components/case/CaseThreadList.svelte';
	import type { CaseEngineCase, PersonalThreadAssociation } from '$lib/apis/caseEngine';

	import HomeDesktopPersonalThreads from './HomeDesktopPersonalThreads.svelte';
	import HomeDesktopYourCases from './HomeDesktopYourCases.svelte';

	export let newChat: () => void;
	export let bindingInProgress: boolean;
	export let localBindError: string | null;
	export let onDismissBindError: () => void;

	export let threadsLoading: boolean;
	export let threadsLoadError: string;
	export let loadThreads: () => void;
	export let threads: PersonalThreadAssociation[];
	export let normalizedThreads: ThreadListItem[];
	export let activePersonalThreadId: string | null;
	export let openPersonalThread: (threadId: string) => void;

	export let casesLoading: boolean;
	export let casesError: string;
	export let loadCases: () => void;
	export let recentCases: CaseEngineCase[];
	export let goToCases: () => void;
	export let statusBadgeClass: (status: string) => string;
</script>

<!-- ── Personal Threads ────────────────────────────────────────────── -->
<div class="mb-8">
	<HomeDesktopPersonalThreads
		{newChat}
		{bindingInProgress}
		localBindError={localBindError}
		{onDismissBindError}
		{threadsLoading}
		{threadsLoadError}
		{loadThreads}
		threads={threads}
		{normalizedThreads}
		{activePersonalThreadId}
		openPersonalThread={openPersonalThread}
	/>
</div>

<!-- ── Your Cases ────────────────────────────────────────────────── -->
<div class="mb-6">
	<HomeDesktopYourCases
		{casesLoading}
		{casesError}
		{loadCases}
		{recentCases}
		{goToCases}
		{statusBadgeClass}
	/>
</div>
