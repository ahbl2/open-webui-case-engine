<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		getNarrativeTimeline,
		postWarrantNarrativeProposal,
		getExhibits,
		getProsecutorSummary,
		fetchNarrativeExport,
		type NarrativeEvent,
		type WarrantNarrativeSection,
		type ExhibitItem,
		type ProsecutorSummarySection,
		type NarrativeExportFormat
	} from '$lib/apis/caseEngine';

	export let caseId: string;
	export let token: string;

	type WorkspaceTab = 'timeline' | 'warrant' | 'exhibits' | 'prosecutor' | 'exports';
	let activeTab: WorkspaceTab = 'timeline';

	// Narrative Timeline
	let timelineData: { case_id: string; events: NarrativeEvent[] } | null = null;
	let timelineLoading = false;
	let timelineError: string | null = null;

	// Warrant Narrative
	let warrantData: { case_id: string; proposal: { sections: WarrantNarrativeSection[] } } | null = null;
	let warrantLoading = false;
	let warrantGenerating = false;
	let warrantError: string | null = null;

	// Exhibits
	let exhibitsData: { case_id: string; exhibits: ExhibitItem[] } | null = null;
	let exhibitsLoading = false;
	let exhibitsError: string | null = null;

	// Prosecutor Summary
	let prosecutorData: { case_id: string; summary: { sections: ProsecutorSummarySection[] } } | null = null;
	let prosecutorLoading = false;
	let prosecutorError: string | null = null;

	// Exports
	let exportFormat: NarrativeExportFormat = 'html';
	let exportLoading = false;

	$: if (caseId && token && activeTab === 'timeline' && timelineData === null && !timelineLoading) {
		loadTimeline();
	}
	$: if (caseId && token && activeTab === 'exhibits' && exhibitsData === null && !exhibitsLoading) {
		loadExhibits();
	}
	$: if (caseId && token && activeTab === 'prosecutor' && prosecutorData === null && !prosecutorLoading) {
		loadProsecutor();
	}

	function formatDate(iso: string): string {
		try {
			const d = new Date(iso);
			if (Number.isNaN(d.getTime())) return iso;
			return d.toISOString().slice(0, 10);
		} catch {
			return iso;
		}
	}

	async function loadTimeline() {
		timelineLoading = true;
		timelineError = null;
		try {
			timelineData = await getNarrativeTimeline(caseId, token);
		} catch (e) {
			timelineError = (e as Error)?.message ?? 'Failed to load timeline';
		} finally {
			timelineLoading = false;
		}
	}

	async function generateWarrant() {
		warrantGenerating = true;
		warrantError = null;
		try {
			warrantData = await postWarrantNarrativeProposal(caseId, token);
			toast.success('Warrant narrative generated');
		} catch (e) {
			warrantError = (e as Error)?.message ?? 'Failed to generate';
			toast.error(warrantError);
		} finally {
			warrantGenerating = false;
		}
	}

	async function loadExhibits() {
		exhibitsLoading = true;
		exhibitsError = null;
		try {
			exhibitsData = await getExhibits(caseId, token);
		} catch (e) {
			exhibitsError = (e as Error)?.message ?? 'Failed to load exhibits';
		} finally {
			exhibitsLoading = false;
		}
	}

	async function loadProsecutor() {
		prosecutorLoading = true;
		prosecutorError = null;
		try {
			prosecutorData = await getProsecutorSummary(caseId, token);
		} catch (e) {
			prosecutorError = (e as Error)?.message ?? 'Failed to load summary';
		} finally {
			prosecutorLoading = false;
		}
	}

	async function doExport(
		path: 'narrative-timeline' | 'warrant-narrative' | 'exhibits' | 'prosecutor-summary' | 'court-packet',
		action: 'download' | 'open'
	) {
		exportLoading = true;
		try {
			await fetchNarrativeExport(caseId, token, path, exportFormat, action);
			toast.success(action === 'download' ? 'Download started' : 'Opened in new tab');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Export failed');
		} finally {
			exportLoading = false;
		}
	}
</script>

