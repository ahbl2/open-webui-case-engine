<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { activeUiThread } from '$lib/stores/activeUiThread';
	import {
		addThreadScopeFile,
		askCaseQuestion,
		downloadCaseFile,
		getThreadScopeFiles,
		listCaseFiles,
		removeThreadScopeFile,
		type AskCaseQuestionResponse,
		type AskCitation,
		type CaseFile,
		type ThreadScopeFile
	} from '$lib/apis/caseEngine';
	import { models } from '$lib/stores';

	export let caseId: string;
	export let token: string;

	$: modelAvailable = $models.length > 0;
	// Prefer the first Ollama model so the Case Engine backend uses an installed model name.
	// Falls back to any available model id if no Ollama-specific model is present.
	$: ollamaModel = ($models.find((m) => (m as any).owned_by === 'ollama') ?? $models[0])?.id ?? undefined;

	const TOPK_OPTIONS = [4, 6, 8, 10, 12] as const;
	let question = '';
	let topK = 8;
	let asking = false;
	let result: AskCaseQuestionResponse | null = null;
	let errorMessage = '';
	let parseErrorCitations: AskCitation[] = [];
	let showAllContext = false;
	let citationModal: AskCitation | null = null;
	let selectedFiles: ThreadScopeFile[] = [];
	let allCaseFiles: CaseFile[] = [];
	let selectedFilesLoading = false;
	let allCaseFilesLoading = false;
	let scopeOpsPending = false;
	let selectedFilesError = '';

	$: activeCaseThreadId =
		$activeUiThread?.scope === 'case' && $activeUiThread.caseId === caseId
			? $activeUiThread.threadId
			: '';

	$: selectedFileIds = new Set(selectedFiles.map((f) => f.id));
	$: scopeIndicatorLabel = !activeCaseThreadId
		? 'No active case thread (thread scope unavailable)'
		: selectedFiles.length > 0
			? `Scoped to ${selectedFiles.length} selected file${selectedFiles.length === 1 ? '' : 's'}`
			: 'Using all case files';

	let lastScopeLoadKey = '';
	$: scopeLoadKey = `${caseId}|${token}|${activeCaseThreadId}`;
	$: if (scopeLoadKey !== lastScopeLoadKey) {
		lastScopeLoadKey = scopeLoadKey;
		void loadThreadScopeData();
	}

	function humanizeAskError(raw: string): string {
		const lower = raw.toLowerCase();
		if (
			lower.includes('ollama') ||
			lower.includes('econnrefused') ||
			lower.includes('502') ||
			lower.includes('503') ||
			lower.includes('failed to fetch')
		) {
			return 'AI model is unavailable. Ensure Ollama is running and a model is configured. Case data is still accessible.';
		}
		return raw;
	}

	async function handleAsk() {
		if (!modelAvailable) return;
		const threadId = String(activeCaseThreadId ?? '').trim();
		if (!threadId) {
			toast.error('A thread must be active before asking a case question.');
			return;
		}
		const q = question.trim();
		if (q.length < 3) {
			toast.error('Question must be at least 3 characters');
			return;
		}
		if (q.length > 2000) {
			toast.error('Question must not exceed 2000 characters');
			return;
		}
		asking = true;
		errorMessage = '';
		parseErrorCitations = [];
		result = null;
		try {
			result = await askCaseQuestion(
				caseId,
				q,
				token,
				topK,
				ollamaModel,
				threadId
			);
		} catch (e: unknown) {
			const err = e as Error & { citations?: AskCitation[] };
			errorMessage = humanizeAskError(err?.message ?? 'Ask failed');
			if (err?.citations) {
				parseErrorCitations = err.citations;
			}
			toast.error(errorMessage);
		} finally {
			asking = false;
		}
	}

	async function loadThreadScopeData(): Promise<void> {
		if (!caseId || !token) {
			selectedFiles = [];
			allCaseFiles = [];
			return;
		}
		selectedFilesError = '';
		allCaseFilesLoading = true;
		try {
			allCaseFiles = await listCaseFiles(caseId, token);
		} catch (e) {
			console.error('[CaseAiAskTab] failed to load case files', e);
			allCaseFiles = [];
			selectedFilesError = 'Failed to load case files.';
		} finally {
			allCaseFilesLoading = false;
		}
		if (!activeCaseThreadId) {
			selectedFiles = [];
			return;
		}
		selectedFilesLoading = true;
		try {
			const res = await getThreadScopeFiles(caseId, activeCaseThreadId, token);
			selectedFiles = Array.isArray(res.files) ? res.files : [];
		} catch (e) {
			console.error('[CaseAiAskTab] failed to load thread scope files', e);
			selectedFiles = [];
			selectedFilesError = 'Failed to load selected files for this thread.';
		} finally {
			selectedFilesLoading = false;
		}
	}

	async function handleAddFileToScope(fileId: string): Promise<void> {
		if (!activeCaseThreadId || !caseId || !token) return;
		scopeOpsPending = true;
		selectedFilesError = '';
		try {
			await addThreadScopeFile(caseId, activeCaseThreadId, fileId, token);
			const refreshed = await getThreadScopeFiles(caseId, activeCaseThreadId, token);
			selectedFiles = Array.isArray(refreshed.files) ? refreshed.files : [];
		} catch (e) {
			const msg = (e as Error)?.message ?? 'Failed to add file to thread scope';
			selectedFilesError = msg;
			toast.error(msg);
		} finally {
			scopeOpsPending = false;
		}
	}

	async function handleRemoveFileFromScope(fileId: string): Promise<void> {
		if (!activeCaseThreadId || !caseId || !token) return;
		scopeOpsPending = true;
		selectedFilesError = '';
		try {
			await removeThreadScopeFile(caseId, activeCaseThreadId, fileId, token);
			const refreshed = await getThreadScopeFiles(caseId, activeCaseThreadId, token);
			selectedFiles = Array.isArray(refreshed.files) ? refreshed.files : [];
		} catch (e) {
			const msg = (e as Error)?.message ?? 'Failed to remove file from thread scope';
			selectedFilesError = msg;
			toast.error(msg);
		} finally {
			scopeOpsPending = false;
		}
	}

	function confidenceClass(c: 'LOW' | 'MEDIUM' | 'HIGH') {
		if (c === 'LOW') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
		if (c === 'MEDIUM') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
		return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
	}

	function showCitationModal(c: AskCitation) {
		citationModal = c;
	}

	/** Stable display key for citation: TE:id or CF:id[:chunk_id] */
	function citationKey(c: AskCitation): string {
		if (c.source_type === 'timeline_entry') return `TE:${c.id}`;
		return c.chunk_id ? `CF:${c.id}:${c.chunk_id}` : `CF:${c.id}`;
	}

	function filePageLabel(c: AskCitation): string | null {
		if (c.source_type !== 'case_file') return null;
		const start = c.page_start;
		const end = c.page_end;
		if (start == null && end == null) return null;
		if (start != null && end != null) {
			return start === end ? `p. ${start}` : `pp. ${start}-${end}`;
		}
		const single = start ?? end;
		return single != null ? `p. ${single}` : null;
	}

	async function handleOpenFile(c: AskCitation) {
		if (c.source_type !== 'case_file') return;
		try {
			await downloadCaseFile(c.id, c.original_filename, token);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Download failed');
		}
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<h2 class="text-sm font-medium">Case AI Q&A</h2>

	<div class="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-2.5">
		<div class="text-xs font-medium text-gray-700 dark:text-gray-300">{scopeIndicatorLabel}</div>
		<div class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
			Selected Files (Thread Scope)
		</div>
	</div>

	<div class="rounded border border-gray-200 dark:border-gray-700 p-3 space-y-2">
		<div class="text-xs font-medium text-gray-700 dark:text-gray-300">Selected Files (Thread Scope)</div>
		{#if !activeCaseThreadId}
			<div class="text-xs text-amber-700 dark:text-amber-300">
				Select or open a case thread to manage thread-scoped files.
			</div>
		{:else}
			{#if selectedFilesLoading}
				<div class="text-xs text-gray-500 dark:text-gray-400">Loading selected files…</div>
			{:else if selectedFiles.length === 0}
				<div class="text-xs text-gray-500 dark:text-gray-400">No files selected for this thread.</div>
			{:else}
				<div class="space-y-1.5">
					{#each selectedFiles as f (f.id)}
						<div class="flex items-center justify-between gap-2 text-xs rounded border border-gray-200 dark:border-gray-700 px-2 py-1.5">
							<div class="min-w-0">
								<div class="truncate text-gray-800 dark:text-gray-100">{f.original_filename}</div>
							</div>
							<button
								type="button"
								class="shrink-0 rounded border border-red-300 dark:border-red-700 px-2 py-0.5 text-[11px] text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
								disabled={scopeOpsPending}
								on:click={() => handleRemoveFileFromScope(f.id)}
							>
								Remove
							</button>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<div class="pt-2 border-t border-gray-200 dark:border-gray-700">
			<div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Case Files</div>
			{#if allCaseFilesLoading}
				<div class="text-xs text-gray-500 dark:text-gray-400">Loading case files…</div>
			{:else if allCaseFiles.length === 0}
				<div class="text-xs text-gray-500 dark:text-gray-400">No case files available.</div>
			{:else}
				<div class="space-y-1.5 max-h-48 overflow-y-auto">
					{#each allCaseFiles as f (f.id)}
						<div class="flex items-center justify-between gap-2 text-xs rounded border border-gray-200 dark:border-gray-700 px-2 py-1.5">
							<div class="truncate text-gray-800 dark:text-gray-100">{f.original_filename}</div>
							{#if selectedFileIds.has(f.id)}
								<button
									type="button"
									class="shrink-0 rounded border border-red-300 dark:border-red-700 px-2 py-0.5 text-[11px] text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
									disabled={!activeCaseThreadId || scopeOpsPending}
									on:click={() => handleRemoveFileFromScope(f.id)}
								>
									Remove
								</button>
							{:else}
								<button
									type="button"
									class="shrink-0 rounded border border-blue-300 dark:border-blue-700 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
									disabled={!activeCaseThreadId || scopeOpsPending}
									on:click={() => handleAddFileToScope(f.id)}
								>
									Add
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		{#if selectedFilesError}
			<div class="text-xs text-red-700 dark:text-red-300">{selectedFilesError}</div>
		{/if}
	</div>

	{#if !modelAvailable}
		<div class="rounded border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
			<div class="text-sm font-medium text-amber-800 dark:text-amber-200">No AI model available</div>
			<div class="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
				Connect or configure an AI provider (Ollama) to use Ask. Case data is still accessible.
			</div>
		</div>
	{/if}

	<div>
		<label class="block text-xs text-gray-600 dark:text-gray-400 mb-1"
			>Ask a question about this case…</label
		>
		<textarea
			bind:value={question}
			placeholder={modelAvailable ? 'e.g. What happened on 2024-01-15?' : 'AI unavailable — configure a model to enable Ask'}
			class="w-full rounded border border-gray-200 dark:border-gray-700 bg-transparent p-2 text-sm min-h-[100px]"
			disabled={asking || !modelAvailable}
		></textarea>
	</div>

	<div class="flex flex-wrap gap-2 items-center">
		<label class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
			TopK:
			<select
				bind:value={topK}
				class="rounded border border-gray-200 dark:border-gray-700 bg-transparent px-1.5 py-0.5 text-sm"
				disabled={asking || !modelAvailable}
			>
				{#each TOPK_OPTIONS as opt}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		</label>
		<button
			type="button"
			class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
			on:click={handleAsk}
			disabled={asking || !question.trim() || !modelAvailable || !activeCaseThreadId}
		>
			{asking ? 'Asking…' : 'Ask'}
		</button>
	</div>
	{#if !activeCaseThreadId}
		<div class="text-xs text-amber-700 dark:text-amber-300">
			Open a case thread to ask with thread-scoped context.
		</div>
	{/if}

	{#if errorMessage}
		<div class="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-700 dark:text-red-300">
			{errorMessage}
		</div>
		{#if parseErrorCitations.length > 0}
			<div class="text-xs text-gray-600 dark:text-gray-400">
				Retrieved context (not used due to AI parse failure):
			</div>
			<div class="space-y-1 max-h-40 overflow-y-auto">
				{#each parseErrorCitations as c (citationKey(c))}
					<button
						type="button"
						class="block w-full text-left rounded border border-gray-200 dark:border-gray-700 p-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
						on:click={() => showCitationModal(c)}
					>
						{#if c.source_type === 'timeline_entry'}
							<span class="text-gray-500">TE:</span> {c.occurred_at} | {c.type} — {c.snippet.slice(0, 80)}…
						{:else}
							<span class="text-gray-500">CF:</span> {c.original_filename}{#if filePageLabel(c)} ({filePageLabel(c)}){/if} — {c.snippet.slice(0, 80)}…
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	{#if result}
		<div class="space-y-4">
			<div class="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm bg-gray-50 dark:bg-gray-800/50">
				<div class="whitespace-pre-wrap">{result.answer}</div>
				<div class="mt-2">
					<span
						class="inline-block rounded px-2 py-0.5 text-xs font-medium {confidenceClass(result.confidence)}"
					>
						{result.confidence}
					</span>
				</div>
			</div>

			{#if result.used_citations.length > 0}
				<div>
					<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
						Citations used
					</h3>
					<div class="space-y-1.5">
						{#each result.used_citations as c (citationKey(c))}
							<button
								type="button"
								class="block w-full text-left rounded border border-gray-200 dark:border-gray-700 p-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
								on:click={() => showCitationModal(c)}
							>
								{#if c.source_type === 'timeline_entry'}
									<div class="text-gray-600 dark:text-gray-400">
										<span class="text-gray-500">TE:</span> {c.occurred_at} | {c.type} <span class="text-gray-400">({c.id.slice(0, 8)}…)</span>
									</div>
									<div class="text-gray-800 dark:text-gray-200 mt-0.5 truncate">
										{c.snippet}
									</div>
								{:else}
									<div class="text-gray-600 dark:text-gray-400">
										<span class="text-gray-500">CF:</span> {c.original_filename}
										{#if filePageLabel(c)}
											<span class="ml-1 text-gray-500">{filePageLabel(c)}</span>
										{/if}
										<button
											type="button"
											class="ml-2 text-blue-600 dark:text-blue-400 underline hover:no-underline"
											on:click={(e) => {
												e.stopPropagation();
												handleOpenFile(c);
											}}
										>
											Open file
										</button>
									</div>
									<div class="text-gray-800 dark:text-gray-200 mt-0.5 truncate">
										{c.snippet}
									</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if result.citations.length > result.used_citations.length}
				<details class="rounded border border-gray-200 dark:border-gray-700">
					<summary class="px-2 py-1.5 text-xs font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
						All retrieved context ({result.citations.length})
					</summary>
					<div class="p-2 space-y-1 max-h-48 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
						{#each result.citations as c (citationKey(c))}
							<button
								type="button"
								class="block w-full text-left rounded p-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
								on:click={() => showCitationModal(c)}
							>
								{#if c.source_type === 'timeline_entry'}
									<span class="text-gray-500">TE:</span> {c.occurred_at} | {c.type} — {c.snippet.slice(0, 60)}…
								{:else}
									<span class="text-gray-500">CF:</span> {c.original_filename}{#if filePageLabel(c)} ({filePageLabel(c)}){/if} — {c.snippet.slice(0, 60)}…
								{/if}
							</button>
						{/each}
					</div>
				</details>
			{/if}
		</div>
	{/if}
</div>

{#if citationModal}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-modal="true"
		on:click={() => (citationModal = null)}
		on:keydown={(e) => e.key === 'Escape' && (citationModal = null)}
	>
		<div
			class="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 max-w-lg max-h-[80vh] overflow-y-auto shadow-xl"
			on:click|stopPropagation
			role="document"
		>
			<h3 class="text-sm font-medium mb-2">
				{#if citationModal.source_type === 'timeline_entry'}
					<span class="text-gray-500">TE:</span> Timeline entry — {citationModal.occurred_at} | {citationModal.type}
				{:else}
					<span class="text-gray-500">CF:</span> {citationModal.original_filename}
					{#if filePageLabel(citationModal)}
						<span class="text-gray-500 ml-1">({filePageLabel(citationModal)})</span>
					{/if}
				{/if}
			</h3>
			<div class="text-xs text-gray-500 mb-2 font-mono">{citationKey(citationModal)}</div>
			<div class="text-sm whitespace-pre-wrap border-t border-gray-200 dark:border-gray-700 pt-2">
				{citationModal.snippet}
			</div>
			<div class="mt-4 flex justify-end">
				<button
					type="button"
					class="rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
					on:click={() => (citationModal = null)}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
