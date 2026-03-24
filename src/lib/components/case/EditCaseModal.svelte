<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { updateCase, type CaseEngineCase } from '$lib/apis/caseEngine';
	import { normalizeCaseNumber, normalizeIncidentDate, isValidIncidentDate } from '$lib/utils/caseCreateDraft';
	import { toast } from 'svelte-sonner';

	const dispatch = createEventDispatcher<{
		close: void;
		saved: { case: CaseEngineCase };
	}>();

	export let show = false;
	export let token: string | null = null;
	export let caseData: CaseEngineCase | null = null;

	let case_number = '';
	let title = '';
	let incident_date = '';
	let initial_case_number = '';
	let initial_title = '';
	let initial_incident_date = '';
	let seededCaseKey = '';
	let submitting = false;
	let submitError = '';
	let draftChangeSummary: { patch: EditPatch; error: string } = { patch: {}, error: '' };

	$: {
		const nextKey = show && caseData?.id ? `${caseData.id}:${caseData.updated_at ?? ''}` : '';
		if (show && caseData && nextKey !== seededCaseKey) {
			seededCaseKey = nextKey;
			case_number = String(caseData.case_number ?? '');
			title = String(caseData.title ?? '');
			incident_date = typeof caseData.incident_date === 'string' ? caseData.incident_date : '';
			initial_case_number = normalizeCaseNumber(case_number);
			initial_title = String(title ?? '').trim();
			initial_incident_date = normalizeIncidentDate(incident_date);
			submitError = '';
			submitting = false;
		}
		if (!show) {
			seededCaseKey = '';
		}
	}

	type EditPatch = {
		case_number?: string;
		title?: string;
		incident_date?: string;
	};

	function closeModal() {
		if (submitting) return;
		dispatch('close');
	}

	function buildPatchAndValidate(): { patch: EditPatch; error: string } {
		const nextCaseNumber = normalizeCaseNumber(case_number);
		const nextTitle = String(title ?? '').trim();
		const nextIncidentDate = normalizeIncidentDate(incident_date);
		const patch: EditPatch = {};
		if (nextCaseNumber !== initial_case_number) {
			if (!nextCaseNumber) return { patch: {}, error: 'Case number is required.' };
			patch.case_number = nextCaseNumber;
		}
		if (nextTitle !== initial_title) {
			if (!nextTitle) return { patch: {}, error: 'Title is required.' };
			patch.title = nextTitle;
		}
		if (nextIncidentDate !== initial_incident_date) {
			if (!nextIncidentDate) return { patch: {}, error: 'Incident date is required.' };
			if (!isValidIncidentDate(nextIncidentDate)) {
				return { patch: {}, error: 'Incident date must use YYYY-MM-DD.' };
			}
			patch.incident_date = nextIncidentDate;
		}
		return { patch, error: '' };
	}

	$: draftChangeSummary = buildPatchAndValidate();

	async function submitEditCase() {
		if (submitting) return;
		if (!caseData?.id) {
			submitError = 'Case data is not loaded.';
			return;
		}
		const { patch, error } = buildPatchAndValidate();
		if (error) {
			submitError = error;
			return;
		}
		if (Object.keys(patch).length === 0) {
			submitError = 'No changes to save.';
			return;
		}
		if (!token) {
			submitError = 'Case Engine session is not available.';
			return;
		}

		submitting = true;
		submitError = '';
		try {
			const saved = await updateCase(token, caseData.id, patch);
			toast.success(`Updated case ${saved.case_number}`);
			dispatch('saved', { case: saved });
		} catch (e) {
			submitError = e instanceof Error ? e.message : 'Failed to update case.';
		} finally {
			submitting = false;
		}
	}
</script>

{#if show}
	<div class="fixed inset-0 z-40 bg-black/50" on:click={closeModal} />
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
			<div class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Case</h2>
				<button
					type="button"
					class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					on:click={closeModal}
					aria-label="Close edit case modal"
					disabled={submitting}
				>
					✕
				</button>
			</div>

			<div class="px-5 py-4 space-y-4">
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-case-number">
						Case Number
					</label>
					<input
						id="edit-case-number"
						type="text"
						class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
						bind:value={case_number}
						disabled={submitting}
					/>
				</div>

				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-case-title">
						Title
					</label>
					<input
						id="edit-case-title"
						type="text"
						class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
						bind:value={title}
						disabled={submitting}
					/>
				</div>

				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" for="edit-case-incident-date">
						Incident Date
					</label>
					<input
						id="edit-case-incident-date"
						type="date"
						class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
						bind:value={incident_date}
						required
						disabled={submitting}
					/>
					{#if !initial_incident_date}
						<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
							This legacy case has no incident date yet. Add one when you are ready.
						</p>
					{/if}
				</div>

				{#if submitError}
					<div class="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
						{submitError}
					</div>
				{:else if Object.keys(draftChangeSummary.patch).length === 0}
					<div class="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
						Make a change to enable saving.
					</div>
				{/if}
			</div>

			<div class="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
				<button
					type="button"
					class="px-3 py-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
					on:click={closeModal}
					disabled={submitting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
					on:click={submitEditCase}
					disabled={submitting}
				>
					{submitting ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</div>
	</div>
{/if}
