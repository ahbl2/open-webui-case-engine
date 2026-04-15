<!--
	P128-02 — Manual proposal creation (P19 proposal_records). No page stores; no imported case data.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		createProposal,
		listCaseThreadAssociations,
		type CaseThreadAssociation,
		type ProposalType
	} from '$lib/apis/caseEngine';
	import { DS_BTN_CLASSES, DS_TIMELINE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		P128_CREATE_CANCEL,
		P128_CREATE_FIELD_ENTRY_TYPE_LABEL,
		P128_CREATE_FIELD_OCCURRED_AT_LABEL,
		P128_CREATE_FIELD_TEXT_HELP,
		P128_CREATE_FIELD_TEXT_LABEL,
		P128_CREATE_FIELD_TYPE_LABEL,
		P128_CREATE_SECTION_TITLE,
		P128_CREATE_SUBMIT,
		P128_CREATE_SUBMITTING,
		P128_CREATE_SUCCESS_TOAST,
		P128_CREATE_THREAD_CHOICE_REQUIRED,
		P128_CREATE_THREAD_HELP,
		P128_CREATE_THREAD_LABEL,
		P128_CREATE_THREAD_NONE,
		P128_CREATE_TYPE_NOTE,
		P128_CREATE_TYPE_TIMELINE,
		P128_CREATE_VALIDATION_OCCURRED_AT,
		P128_CREATE_VALIDATION_TEXT,
		P128_CREATE_VALIDATION_TIMELINE_FIELDS
	} from '$lib/caseContext/p128ProposalCreateCopy';
	import {
		TIMELINE_ENTRY_TYPE_VALUES,
		timelineEntryTypeOptionLabel
	} from '$lib/caseTimeline/timelineEntryTypeOptions';

	export let testIdPrefix = 'proposal-p128-create';

	export let caseId: string;
	export let token: string;
	export let onSuccess: () => void | Promise<void>;
	export let onCancel: () => void;

	let proposalType: ProposalType = 'timeline';
	let bodyText = '';
	let occurredAt = '';
	let entryType: string = TIMELINE_ENTRY_TYPE_VALUES[0] ?? 'note';

	let threads: CaseThreadAssociation[] = [];
	let threadId = '';
	let threadsLoaded = false;
	let threadsError = '';

	let clientError = '';
	let busy = false;

	function tid(suffix: string): string {
		return `${testIdPrefix}--${suffix}`;
	}

	onMount(() => {
		void loadThreads();
	});

	async function loadThreads(): Promise<void> {
		const cid = String(caseId ?? '').trim();
		if (!cid || !token) {
			threadsLoaded = true;
			return;
		}
		threadsError = '';
		try {
			const list = await listCaseThreadAssociations(cid, token);
			threads = Array.isArray(list) ? list : [];
			if (threads.length === 1) {
				threadId = threads[0].external_thread_id;
			} else {
				threadId = '';
			}
		} catch (e: unknown) {
			threads = [];
			threadId = '';
			threadsError = e instanceof Error ? e.message : 'Failed to load case threads.';
		} finally {
			threadsLoaded = true;
		}
	}

	function isValidIsoInstant(s: string): boolean {
		const t = String(s ?? '').trim();
		if (!t) return false;
		const ms = Date.parse(t);
		return !Number.isNaN(ms);
	}

	async function submit(): Promise<void> {
		const cid = String(caseId ?? '').trim();
		if (!cid || !token) return;

		const textRaw = bodyText;
		if (textRaw.trim().length === 0) {
			clientError = P128_CREATE_VALIDATION_TEXT;
			return;
		}

		if (!threadId.trim()) {
			clientError =
				threads.length > 1 ? P128_CREATE_THREAD_CHOICE_REQUIRED : P128_CREATE_THREAD_NONE;
			return;
		}

		let proposed_payload: Record<string, unknown>;
		if (proposalType === 'note') {
			proposed_payload = { content: textRaw };
		} else {
			const oa = occurredAt.trim();
			const et = entryType.trim();
			if (!oa || !et) {
				clientError = P128_CREATE_VALIDATION_TIMELINE_FIELDS;
				return;
			}
			if (!isValidIsoInstant(oa)) {
				clientError = P128_CREATE_VALIDATION_OCCURRED_AT;
				return;
			}
			proposed_payload = {
				occurred_at: oa,
				type: et,
				text_original: textRaw
			};
		}

		clientError = '';
		busy = true;
		try {
			await createProposal(
				cid,
				{
					source_scope: 'case',
					source_thread_id: threadId.trim(),
					proposal_type: proposalType,
					proposed_payload
				},
				token
			);
			toast.success(P128_CREATE_SUCCESS_TOAST);
			bodyText = '';
			occurredAt = '';
			await onSuccess();
		} catch (e: unknown) {
			clientError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-3 rounded border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-raised)] p-3" data-testid={tid('form')}>
	<div class="text-sm font-medium text-[color:var(--ce-l-text-primary)]">{P128_CREATE_SECTION_TITLE}</div>
	<p class="text-xs text-[color:var(--ce-l-text-muted)] m-0">{P128_CREATE_FIELD_TEXT_HELP}</p>
	<p class="text-xs text-[color:var(--ce-l-text-muted)] m-0">{P128_CREATE_THREAD_HELP}</p>

	{#if threadsError}
		<p class="text-sm text-red-600 dark:text-red-400 m-0" role="alert" data-testid={tid('threads-error')}>{threadsError}</p>
	{/if}

	{#if threadsLoaded && threads.length === 0 && !threadsError}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0" data-testid={tid('no-threads')}>{P128_CREATE_THREAD_NONE}</p>
	{/if}

	{#if threadsLoaded && threads.length > 0}
		{#if threads.length > 1}
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-[color:var(--ce-l-text-secondary)]">{P128_CREATE_THREAD_LABEL}</span>
				<select
					class="w-full {DS_TIMELINE_CLASSES.formControl}"
					bind:value={threadId}
					data-testid={tid('thread')}
					autocomplete="off"
					required
				>
					<option value="" disabled>—</option>
					{#each threads as a (a.external_thread_id)}
						<option value={a.external_thread_id}>{a.external_thread_id}</option>
					{/each}
				</select>
			</label>
		{/if}

		<label class="flex flex-col gap-1 text-sm">
			<span class="text-[color:var(--ce-l-text-secondary)]">{P128_CREATE_FIELD_TYPE_LABEL}</span>
			<div class="flex flex-wrap gap-3">
				<label class="flex items-center gap-1.5 cursor-pointer">
					<input type="radio" bind:group={proposalType} value="timeline" data-testid={tid('type-timeline')} />
					<span>{P128_CREATE_TYPE_TIMELINE}</span>
				</label>
				<label class="flex items-center gap-1.5 cursor-pointer">
					<input type="radio" bind:group={proposalType} value="note" data-testid={tid('type-note')} />
					<span>{P128_CREATE_TYPE_NOTE}</span>
				</label>
			</div>
		</label>

		{#if proposalType === 'timeline'}
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-[color:var(--ce-l-text-secondary)]">{P128_CREATE_FIELD_OCCURRED_AT_LABEL}</span>
				<input
					type="text"
					class="w-full {DS_TIMELINE_CLASSES.formControl}"
					bind:value={occurredAt}
					placeholder="2024-03-15T09:30:00Z"
					data-testid={tid('occurred-at')}
					autocomplete="off"
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-[color:var(--ce-l-text-secondary)]">{P128_CREATE_FIELD_ENTRY_TYPE_LABEL}</span>
				<select class="w-full {DS_TIMELINE_CLASSES.formControl}" bind:value={entryType} data-testid={tid('entry-type')}>
					{#each TIMELINE_ENTRY_TYPE_VALUES as v (v)}
						<option value={v}>{timelineEntryTypeOptionLabel(v)}</option>
					{/each}
				</select>
			</label>
		{/if}

		<label class="flex flex-col gap-1 text-sm">
			<span class="text-[color:var(--ce-l-text-secondary)]">{P128_CREATE_FIELD_TEXT_LABEL}</span>
			<textarea
				class="w-full min-h-[5rem] {DS_TIMELINE_CLASSES.formControl}"
				bind:value={bodyText}
				data-testid={tid('text')}
				autocomplete="off"
			></textarea>
		</label>

		{#if clientError}
			<p class="text-sm text-red-600 dark:text-red-400 m-0" role="alert" data-testid={tid('error')}>{clientError}</p>
		{/if}

		<div class="flex flex-wrap gap-2 justify-end">
			<button type="button" class="{DS_BTN_CLASSES.ghost} text-sm" on:click={onCancel} data-testid={tid('cancel')}>
				{P128_CREATE_CANCEL}
			</button>
			<button
				type="button"
				class="{DS_BTN_CLASSES.primary} text-sm disabled:opacity-50"
				disabled={busy}
				data-testid={tid('submit')}
				on:click={() => void submit()}
			>
				{busy ? P128_CREATE_SUBMITTING : P128_CREATE_SUBMIT}
			</button>
		</div>
	{/if}
</div>
