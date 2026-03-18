<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		createIntake,
		proposeIntake,
		getIntake,
		decideIntake,
		listCaseIntakes,
		type Intake,
		type IntakeProposal
	} from '$lib/apis/caseEngine';
	import { caseContext, aiCaseContext } from '$lib/stores';
	import { getCaseContext, getCaseAiContext } from '$lib/apis/caseEngine';

	export let caseId: string;
	export let token: string;

	let rawNotes = '';
	let intake: Intake | null = null;
	let proposals: IntakeProposal[] = [];
	let submitting = false;
	let proposing = false;
	let deciding = false;
	let rejectReason = '';
	let expandedProposalId: string | null = null;

	// Load latest intake when caseId changes (MVP: focus on latest)
	$: if (caseId && token) {
		loadLatestIntake();
	}
	async function loadLatestIntake() {
		try {
			const intakes = await listCaseIntakes(caseId, token);
			const latest = intakes.find((i) => i.status === 'SUBMITTED' || i.status === 'PROPOSED');
			if (latest) {
				const data = await getIntake(latest.id, token);
				intake = data.intake;
				proposals = data.proposals ?? [];
			} else {
				intake = null;
				proposals = [];
			}
		} catch {
			intake = null;
			proposals = [];
		}
	}

	async function handleSubmit() {
		if (!rawNotes.trim()) {
			toast.error('Paste raw notes first');
			return;
		}
		submitting = true;
		try {
			const res = await createIntake(caseId, rawNotes.trim(), token);
			intake = res.intake;
			proposals = [];
			toast.success('Intake submitted');
		} catch (e: unknown) {
			toast.error((e as Error)?.message ?? 'Submit failed');
		} finally {
			submitting = false;
		}
	}

	async function handlePropose() {
		if (!intake) return;
		proposing = true;
		try {
			const res = await proposeIntake(intake.id, token);
			intake = res.intake;
			proposals = res.proposals ?? [];
			toast.success('Proposal generated');
		} catch (e: unknown) {
			toast.error((e as Error)?.message ?? 'Proposal failed');
			// Keep intake in SUBMITTED; proposals unchanged
		} finally {
			proposing = false;
		}
	}

	async function handleDecide(outcome: 'APPROVED' | 'REJECTED') {
		if (!intake) return;
		if (outcome === 'REJECTED' && !rejectReason.trim()) {
			toast.error('Reason required for reject');
			return;
		}
		deciding = true;
		try {
			await decideIntake(intake.id, outcome, token, rejectReason.trim() || undefined);
			if (outcome === 'APPROVED') {
				toast.success('Approved – timeline updated');
				intake = null;
				proposals = [];
				rawNotes = '';
				rejectReason = '';
				// Refresh case context so sidebar/chat show new entries
				const [ctx, aiCtx] = await Promise.all([
					getCaseContext(caseId, token),
					getCaseAiContext(caseId, token)
				]);
				caseContext.set(ctx);
				aiCaseContext.set(aiCtx);
			} else {
				toast.success('Rejected');
				// Reload intake to get updated status
				const data = await getIntake(intake.id, token);
				intake = data.intake;
				proposals = data.proposals ?? [];
			}
		} catch (e: unknown) {
			toast.error((e as Error)?.message ?? 'Decide failed');
		} finally {
			deciding = false;
		}
	}

	function toggleExpand(id: string) {
		expandedProposalId = expandedProposalId === id ? null : id;
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<h2 class="text-sm font-medium">AI Intake</h2>

	<div>
		<label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">Paste raw notes</label>
		<textarea
			bind:value={rawNotes}
			placeholder="Paste raw notes here..."
			class="w-full rounded border border-gray-200 dark:border-gray-700 bg-transparent p-2 text-sm min-h-[120px]"
			disabled={!!intake && intake.status !== 'SUBMITTED' && intake.status !== 'PROPOSED'}
		></textarea>
	</div>

	<div class="flex gap-2">
		<button
			type="button"
			class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
			on:click={handleSubmit}
			disabled={submitting || !rawNotes.trim()}
		>
			{submitting ? 'Submitting...' : 'Submit Intake'}
		</button>
		{#if intake}
			{#if intake.status === 'SUBMITTED'}
				<button
					type="button"
					class="rounded border border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50"
					on:click={handlePropose}
					disabled={proposing}
				>
					{proposing ? 'Generating...' : 'Generate Proposal (AI)'}
				</button>
			{/if}
		{/if}
	</div>

	{#if intake}
		<div class="text-xs text-gray-500">
			Intake {intake.id.slice(0, 8)}... | Status: {intake.status}
		</div>
	{/if}

	{#if proposals.length > 0}
		<div>
			<h3 class="text-sm font-medium mb-2">Proposals ({proposals.length})</h3>
			<div class="space-y-3 max-h-[28rem] overflow-y-auto">
				{#each proposals as p (p.id)}
					<div class="rounded border border-gray-200 dark:border-gray-700 p-3 space-y-2">
						<!-- Header: date + type + location -->
						<div class="flex items-center gap-2 flex-wrap">
							<span class="font-mono text-xs text-gray-500 dark:text-gray-400 shrink-0">
								{p.occurred_at ?? '—'}
							</span>
							<span class="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
								{p.type}
							</span>
							{#if p.location_text}
								<span class="text-xs text-gray-500 truncate">{p.location_text}</span>
							{/if}
						</div>
						<!-- Body text -->
						<div class="text-sm text-gray-800 dark:text-gray-200">
							{#if expandedProposalId === p.id}
								<div class="whitespace-pre-wrap break-words">{p.text_original}</div>
								<button
									type="button"
									class="mt-1 text-xs text-blue-600 dark:text-blue-400 underline"
									on:click={() => toggleExpand(p.id)}
								>
									Hide original
								</button>
							{:else}
								<div class="break-words">{(p.text_cleaned ?? p.text_original ?? '').slice(0, 120)}{((p.text_cleaned ?? p.text_original ?? '').length > 120) ? '…' : ''}</div>
								<button
									type="button"
									class="mt-1 text-xs text-blue-600 dark:text-blue-400 underline"
									on:click={() => toggleExpand(p.id)}
								>
									Show original
								</button>
							{/if}
						</div>
						<!-- Tags -->
						{#if p.tags}
							{@const tagList = Array.isArray(p.tags) ? p.tags : (typeof p.tags === 'string' ? (() => { try { const a = JSON.parse(p.tags); return Array.isArray(a) ? a : []; } catch { return []; } })() : [])}
							{#if tagList.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each tagList as tag}
										<span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{tag}</span>
									{/each}
								</div>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<button
				type="button"
				class="rounded bg-green-600 text-white px-3 py-1.5 text-sm hover:bg-green-700 disabled:opacity-50"
				on:click={() => handleDecide('APPROVED')}
				disabled={deciding}
			>
				{deciding ? '...' : 'Approve'}
			</button>
			<div class="flex gap-2 items-start">
				<textarea
					bind:value={rejectReason}
					placeholder="Reason (required for reject)"
					class="flex-1 rounded border border-gray-200 dark:border-gray-700 p-2 text-sm min-h-[60px]"
				></textarea>
				<button
					type="button"
					class="rounded border border-red-500 text-red-600 dark:text-red-400 px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
					on:click={() => handleDecide('REJECTED')}
					disabled={deciding || !rejectReason.trim()}
				>
					Reject
				</button>
			</div>
		</div>
	{/if}
</div>
