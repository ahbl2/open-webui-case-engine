<script lang="ts">
	/**
	 * Timeline tab — "From document" quick-propose button.
	 *
	 * Lets an investigator pick a file directly from the Timeline tab header
	 * without navigating away to the Files tab first. The flow is:
	 *
	 *   1. Click button → hidden <input type="file"> opens (.docx / .pdf / .txt)
	 *   2. File selected → upload to case files (POST /cases/:id/files)
	 *   3. Immediately trigger propose (POST .../propose-timeline-entries)
	 *   4. Processing modal shown with Cancel (AbortController)
	 *   5. If bulk threshold exceeded → bulk confirm modal (same as Files tab)
	 *   6. On success → navigate to /case/:id/proposals
	 *
	 * Modal shell and copy are identical to CaseFilesTab so investigators get
	 * a consistent experience regardless of which tab they start from.
	 * Nothing is written to the official timeline until the operator reviews,
	 * approves, and commits each proposal in the Proposals tab.
	 */
	import { onDestroy } from 'svelte';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		uploadCaseFile,
		extractCaseFileText,
		addFileTag,
		proposeTimelineEntriesFromCaseFile
	} from '$lib/apis/caseEngine';

	// ── Props ──────────────────────────────────────────────────────────────────

	/** Case ID from the parent route. */
	export let caseId: string;
	/** Case Engine JWT from `$caseEngineToken`. */
	export let token: string;
	/** When true the trigger button is also disabled (e.g. while timeline is loading). */
	export let disabled = false;

	// ── Workflow state ─────────────────────────────────────────────────────────

	type IdleState = { step: 'idle' };
	type UploadingState = { step: 'uploading'; filename: string };
	type ExtractingState = { step: 'extracting'; fileId: string; filename: string };
	type ProcessingState = { step: 'processing'; fileId: string; filename: string; abort: AbortController };
	type BulkConfirmState = {
		step: 'bulk_confirm';
		fileId: string;
		filename: string;
		count: number;
		threshold: number;
		bulkToken: string | null;
		runId: string | null;
	};
	type Workflow = IdleState | UploadingState | ExtractingState | ProcessingState | BulkConfirmState;

	let workflow: Workflow = { step: 'idle' };
	let error = '';
	let fileInput: HTMLInputElement;

	/** Monotonic counter — prevents stale async responses from landing after abort/cancel. */
	let generation = 0;

	// ── Derived ────────────────────────────────────────────────────────────────

	$: busy = workflow.step === 'uploading' || workflow.step === 'extracting' || workflow.step === 'processing';
	$: modalOpen = workflow.step === 'processing' || workflow.step === 'bulk_confirm';

	// ── File picker ────────────────────────────────────────────────────────────

	function openFilePicker(): void {
		error = '';
		fileInput?.click();
	}

	function onFileSelected(e: Event): void {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // allow re-selecting same file
		if (!file || !token || !caseId) return;
		void startFlow(file);
	}

	// ── Upload + initial propose ───────────────────────────────────────────────

	async function startFlow(file: File): Promise<void> {
		const gen = ++generation;
		error = '';

		// Step 1 — upload
		workflow = { step: 'uploading', filename: file.name };
		let fileId: string;
		try {
			const uploaded = await uploadCaseFile(caseId, file, token);
			if (gen !== generation) return;
			fileId = uploaded.id;
		} catch (err) {
			if (gen !== generation) return;
			workflow = { step: 'idle' };
			error = err instanceof Error ? err.message : 'Upload failed';
			return;
		}

		// Tag the file as 'timeline' so it's easily identifiable in the Files tab.
		// Fire-and-forget — a tag failure is non-fatal; the ingest should still proceed.
		addFileTag(caseId, fileId, 'timeline', token).catch(() => {});

		// Step 2 — extract text (required before propose)
		workflow = { step: 'extracting', fileId, filename: file.name };
		try {
			const extraction = await extractCaseFileText(fileId, token);
			if (gen !== generation) return;
			if (extraction.status !== 'EXTRACTED') {
				workflow = { step: 'idle' };
				error =
					extraction.message ??
					`Text extraction failed (status: ${extraction.status}). Only .docx, .pdf, and .txt files are supported.`;
				return;
			}
		} catch (err) {
			if (gen !== generation) return;
			workflow = { step: 'idle' };
			error = err instanceof Error ? err.message : 'Text extraction failed';
			return;
		}

		// Step 3 — initial propose (no bulk confirmation yet)
		await runPropose({ gen, fileId, filename: file.name, confirmBulk: false, bulkToken: null });
	}

	// ── Bulk confirm re-submit ─────────────────────────────────────────────────

	function onBulkConfirm(): void {
		if (workflow.step !== 'bulk_confirm') return;
		const { fileId, filename, bulkToken } = workflow;
		const gen = ++generation;
		void runPropose({ gen, fileId, filename, confirmBulk: true, bulkToken });
	}

	// ── Shared propose call ────────────────────────────────────────────────────

	async function runPropose(opts: {
		gen: number;
		fileId: string;
		filename: string;
		confirmBulk: boolean;
		bulkToken: string | null;
	}): Promise<void> {
		const { gen, fileId, filename, confirmBulk, bulkToken } = opts;
		const abort = new AbortController();
		workflow = { step: 'processing', fileId, filename, abort };

		try {
			const result = await proposeTimelineEntriesFromCaseFile(caseId, fileId, token, {
				confirm_bulk: confirmBulk,
				signal: abort.signal,
				...(bulkToken ? { bulk_confirmation_token: bulkToken } : {})
			});
			if (gen !== generation) return;

			if (result.status === 'confirmation_required') {
				workflow = {
					step: 'bulk_confirm',
					fileId,
					filename,
					count: result.proposal_count,
					threshold: result.threshold,
					bulkToken: result.bulk_confirmation_token ?? null,
					runId: result.proposal_generation_run_id ?? null
				};
				return;
			}

			// Success — navigate to Proposals tab
			workflow = { step: 'idle' };
			await goto(`/case/${caseId}/proposals`);
		} catch (err) {
			if (gen !== generation) return;
			workflow = { step: 'idle' };
			if ((err as { name?: string }).name === 'AbortError') return;
			error = err instanceof Error ? err.message : 'Proposal generation failed';
		}
	}

	// ── Cancel / dismiss ───────────────────────────────────────────────────────

	function dismiss(): void {
		if (workflow.step === 'processing') workflow.abort.abort();
		generation++;
		workflow = { step: 'idle' };
		error = '';
	}

	onDestroy(() => {
		if (workflow.step === 'processing') workflow.abort.abort();
	});
