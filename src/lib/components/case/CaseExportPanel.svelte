<!--
	P119-04 — Case-scoped deterministic export controls (calls Case Engine only; no client-side export logic).
-->
<script lang="ts">
	import { buildP119ExportRequestBody } from '$lib/case/caseExportP119RequestBody';
	import { CASE_EXPORT_P120_TEMPLATE_IDS } from '$lib/case/caseExportP120Template';
	import type { CaseExportPhase120Mode } from '$lib/case/caseExportP120Template';
	import { postCaseP119Export } from '$lib/apis/caseEngine/caseP119ExportApi';

	export let caseId: string;
	export let token: string | null;

	let includeNotes = false;
	let includeWorkflow = false;
	let includeRelationships = false;
	/** Explicit format selection — default plain text (shown in UI; no auto-run). */
	let format: 'plain_text' | 'json' = 'plain_text';
	/** P119-only plain vs Phase 120 template ids (plain text only; JSON always P119). */
	let phase120Mode: CaseExportPhase120Mode = 'p119';

	let loading = false;
	let errorMessage = '';
	let resultOpen = false;
	let resultBody = '';
	let resultFormat: 'json' | 'plain_text' | null = null;

	$: disabled = !caseId || !token || loading;

	async function generateExport(): Promise<void> {
		if (!token || !caseId) return;
		errorMessage = '';
		loading = true;
		try {
			const body = buildP119ExportRequestBody({
				includeNotes,
				includeWorkflow,
				includeRelationships,
				format,
				phase120Mode: format === 'json' ? 'p119' : phase120Mode
			});
			const res = await postCaseP119Export(caseId, token, body);
			resultBody = res.body;
			resultFormat = res.format;
			resultOpen = true;
		} catch (e: unknown) {
			const m = e instanceof Error ? e.message : String(e);
			errorMessage = m;
		} finally {
			loading = false;
		}
	}

	function closeResult(): void {
		resultOpen = false;
	}

	function downloadResult(): void {
		if (resultBody === '' || resultFormat == null) return;
		const mime = resultFormat === 'json' ? 'application/json' : 'text/plain;charset=utf-8';
		const blob = new Blob([resultBody], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = resultFormat === 'json' ? `case-export-${caseId}.json` : `case-export-${caseId}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div
	class="border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-3 bg-white/50 dark:bg-gray-900/40"
	data-testid="case-export-panel"
	data-case-export-case-id={caseId}
>
	<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Export</h3>
	{#if !caseId}
		<p class="text-xs text-gray-500 dark:text-gray-400" data-testid="case-export-no-case">No active case.</p>
	{:else if !token}
		<p class="text-xs text-amber-700 dark:text-amber-300" data-testid="case-export-no-token">
			Case Engine authentication is required to export. Sign in with Case Engine access.
		</p>
	{:else}
		<p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
			Generate a deterministic read-only export (timeline is always included). Choose inclusion, format, and
			(for plain text) whether to use a Phase 120 layout template — structure only; meaning is unchanged. Run
			export on the server — output is shown exactly as returned.
		</p>

		<fieldset class="space-y-2 mb-3" data-testid="case-export-inclusion">
			<legend class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Inclusion (matches Case Engine)</legend>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" checked disabled data-testid="case-export-timeline-locked" />
				<span>timeline (required, always included)</span>
			</label>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={includeNotes} data-testid="case-export-notes" />
				<span>notes</span>
			</label>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={includeWorkflow} data-testid="case-export-workflow" />
				<span>workflow</span>
			</label>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={includeRelationships} data-testid="case-export-relationships" />
				<span>relationships</span>
			</label>
		</fieldset>

		<fieldset class="mb-3" data-testid="case-export-format">
			<legend class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Format</legend>
			<div class="flex flex-wrap gap-4 text-sm">
				<label class="flex items-center gap-2">
					<input type="radio" name="p119-format" value="plain_text" bind:group={format} data-testid="case-export-format-plain" />
					<span>Plain Text</span>
				</label>
				<label class="flex items-center gap-2">
					<input type="radio" name="p119-format" value="json" bind:group={format} data-testid="case-export-format-json" />
					<span>JSON</span>
				</label>
			</div>
			<p class="text-xs text-gray-500 mt-1">Default: Plain Text (select before generating).</p>
		</fieldset>

		<fieldset class="mb-3" data-testid="case-export-phase120">
			<legend class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
				Plain text layout (Phase 120 template)
			</legend>
			<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
				Templates change document structure only, not field values. Timeline stays authoritative; notes and other
				supplementary sections are not authoritative. Disabled for JSON (JSON uses the P119 assembled report
				shape only).
			</p>
			<select
				class="w-full max-w-md text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1"
				disabled={format === 'json'}
				bind:value={phase120Mode}
				data-testid="case-export-phase120-select"
			>
				<option value="p119">P119 plain text (no Phase 120 template field)</option>
				{#each CASE_EXPORT_P120_TEMPLATE_IDS as tid}
					<option value={tid}>{tid}</option>
				{/each}
			</select>
		</fieldset>

		<div class="flex flex-wrap items-center gap-2 mb-2">
			<button
				type="button"
				class="px-3 py-1.5 text-sm rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 disabled:opacity-50"
				disabled={disabled}
				data-testid="case-export-generate"
				on:click={generateExport}
			>
				{loading ? 'Generating…' : 'Generate Export'}
			</button>
		</div>

		{#if errorMessage}
			<p class="text-sm text-red-600 dark:text-red-400" data-testid="case-export-error" role="alert">{errorMessage}</p>
		{/if}
	{/if}
</div>

{#if resultOpen}
	<div
		class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
		role="presentation"
		data-testid="case-export-result-backdrop"
		on:click={(e) => e.target === e.currentTarget && closeResult()}
		on:keydown={(e) => e.key === 'Escape' && closeResult()}
	>
		<div
			class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-w-4xl w-full max-h-[85vh] flex flex-col shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="case-export-result-title"
			data-testid="case-export-result-modal"
		>
			<div class="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 px-4 py-2">
				<h2 id="case-export-result-title" class="text-sm font-semibold">Export result</h2>
				<button type="button" class="text-sm text-gray-600 dark:text-gray-400" on:click={closeResult}>Close</button>
			</div>
			<p class="px-4 pt-2 text-xs text-gray-500">
				Format: <strong>{resultFormat}</strong> — shown exactly as returned (no client rewriting).
			</p>
			<div class="px-4 pb-2 flex gap-2">
				<button
					type="button"
					class="text-sm underline text-gray-700 dark:text-gray-300"
					data-testid="case-export-download"
					on:click={downloadResult}
				>
					Download
				</button>
			</div>
			<pre
				class="flex-1 overflow-auto m-4 mt-0 p-3 text-xs bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 whitespace-pre-wrap break-words"
				data-testid="case-export-result-body">{resultBody}</pre>
		</div>
	</div>
{/if}
