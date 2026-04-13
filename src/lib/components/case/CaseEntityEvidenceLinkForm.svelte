<script lang="ts">
	/**
	 * P107-03 — Manual link to timeline entry or case file (Phase 105 POST). Deterministic pickers only.
	 */
	import type { CaseEngineEvidenceLinkReadItem } from '$lib/apis/caseEngine/caseEntitiesApi';
	import { createCaseEntityEvidenceLink } from '$lib/apis/caseEngine/caseEntitiesApi';
	import type { CaseFile, TimelineEntry } from '$lib/apis/caseEngine';
	import { listCaseFiles, listCaseTimelineEntries } from '$lib/apis/caseEngine';
	import {
		P107_EVIDENCE_LINK_ADD_UNAVAILABLE_RETIRED,
		P107_EVIDENCE_LINK_EMPTY_ELIGIBLE,
		P107_EVIDENCE_LINK_FILTER_LABEL,
		P107_EVIDENCE_LINK_INTRO,
		P107_EVIDENCE_LINK_LOAD_ERROR,
		P107_EVIDENCE_LINK_SELECT_PLACEHOLDER,
		P107_EVIDENCE_LINK_SUBMIT,
		P107_EVIDENCE_LINK_SUBMITTING,
		P107_EVIDENCE_LINK_TOGGLE_CLOSE,
		P107_EVIDENCE_LINK_TOGGLE_OPEN,
		P107_EVIDENCE_LINK_TYPE_FILE,
		P107_EVIDENCE_LINK_TYPE_TIMELINE
	} from '$lib/case/p107CaseEntityEvidenceLinkCopy';

	export let caseId: string;
	export let entityId: string;
	export let caseEngineToken: string;
	/** When false, new links are not allowed (retired entity). */
	export let entityActive: boolean;
	export let evidenceLinks: CaseEngineEvidenceLinkReadItem[];
	export let onLinked: () => void | Promise<void>;

	let panelOpen = false;
	let pickerLoadGen = 0;
	let pickersLoading = false;
	let pickerError = '';
	let timelineEntries: TimelineEntry[] = [];
	let caseFiles: CaseFile[] = [];
	let linkKind: 'timeline_entry' | 'case_file' = 'timeline_entry';
	let selectedTargetId = '';
	let filterText = '';
	let formSubmitting = false;
	let formError = '';

	function isTimelineEntryActive(e: TimelineEntry): boolean {
		return e.deleted_at == null;
	}

	function isCaseFileActive(f: CaseFile): boolean {
		const d = (f as Record<string, unknown>).deleted_at;
		return d == null || d === '';
	}

	function timelineLabel(e: TimelineEntry): string {
		const excerpt = (e.text_original ?? '').replace(/\s+/g, ' ').trim();
		const short = excerpt.length > 72 ? `${excerpt.slice(0, 72)}…` : excerpt;
		return `${e.occurred_at} ${e.type}${short ? ` — ${short}` : ''}`;
	}

	function fileLabel(f: CaseFile): string {
		return f.original_filename;
	}

	function sortedFiles(files: CaseFile[]): CaseFile[] {
		return [...files].sort((a, b) => a.original_filename.localeCompare(b.original_filename));
	}

	$: linkedTimeline = new Set(
		evidenceLinks.filter((l) => l.link_type === 'timeline_entry').map((l) => l.target_id)
	);
	$: linkedFiles = new Set(evidenceLinks.filter((l) => l.link_type === 'case_file').map((l) => l.target_id));

	$: eligibleTimeline = timelineEntries.filter(
		(e) => isTimelineEntryActive(e) && !linkedTimeline.has(e.id)
	);
	$: eligibleFiles = sortedFiles(caseFiles).filter((f) => isCaseFileActive(f) && !linkedFiles.has(f.id));

	$: ft = filterText.trim().toLowerCase();
	$: filteredTimeline = ft
		? eligibleTimeline.filter((e) => timelineLabel(e).toLowerCase().includes(ft))
		: eligibleTimeline;
	$: filteredFiles = ft
		? eligibleFiles.filter((f) => fileLabel(f).toLowerCase().includes(ft))
		: eligibleFiles;

	$: selectOptions =
		linkKind === 'timeline_entry'
			? filteredTimeline.map((e) => ({ id: e.id, label: timelineLabel(e) }))
			: filteredFiles.map((f) => ({ id: f.id, label: fileLabel(f) }));

	async function loadPickers(): Promise<void> {
		const myCase = String(caseId ?? '').trim();
		const tok = caseEngineToken;
		if (!myCase || !tok) return;
		const gen = ++pickerLoadGen;
		pickersLoading = true;
		pickerError = '';
		try {
			const [t, f] = await Promise.all([listCaseTimelineEntries(myCase, tok), listCaseFiles(myCase, tok)]);
			if (gen !== pickerLoadGen) return;
			timelineEntries = Array.isArray(t) ? t : [];
			caseFiles = Array.isArray(f) ? f : [];
		} catch (e: unknown) {
			if (gen !== pickerLoadGen) return;
			timelineEntries = [];
			caseFiles = [];
			pickerError = e instanceof Error ? e.message : P107_EVIDENCE_LINK_LOAD_ERROR;
		} finally {
			if (gen === pickerLoadGen) pickersLoading = false;
		}
	}

	function togglePanel(): void {
		panelOpen = !panelOpen;
		if (panelOpen && entityActive && caseEngineToken) {
			void loadPickers();
		}
	}

	$: if (!entityActive) {
		panelOpen = false;
	}

	async function submitLink(): Promise<void> {
		formError = '';
		const tid = String(selectedTargetId ?? '').trim();
		const myCase = String(caseId ?? '').trim();
		const myEnt = String(entityId ?? '').trim();
		if (!myCase || !myEnt || !caseEngineToken) {
			formError = 'Case Engine session is required.';
			return;
		}
		if (!tid) {
			formError = 'Select a record to link.';
			return;
		}
		formSubmitting = true;
		try {
			await createCaseEntityEvidenceLink(myCase, myEnt, caseEngineToken, {
				link_type: linkKind,
				target_id: tid
			});
			selectedTargetId = '';
			await onLinked();
		} catch (e: unknown) {
			formError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			formSubmitting = false;
		}
	}