</script>

<!--
  Hidden file input — opened programmatically by the trigger button.
  Accepts .docx (Word), .pdf, and .txt. Additional formats can be added
  here; the backend already handles extraction for supported types.
-->
<input
	bind:this={fileInput}
	type="file"
	accept=".docx,.pdf,.txt"
	class="sr-only"
	tabindex="-1"
	aria-hidden="true"
	on:change={onFileSelected}
/>

<!--
  Trigger button — violet to visually distinguish it from the blue "Log entry"
  button beside it, while sharing the same size/shape/hover pattern.
-->
<button
	type="button"
	on:click={openFilePicker}
	disabled={disabled || busy}
	class="text-xs font-medium px-2.5 py-1 rounded
	       text-violet-600 dark:text-violet-400
	       hover:text-violet-800 dark:hover:text-violet-200
	       hover:bg-violet-50 dark:hover:bg-violet-900/20
	       disabled:opacity-40 transition"
	data-testid="timeline-propose-from-document-btn"
	title="Upload a document (.docx, .pdf, .txt) and generate pending timeline proposals for review"
>
	{#if workflow.step === 'uploading'}
		Uploading…
	{:else if workflow.step === 'extracting'}
		Extracting…
	{:else}
		📄 From document
	{/if}
</button>

{#if error}
	<span
		class="text-[10px] text-red-600 dark:text-red-400 max-w-[16rem] truncate"
		data-testid="timeline-propose-from-doc-error"
		title={error}
	>
		{error}
	</span>
{/if}

<!--
  Processing + bulk confirm modal.
  Shell, copy, and keyboard/click-outside behaviour are identical to
  CaseFilesTab so the experience is consistent across tabs.
-->
{#if modalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		aria-labelledby="tl-doc-propose-modal-title"
		on:click={(e) => e.target === e.currentTarget && dismiss()}
		on:keydown={(e) => e.key === 'Escape' && dismiss()}
		tabindex="-1"
		data-testid="timeline-propose-from-doc-modal"
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="max-w-md w-full rounded-lg bg-white dark:bg-gray-850 shadow-xl mx-4 p-4"
			on:click|stopPropagation
		>
			{#key workflow.step}

				{#if workflow.step === 'processing'}
					<div data-testid="timeline-propose-from-doc-processing">
						<h3 id="tl-doc-propose-modal-title" class="font-medium text-sm mb-2">
							Processing document for timeline proposals
						</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
							<strong class="text-gray-700 dark:text-gray-300">{workflow.filename}</strong>
						</p>
						<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
							Analyzing extracted text and generating pending proposals. This may take a
							moment. Nothing is committed to the official timeline until you review and
							approve in the Proposals tab.
						</p>
						<div class="flex items-center gap-3 mb-4" aria-live="polite">
							<Spinner className="size-6 text-violet-600 dark:text-violet-400" />
							<span class="text-sm text-gray-700 dark:text-gray-300">Working…</span>
						</div>
						<div class="flex justify-end">
							<button
								type="button"
								class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600
								       hover:bg-gray-50 dark:hover:bg-gray-800 transition"
								data-testid="timeline-propose-from-doc-cancel"
								on:click={dismiss}
							>
								Cancel
							</button>
						</div>
					</div>

				{:else if workflow.step === 'bulk_confirm'}
					<div data-testid="timeline-propose-from-doc-bulk-confirm">
						<h3 id="tl-doc-propose-modal-title" class="font-medium text-sm mb-2">
							Many timeline proposals
						</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
							Extraction would create <strong>{workflow.count}</strong> pending proposals
							(threshold {workflow.threshold}). This stays review-first — nothing is written
							to the official Timeline until you approve and commit each entry. Continue?
						</p>
						<div class="flex justify-end gap-2">
							<button
								type="button"
								class="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600
								       hover:bg-gray-50 dark:hover:bg-gray-800 transition"
								on:click={dismiss}
							>
								Cancel
							</button>
							<button
								type="button"
								class="px-3 py-1.5 text-sm rounded bg-violet-600 text-white
								       hover:bg-violet-700 transition"
								data-testid="timeline-propose-from-doc-bulk-submit"
								on:click={onBulkConfirm}
							>
								Create proposals
							</button>
						</div>
						{#if dev && workflow.runId}
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-3 font-mono break-all">
								Run trace id (dev): {workflow.runId}
							</p>
						{/if}
					</div>
				{/if}

			{/key}
		</div>
	</div>
{/if}
