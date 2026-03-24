<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { createCaseFromDraft, validateCaseCreateDraft, type CaseCreateDraft } from '$lib/utils/caseCreateDraft';
	import { toast } from 'svelte-sonner';

	const dispatch = createEventDispatcher<{
		close: void;
		created: {
			id: string;
			case_number: string;
			title: string;
			unit: string;
			status: string;
			incident_date?: string | null;
		};
	}>();

	export let show = false;
	export let token: string | null = null;

	let draft: CaseCreateDraft = {
		unit: 'CID',
		case_number: '',
		title: '',
		incident_date: ''
	};
	let submitting = false;
	let submitError = '';

	function resetForm() {
		draft = {
			unit: 'CID',
			case_number: '',
			title: '',
			incident_date: ''
		};
		submitting = false;
		submitError = '';
	}

	function closeModal() {
		if (submitting) return;
		resetForm();
		dispatch('close');
	}

	async function submitCreateCase() {
		if (submitting) return;
		const checked = validateCaseCreateDraft(draft);
		if (!checked.valid) {
			submitError =
				checked.errors[checked.missing[0]] ||
				checked.incident_date_error ||
				'Please fill in all required fields.';
			return;
		}
		if (!token) {
			submitError = 'Case Engine session is not available.';
			return;
		}
		submitting = true;
		submitError = '';
		try {
			const created = await createCaseFromDraft(token, draft);
			toast.success(`Created case ${created.case_number}`);
			dispatch('created', {
				id: created.id,
				case_number: created.case_number,
				title: created.title,
				unit: created.unit,
				status: created.status,
				incident_date:
					typeof created.incident_date === 'string' ? created.incident_date : null
			});
			resetForm();
		} catch (e) {
			submitError = e instanceof Error ? e.message : 'Failed to create case.';
		} finally {
			submitting = false;
		}
	}

	$: if (!show) {
		resetForm();
	}
</script>

{#if show}
	<div class="fixed inset-0 z-40 bg-black/50" on:click={closeModal} />
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
			<div class="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Create Case</h2>
				<button
					type="button"
					class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					on:click={closeModal}
					aria-label="Close create case modal"
					disabled={submitting}
				>
					✕
				</button>
			</div>

			<div class="px-5 py-4 space-y-4">
				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" for="create-case-unit">
						Unit
					</label>
					<select
						id="create-case-unit"
						class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
						bind:value={draft.unit}
						disabled={submitting}
					>
						<option value="CID">CID</option>
						<option value="SIU">SIU</option>
					</select>
				</div>

				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" for="create-case-number">
						Case Number
					</label>
					<input
						id="create-case-number"
						type="text"
						class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
						placeholder="CID-001-233333444"
						bind:value={draft.case_number}
						disabled={submitting}
					/>
				</div>

				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" for="create-case-title">
						Title
					</label>
					<input
						id="create-case-title"
						type="text"
						class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
						placeholder="Brief case title"
						bind:value={draft.title}
						disabled={submitting}
					/>
				</div>

				<div>
					<label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" for="create-case-incident-date">
						Incident Date
					</label>
					<input
						id="create-case-incident-date"
						type="date"
						class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
						bind:value={draft.incident_date}
						required
						disabled={submitting}
					/>
					<p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
						Saved as date-only text (`YYYY-MM-DD`), with no timezone conversion.
					</p>
				</div>

				<div class="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
					Status will be set to <span class="font-semibold">OPEN</span>.
				</div>

				{#if submitError}
					<div class="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
						{submitError}
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
					on:click={submitCreateCase}
					disabled={submitting}
				>
					{submitting ? 'Creating...' : 'Create Case'}
				</button>
			</div>
		</div>
	</div>
{/if}

