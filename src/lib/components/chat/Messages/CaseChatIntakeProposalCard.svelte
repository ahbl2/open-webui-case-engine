<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		approveProposal,
		commitProposal,
		rejectProposal,
		reviseChatIntakeProposal,
		type ProposalRecord
	} from '$lib/apis/caseEngine';
	import { caseEngineToken } from '$lib/stores';
	import { isIsoOccurredAtWithTimezone } from '$lib/utils/chatIntakeIntent';

	export let caseId: string;
	export let proposal: ProposalRecord;
	/** Mutate parent message + persist chat */
	export let onProposalUpdated: (p: ProposalRecord) => void;

	let busy: 'approve' | 'discard' | 'revise' | null = null;
	let showRevise = false;
	let feedback = '';

	function stripInternalFields(obj: Record<string, unknown>): Record<string, unknown> {
		const copy = { ...obj };
		delete copy._ce_chat_intake;
		return copy;
	}

	function parseDisplay(pr: ProposalRecord): {
		original: string;
		cleaned: string;
		occurredAt: string | null;
		entryType: string;
	} {
		try {
			const raw = JSON.parse(pr.proposed_payload) as Record<string, unknown>;
			const p = stripInternalFields(raw) as Record<string, unknown>;
			if (pr.proposal_type === 'note') {
				return {
					original: String(p.text_original ?? p.content ?? ''),
					cleaned: String(p.content ?? ''),
					occurredAt: null,
					entryType: 'note'
				};
			}
			return {
				original: String(p.text_original ?? ''),
				cleaned: String(p.text_cleaned ?? p.text_original ?? ''),
				occurredAt:
					p.occurred_at != null && String(p.occurred_at).trim()
						? String(p.occurred_at).trim()
						: null,
				entryType: String(p.type ?? '')
			};
		} catch {
			return { original: '', cleaned: '', occurredAt: null, entryType: '' };
		}
	}

	$: display = parseDisplay(proposal);
	$: timelineNeedsDate =
		proposal.proposal_type === 'timeline' &&
		proposal.status === 'pending' &&
		!isIsoOccurredAtWithTimezone(display.occurredAt);
	$: canAct = proposal.status === 'pending' && $caseEngineToken && !busy;

	async function onApprove() {
		if (!$caseEngineToken || timelineNeedsDate) return;
		busy = 'approve';
		try {
			let p = await approveProposal(caseId, proposal.id, $caseEngineToken);
			p = await commitProposal(caseId, proposal.id, $caseEngineToken);
			onProposalUpdated(p);
			toast.success('Committed to the case record.');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Approve/commit failed');
		} finally {
			busy = null;
		}
	}

	async function onDiscard() {
		if (!$caseEngineToken) return;
		busy = 'discard';
		try {
			const p = await rejectProposal(
				caseId,
				proposal.id,
				'Discarded by user from case chat',
				$caseEngineToken
			);
			onProposalUpdated(p);
			toast.message('Proposal discarded');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Discard failed');
		} finally {
			busy = null;
		}
	}

	async function onSubmitRevision() {
		const t = feedback.trim();
		if (!$caseEngineToken || !t) return;
		busy = 'revise';
		try {
			const p = await reviseChatIntakeProposal(caseId, proposal.id, $caseEngineToken, t);
			onProposalUpdated(p);
			feedback = '';
			showRevise = false;
			toast.message('Proposal updated — review again.');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Revision failed');
		} finally {
			busy = null;
		}
	}
</script>

<div
	class="mt-3 rounded-lg border-2 border-amber-500/70 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-400/60 px-4 py-3 text-sm shadow-sm space-y-2"
	role="region"
	aria-label="Case intake proposal"
>
	<div class="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
		Intake proposal — review before it becomes an official record
	</div>

	{#if proposal.status === 'committed'}
		<p class="text-emerald-800 dark:text-emerald-300 font-medium">Committed to the case.</p>
	{:else if proposal.status === 'rejected'}
		<p class="text-gray-600 dark:text-gray-400">Discarded — no case record was created.</p>
	{:else if proposal.status === 'approved'}
		<p class="text-amber-800 dark:text-amber-200">Approved — finishing commit… reopen chat if this stalls.</p>
	{/if}

	<div class="grid gap-2 sm:grid-cols-2">
		<div>
			<div class="text-[0.7rem] font-medium text-gray-600 dark:text-gray-400">Original</div>
			<div class="whitespace-pre-wrap rounded bg-white/70 dark:bg-black/20 p-2 text-gray-900 dark:text-gray-100">
				{display.original || '—'}
			</div>
		</div>
		<div>
			<div class="text-[0.7rem] font-medium text-gray-600 dark:text-gray-400">Cleaned (for record)</div>
			<div class="whitespace-pre-wrap rounded bg-white/70 dark:bg-black/20 p-2 text-gray-900 dark:text-gray-100">
				{display.cleaned || '—'}
			</div>
		</div>
	</div>

	<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
		<span><span class="font-medium">Type:</span> {display.entryType || '—'}</span>
		{#if display.occurredAt != null}
			<span><span class="font-medium">Occurred at:</span> {display.occurredAt}</span>
		{:else if proposal.proposal_type === 'timeline'}
			<span class="text-amber-800 dark:text-amber-200"
				><span class="font-medium">Occurred at:</span> not set — request a revision with a date/time</span
			>
		{/if}
	</div>

	{#if proposal.status === 'pending'}
		{#if timelineNeedsDate}
			<p class="text-xs text-amber-900 dark:text-amber-100">
				Add a timezone-qualified date/time (e.g. via <strong>Request revision</strong>) before you can approve.
			</p>
		{/if}

		<div class="flex flex-wrap gap-2 pt-1">
			<button
				type="button"
				class="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
				disabled={!canAct || timelineNeedsDate}
				on:click={onApprove}
			>
				{busy === 'approve' ? 'Working…' : 'Approve'}
			</button>
			<button
				type="button"
				class="rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
				disabled={!canAct || busy === 'revise'}
				on:click={() => (showRevise = !showRevise)}
			>
				Request revision
			</button>
			<button
				type="button"
				class="rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
				disabled={!canAct}
				on:click={onDiscard}
			>
				{busy === 'discard' ? 'Working…' : 'Discard'}
			</button>
		</div>

		{#if showRevise}
			<div class="pt-2 space-y-2">
				<label class="block text-xs font-medium text-gray-700 dark:text-gray-300" for="intake-revision-{proposal.id}"
					>What should change?</label
				>
				<textarea
					id="intake-revision-{proposal.id}"
					bind:value={feedback}
					rows="3"
					class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm p-2"
					placeholder="e.g. use Preston Hwy; keep full name; shorter wording…"
				/>
				<button
					type="button"
					class="rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
					disabled={!canAct || !feedback.trim()}
					on:click={onSubmitRevision}
				>
					{busy === 'revise' ? 'Updating…' : 'Apply revision'}
				</button>
			</div>
		{/if}
	{/if}
</div>