</script>

{#if caseEngineToken}
	<div class="flex flex-col gap-2 rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-raised)]">
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-60"
				data-testid="case-entity-detail--link-evidence-toggle"
				disabled={!entityActive}
				on:click={() => togglePanel()}
			>
				{panelOpen ? P107_EVIDENCE_LINK_TOGGLE_CLOSE : P107_EVIDENCE_LINK_TOGGLE_OPEN}
			</button>
			{#if !entityActive}
				<span class="text-xs text-[color:var(--ce-l-text-muted)]">{P107_EVIDENCE_LINK_ADD_UNAVAILABLE_RETIRED}</span>
			{/if}
		</div>
		{#if panelOpen && entityActive}
			<p class="text-xs text-[color:var(--ce-l-text-secondary)] max-w-prose">{P107_EVIDENCE_LINK_INTRO}</p>
			{#if pickersLoading}
				<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-entity-detail--link-evidence-loading">
					Loading…
				</p>
			{:else if pickerError}
				<p class="text-sm text-red-700 dark:text-red-300" data-testid="case-entity-detail--link-evidence-load-error" role="alert">
					{pickerError}
				</p>
			{:else}
				<div class="flex flex-wrap gap-4 text-sm">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="p107-link-kind"
							value="timeline_entry"
							bind:group={linkKind}
							on:change={() => {
								selectedTargetId = '';
							}}
						/>
						<span>{P107_EVIDENCE_LINK_TYPE_TIMELINE}</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="p107-link-kind"
							value="case_file"
							bind:group={linkKind}
							on:change={() => {
								selectedTargetId = '';
							}}
						/>
						<span>{P107_EVIDENCE_LINK_TYPE_FILE}</span>
					</label>
				</div>
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-[color:var(--ce-l-text-muted)]">{P107_EVIDENCE_LINK_FILTER_LABEL}</span>
					<input
						type="text"
						class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 text-[color:var(--ce-l-text-primary)]"
						autocomplete="off"
						data-testid="case-entity-detail--link-evidence-filter"
						bind:value={filterText}
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-[color:var(--ce-l-text-muted)]">{P107_EVIDENCE_LINK_SELECT_PLACEHOLDER}</span>
					<select
						class="rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-base)] px-2 py-1 text-[color:var(--ce-l-text-primary)]"
						data-testid="case-entity-detail--link-evidence-select"
						bind:value={selectedTargetId}
						disabled={formSubmitting || selectOptions.length === 0}
					>
						<option value="">{P107_EVIDENCE_LINK_SELECT_PLACEHOLDER}</option>
						{#each selectOptions as opt (opt.id)}
							<option value={opt.id}>{opt.label}</option>
						{/each}
					</select>
				</label>
				{#if selectOptions.length === 0}
					<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-entity-detail--link-evidence-empty">
						{P107_EVIDENCE_LINK_EMPTY_ELIGIBLE}
					</p>
				{/if}
				{#if formError}
					<p class="text-sm text-red-700 dark:text-red-300" data-testid="case-entity-detail--link-evidence-form-error" role="alert">
						{formError}
					</p>
				{/if}
				<button
					type="button"
					class="rounded px-3 py-1.5 text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white self-start"
					data-testid="case-entity-detail--link-evidence-submit"
					disabled={formSubmitting || !selectedTargetId}
					on:click={() => void submitLink()}
				>
					{formSubmitting ? P107_EVIDENCE_LINK_SUBMITTING : P107_EVIDENCE_LINK_SUBMIT}
				</button>
			{/if}
		{/if}
	</div>
{/if}
