<script lang="ts">
	/**
	 * P75-07 — OCC main column: sectioned personal workspace, cases, and honest activity placeholder.
	 */
	import { getContext } from 'svelte';

	import {
		DS_TYPE_CLASSES,
		DS_PANEL_CLASSES,
		DS_EMPTY_CLASSES,
		DS_STACK_CLASSES,
		DS_SECTION_HEADER_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import type { ThreadListItem } from '$lib/components/case/CaseThreadList.svelte';
	import type { CaseEngineCase, PersonalThreadAssociation } from '$lib/apis/caseEngine';

	import HomeDesktopPersonalThreads from './HomeDesktopPersonalThreads.svelte';
	import HomeDesktopYourCases from './HomeDesktopYourCases.svelte';

	const i18n = getContext('i18n');

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
	export let statusColor: (status: string) => string;
</script>

<div class="{DS_STACK_CLASSES.stack}">
	<section class="{DS_PANEL_CLASSES.primaryDense} min-w-0" data-testid="occ-main-personal">
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
	</section>

	<section class="{DS_PANEL_CLASSES.primaryDense} min-w-0" data-testid="occ-main-cases">
		<HomeDesktopYourCases
			{casesLoading}
			{casesError}
			{loadCases}
			{recentCases}
			{goToCases}
			{statusColor}
		/>
	</section>

	<section class="{DS_PANEL_CLASSES.muted} ds-panel-dense min-w-0" data-testid="occ-main-activity">
		<div class="{DS_SECTION_HEADER_CLASSES.header}">
			<span
				class="{DS_TYPE_CLASSES.meta} font-semibold uppercase tracking-wide text-[color:var(--ds-text-muted)]"
			>
				{$i18n.t('Activity & review queue')}
			</span>
		</div>
		<p class="{DS_EMPTY_CLASSES.description} mt-2 leading-snug">
			{$i18n.t(
				'A cross-case activity stream is not available in this build. Open a case for its timeline, notes, and proposals.'
			)}
		</p>
	</section>
</div>
