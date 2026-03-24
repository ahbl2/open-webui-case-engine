<script lang="ts">
	import { page } from '$app/stores';
	import { caseEngineToken, caseEngineAuthState, caseEngineUser, activeCaseMeta } from '$lib/stores';
	import WarrantWorkflow from '$lib/components/case/WarrantWorkflow.svelte';
	import {
		fetchNarrativeExport,
		getExhibits,
		getNarrativeTimeline,
		getProsecutorSummary,
		type ExhibitItem,
		type NarrativeEvent,
		type ProsecutorSummarySection
	} from '$lib/apis/caseEngine';

	$: caseId = $page.params.id;
	$: isAdmin =
		$caseEngineUser?.role === 'ADMIN' || $caseEngineAuthState?.user?.role === 'admin';

	let narrativeLoading = false;
	let narrativeError = '';
	let narrativeEvents: NarrativeEvent[] = [];

	let exhibitsLoading = false;
	let exhibitsError = '';
	let exhibits: ExhibitItem[] = [];

	let prosecutorLoading = false;
	let prosecutorError = '';
	let prosecutorSections: ProsecutorSummarySection[] = [];

	let exportBusy = false;
	let exportError = '';

	async function loadNarrativeTimeline(): Promise<void> {
		if (!$caseEngineToken || !caseId) return;
		narrativeLoading = true;
		narrativeError = '';
		try {
			const res = await getNarrativeTimeline(caseId, $caseEngineToken);
			narrativeEvents = Array.isArray(res.events) ? res.events : [];
		} catch (err) {
			narrativeError = err instanceof Error ? err.message : 'Failed to load narrative timeline.';
			narrativeEvents = [];
		} finally {
			narrativeLoading = false;
		}
	}

	async function loadExhibits(): Promise<void> {
		if (!$caseEngineToken || !caseId) return;
		exhibitsLoading = true;
		exhibitsError = '';
		try {
			const res = await getExhibits(caseId, $caseEngineToken);
			exhibits = Array.isArray(res.exhibits) ? res.exhibits : [];
		} catch (err) {
			exhibitsError = err instanceof Error ? err.message : 'Failed to load exhibits.';
			exhibits = [];
		} finally {
			exhibitsLoading = false;
		}
	}

	async function loadProsecutorSummary(): Promise<void> {
		if (!$caseEngineToken || !caseId) return;
		prosecutorLoading = true;
		prosecutorError = '';
		try {
			const res = await getProsecutorSummary(caseId, $caseEngineToken);
			prosecutorSections = Array.isArray(res.summary?.sections) ? res.summary.sections : [];
		} catch (err) {
			prosecutorError = err instanceof Error ? err.message : 'Failed to load prosecutor summary.';
			prosecutorSections = [];
		} finally {
			prosecutorLoading = false;
		}
	}

	async function runExport(
		path: 'narrative-timeline' | 'warrant-narrative' | 'exhibits' | 'prosecutor-summary' | 'court-packet',
		format: 'json' | 'md' | 'html',
		action: 'download' | 'open'
	): Promise<void> {
		if (!$caseEngineToken || !caseId || exportBusy) return;
		exportBusy = true;
		exportError = '';
		try {
			await fetchNarrativeExport(caseId, $caseEngineToken, path, format, action);
		} catch (err) {
			exportError = err instanceof Error ? err.message : 'Export failed.';
		} finally {
			exportBusy = false;
		}
	}
</script>

<div class="h-full min-h-0 overflow-auto p-4 md:p-6 space-y-4">
	{#if !$caseEngineToken}
		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
			<p class="text-sm text-gray-600 dark:text-gray-300">
				Case Engine authentication is required to load warrant and template tools.
			</p>
		</div>
	{:else}
		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
			<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Warrants & Templates</h1>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Template list, rendered output, AI warrant draft, and case-prep exports are sourced from Case Engine.
			</p>
		</div>

		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
			<WarrantWorkflow
				{caseId}
				token={$caseEngineToken}
				caseNumber={$activeCaseMeta?.case_number ?? ''}
				{isAdmin}
			/>
		</div>

		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
			<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Case Prep Outputs</h2>

			<div class="flex flex-wrap gap-2">
				<button
					type="button"
					class="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
					on:click={loadNarrativeTimeline}
					disabled={narrativeLoading}
				>
					{narrativeLoading ? 'Loading narrative…' : 'Narrative Timeline'}
				</button>
				<button
					type="button"
					class="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
					on:click={loadExhibits}
					disabled={exhibitsLoading}
				>
					{exhibitsLoading ? 'Loading exhibits…' : 'Exhibits'}
				</button>
				<button
					type="button"
					class="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
					on:click={loadProsecutorSummary}
					disabled={prosecutorLoading}
				>
					{prosecutorLoading ? 'Loading summary…' : 'Prosecutor Summary'}
				</button>
			</div>

			{#if narrativeError}
				<p class="text-xs text-red-600 dark:text-red-400">{narrativeError}</p>
			{:else if narrativeEvents.length === 0}
				<p class="text-xs text-gray-500 dark:text-gray-400">No narrative timeline events available.</p>
			{:else}
				<div class="space-y-1">
					<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Narrative Timeline</p>
					<ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
						{#each narrativeEvents.slice(0, 6) as event}
							<li>• {event.occurred_at}: {event.title ?? event.event_type}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if exhibitsError}
				<p class="text-xs text-red-600 dark:text-red-400">{exhibitsError}</p>
			{:else if exhibits.length === 0}
				<p class="text-xs text-gray-500 dark:text-gray-400">No exhibits available.</p>
			{:else}
				<div class="space-y-1">
					<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Exhibits</p>
					<ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
						{#each exhibits.slice(0, 8) as exhibit}
							<li>• {exhibit.exhibit_id}: {exhibit.title ?? '(untitled exhibit)'}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if prosecutorError}
				<p class="text-xs text-red-600 dark:text-red-400">{prosecutorError}</p>
			{:else if prosecutorSections.length === 0}
				<p class="text-xs text-gray-500 dark:text-gray-400">No prosecutor summary available.</p>
			{:else}
				<div class="space-y-1">
					<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Prosecutor Summary</p>
					<ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
						{#each prosecutorSections.slice(0, 6) as section}
							<li>• {section.section}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="pt-2 border-t border-gray-200 dark:border-gray-800">
				<p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Exports</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
						on:click={() => runExport('narrative-timeline', 'html', 'open')}
						disabled={exportBusy}
					>
						Open Narrative Export
					</button>
					<button
						type="button"
						class="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						on:click={() => runExport('exhibits', 'json', 'download')}
						disabled={exportBusy}
					>
						Download Exhibits (JSON)
					</button>
					<button
						type="button"
						class="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						on:click={() => runExport('prosecutor-summary', 'md', 'download')}
						disabled={exportBusy}
					>
						Download Prosecutor Summary (MD)
					</button>
					<button
						type="button"
						class="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						on:click={() => runExport('court-packet', 'html', 'download')}
						disabled={exportBusy}
					>
						Download Court Packet (HTML)
					</button>
				</div>
				{#if exportError}
					<p class="mt-2 text-xs text-red-600 dark:text-red-400">{exportError}</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