<div class="flex flex-col h-full min-h-0">
	<div class="shrink-0 flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
		<button
			type="button"
			class="px-2 py-1.5 text-sm rounded {activeTab === 'timeline'
				? 'bg-gray-200 dark:bg-gray-700 font-medium'
				: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
			on:click={() => (activeTab = 'timeline')}
		>
			Narrative Timeline
		</button>
		<button
			type="button"
			class="px-2 py-1.5 text-sm rounded {activeTab === 'warrant'
				? 'bg-gray-200 dark:bg-gray-700 font-medium'
				: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
			on:click={() => (activeTab = 'warrant')}
		>
			Warrant Narrative
		</button>
		<button
			type="button"
			class="px-2 py-1.5 text-sm rounded {activeTab === 'exhibits'
				? 'bg-gray-200 dark:bg-gray-700 font-medium'
				: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
			on:click={() => (activeTab = 'exhibits')}
		>
			Exhibits
		</button>
		<button
			type="button"
			class="px-2 py-1.5 text-sm rounded {activeTab === 'prosecutor'
				? 'bg-gray-200 dark:bg-gray-700 font-medium'
				: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
			on:click={() => (activeTab = 'prosecutor')}
		>
			Prosecutor Summary
		</button>
		<button
			type="button"
			class="px-2 py-1.5 text-sm rounded {activeTab === 'exports'
				? 'bg-gray-200 dark:bg-gray-700 font-medium'
				: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
			on:click={() => (activeTab = 'exports')}
		>
			Exports
		</button>
	</div>

	<div class="flex-1 min-h-0 overflow-auto p-4">
		{#if activeTab === 'timeline'}
			{#if timelineLoading}
				<p class="text-sm text-gray-500">Loading timeline…</p>
			{:else if timelineError}
				<p class="text-sm text-red-600 dark:text-red-400">{timelineError}</p>
			{:else if timelineData}
				{#if timelineData.events.length === 0}
					<p class="text-sm text-gray-500">No events.</p>
				{:else}
					<ul class="space-y-2 text-sm">
						{#each timelineData.events as event}
							<li class="border-b border-gray-100 dark:border-gray-800 pb-2">
								<span class="font-mono text-gray-600 dark:text-gray-400">{formatDate(event.occurred_at)}</span>
								<span class="ml-2 font-medium">{event.event_type}</span>
								{#if event.description}
									<p class="mt-1 text-gray-700 dark:text-gray-300">{event.description}</p>
								{/if}
								{#if event.citations?.length}
									<p class="mt-1 text-xs text-gray-500">Sources: {event.citations.length} citation(s)</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		{:else if activeTab === 'warrant'}
			<div class="space-y-4">
				<button
					type="button"
					class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
					on:click={generateWarrant}
					disabled={warrantGenerating}
				>
					{warrantGenerating ? 'Generating…' : 'Generate Warrant Narrative'}
				</button>
				{#if warrantError && !warrantData}
					<p class="text-sm text-red-600 dark:text-red-400">{warrantError}</p>
				{/if}
				{#if warrantData?.proposal?.sections?.length}
					<div class="space-y-4">
						{#each warrantData.proposal.sections as sec}
							<div class="border-l-2 border-gray-200 dark:border-gray-700 pl-3">
								<h3 class="text-sm font-medium">{sec.section}</h3>
								<p class="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{sec.text}</p>
								{#if sec.citations?.length}
									<p class="text-xs text-gray-500 mt-1">{sec.citations.length} citation(s)</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else if warrantData && !warrantData.proposal?.sections?.length}
					<p class="text-sm text-gray-500">No sections.</p>
				{/if}
			</div>
		{:else if activeTab === 'exhibits'}
			{#if exhibitsLoading}
				<p class="text-sm text-gray-500">Loading exhibits…</p>
			{:else if exhibitsError}
				<p class="text-sm text-red-600 dark:text-red-400">{exhibitsError}</p>
			{:else if exhibitsData}
				{#if exhibitsData.exhibits.length === 0}
					<p class="text-sm text-gray-500">No exhibits.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm border-collapse">
							<thead>
								<tr class="border-b border-gray-200 dark:border-gray-700">
									<th class="text-left py-1 pr-2">Date</th>
									<th class="text-left py-1 pr-2">Title</th>
									<th class="text-left py-1 pr-2">Exhibit ID</th>
									<th class="text-left py-1 pr-2">Source type</th>
								</tr>
							</thead>
							<tbody>
								{#each exhibitsData.exhibits as ex}
									<tr class="border-b border-gray-100 dark:border-gray-800">
										<td class="py-1 pr-2 font-mono text-gray-600 dark:text-gray-400">{formatDate(ex.occurred_at)}</td>
										<td class="py-1 pr-2">{ex.title ?? ex.exhibit_id}</td>
										<td class="py-1 pr-2 font-mono text-xs">{ex.exhibit_id}</td>
										<td class="py-1 pr-2">{ex.source_type}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			{/if}
		{:else if activeTab === 'prosecutor'}
			{#if prosecutorLoading}
				<p class="text-sm text-gray-500">Loading prosecutor summary…</p>
			{:else if prosecutorError}
				<p class="text-sm text-red-600 dark:text-red-400">{prosecutorError}</p>
			{:else if prosecutorData?.summary?.sections?.length}
				<div class="space-y-4">
					{#each prosecutorData.summary.sections as sec}
						<div class="border-l-2 border-gray-200 dark:border-gray-700 pl-3">
							<h3 class="text-sm font-medium">{sec.section}</h3>
							<p class="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{sec.text}</p>
							{#if sec.citations?.length}
								<p class="text-xs text-gray-500 mt-1">{sec.citations.length} citation(s)</p>
							{/if}
						</div>
					{/each}
				</div>
			{:else if prosecutorData}
				<p class="text-sm text-gray-500">No sections.</p>
			{/if}
		{:else if activeTab === 'exports'}
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<label class="text-sm font-medium">Format:</label>
					<select
						class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1"
						bind:value={exportFormat}
					>
						<option value="json">JSON</option>
						<option value="md">Markdown</option>
						<option value="html">HTML</option>
					</select>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						on:click={() => doExport('narrative-timeline', 'download')}
						disabled={exportLoading}
					>
						Export Narrative Timeline
					</button>
					<button
						type="button"
						class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						on:click={() => doExport('warrant-narrative', 'download')}
						disabled={exportLoading}
					>
						Export Warrant Narrative
					</button>
					<button
						type="button"
						class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						on:click={() => doExport('exhibits', 'download')}
						disabled={exportLoading}
					>
						Export Exhibits
					</button>
					<button
						type="button"
						class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
						on:click={() => doExport('prosecutor-summary', 'download')}
						disabled={exportLoading}
					>
						Export Prosecutor Summary
					</button>
					<button
						type="button"
						class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
						on:click={() => doExport('court-packet', 'download')}
						disabled={exportLoading}
					>
						Export Court Packet
					</button>
					{#if exportFormat === 'html'}
						<button
							type="button"
							class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
							on:click={() => doExport('court-packet', 'open')}
							disabled={exportLoading}
						>
							Open Court Packet (HTML) in new tab
						</button>
					{/if}
				</div>
				<p class="text-xs text-gray-500">
					Downloads use the selected format. For HTML, Court Packet can also be opened in a new tab.
				</p>
			</div>
		{/if}
	</div>
</div>
