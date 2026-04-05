<script lang="ts">
	import {
		REJECTED_AI_DEBUG_SUMMARY,
		REJECTED_AI_DEBUG_HELPER,
		REJECTED_AI_DEBUG_NARRATIVE_HEADING,
		REJECTED_AI_DEBUG_TRIGGERS_BRIDGE,
		REJECTED_AI_DEBUG_TRIGGERS_HEADING,
		REJECTED_AI_DEBUG_FAILURE_CODES_HEADING,
		REJECTED_AI_DEBUG_FAILURE_TYPE_LINE,
		REJECTED_AI_DEBUG_FAILURE_RESULT_LINE,
		REJECTED_AI_DEBUG_AI_FAILURE_BRIDGE,
		NARRATIVE_PREVIEW_AI_FAILURE_RECOMMENDED_ACTION,
		isNarrativePreviewAiFailureNoOutputDebug,
		rejectedAiReasonTypeLabel,
		formatRejectedAiFailureModelLine,
		formatRejectedAiFailureTimeoutLine,
		type NarrativePreviewRejectedAiDebug
	} from '$lib/caseNotes/narrativePreviewReviewUi';

	export let testIdPrefix: string;
	export let debug: NarrativePreviewRejectedAiDebug;

	$: aiFailureNoOutput = isNarrativePreviewAiFailureNoOutputDebug(debug);
	$: detailsClass = aiFailureNoOutput
		? 'rounded border border-red-300 bg-red-50 dark:border-red-800/80 dark:bg-red-950/30 mt-2 overflow-hidden'
		: 'rounded border border-amber-300/70 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/25 mt-2 overflow-hidden';
	$: summaryClass = aiFailureNoOutput
		? 'cursor-pointer select-none px-2.5 py-2 text-[10px] font-semibold text-red-800 dark:text-red-100 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden'
		: 'cursor-pointer select-none px-2.5 py-2 text-[10px] font-semibold text-amber-950 dark:text-amber-100 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden';
	$: chevronClass = aiFailureNoOutput
		? 'text-red-600 dark:text-red-400'
		: 'text-amber-600 dark:text-amber-400';
	$: bodyBorderClass = aiFailureNoOutput
		? 'border-t border-red-200/90 dark:border-red-900/50'
		: 'border-t border-amber-200/80 dark:border-amber-800/50';
	$: bodyTextClass = aiFailureNoOutput
		? 'text-[10px] text-red-800/95 dark:text-red-100/90 leading-snug'
		: 'text-[10px] text-amber-900/85 dark:text-amber-200/90 leading-snug';
	$: strongClass = aiFailureNoOutput
		? 'text-[10px] font-semibold text-red-900 dark:text-red-50'
		: 'text-[10px] font-semibold text-amber-950 dark:text-amber-100';
	$: bridgeClass = aiFailureNoOutput
		? 'text-[10px] text-red-800/90 dark:text-red-200/85 leading-snug italic'
		: 'text-[10px] text-amber-900/90 dark:text-amber-200/85 leading-snug italic';
	$: reasonsHeadingClass = strongClass;
	$: reasonItemClass = aiFailureNoOutput
		? 'rounded border border-red-200/80 dark:border-red-900/60 bg-white/90 dark:bg-gray-950/40 px-2 py-1 text-red-900 dark:text-red-50'
		: 'rounded border border-amber-200/70 dark:border-amber-800/50 bg-white/70 dark:bg-gray-950/40 px-2 py-1';
	$: reasonCodeClass = aiFailureNoOutput
		? 'font-mono text-[9px] text-red-700 dark:text-red-300 block mb-0.5'
		: 'font-mono text-[9px] text-amber-800 dark:text-amber-300 block mb-0.5';
</script>

<details
	class={detailsClass}
	data-testid="{testIdPrefix}-rejected-ai-debug"
>
	<summary
		class={summaryClass}
		data-testid="{testIdPrefix}-rejected-ai-debug-summary"
		title={REJECTED_AI_DEBUG_SUMMARY}
	>
		<span class={chevronClass}>▸</span>
		{REJECTED_AI_DEBUG_SUMMARY}
	</summary>
	<div
		class="px-2.5 pb-3 pt-1 space-y-2 {bodyBorderClass}"
		data-testid="{testIdPrefix}-rejected-ai-debug-body"
	>
		<p class={bodyTextClass}>
			{REJECTED_AI_DEBUG_HELPER}
		</p>
		<p class={strongClass} data-testid="{testIdPrefix}-rejected-ai-debug-reason-type">
			{rejectedAiReasonTypeLabel(debug.rejectedAiReasonType)}
		</p>
		{#if aiFailureNoOutput}
			<p class="{bodyTextClass} font-medium" data-testid="{testIdPrefix}-rejected-ai-failure-recommended-action">
				{NARRATIVE_PREVIEW_AI_FAILURE_RECOMMENDED_ACTION}
			</p>
		{/if}
		{#if !aiFailureNoOutput || debug.rejectedAiNarrative.trim().length > 0}
			<p class={strongClass}>
				{REJECTED_AI_DEBUG_NARRATIVE_HEADING}
			</p>
			<textarea
				readonly
				tabindex="-1"
				class="w-full min-h-[6rem] max-h-[14rem] rounded border px-2 py-1.5 text-[10px] overflow-y-auto resize-y font-sans whitespace-pre-wrap {aiFailureNoOutput
					? 'border-red-200/90 dark:border-red-900/70 bg-white/95 dark:bg-gray-950/50 text-red-950 dark:text-red-50'
					: 'border-amber-200/90 dark:border-amber-800/70 bg-white/90 dark:bg-gray-950/50 text-gray-900 dark:text-gray-100'}"
				data-testid="{testIdPrefix}-rejected-ai-debug-narrative"
			>{debug.rejectedAiNarrative}</textarea>
		{/if}
		<p class={bridgeClass}>
			{aiFailureNoOutput ? REJECTED_AI_DEBUG_AI_FAILURE_BRIDGE : REJECTED_AI_DEBUG_TRIGGERS_BRIDGE}
		</p>
		{#if debug.rejectedAiReasons.length > 0}
			<p class={reasonsHeadingClass}>
				{aiFailureNoOutput ? REJECTED_AI_DEBUG_FAILURE_CODES_HEADING : REJECTED_AI_DEBUG_TRIGGERS_HEADING}
			</p>
			<ul
				class="list-none pl-0 text-[10px] space-y-1.5 {aiFailureNoOutput
					? 'text-red-900 dark:text-red-50'
					: 'text-amber-950 dark:text-amber-100'}"
				data-testid="{testIdPrefix}-rejected-ai-debug-reasons"
			>
				{#each debug.rejectedAiReasons as reason}
					{#if reason.code === 'ai_failure'}
						<li
							class="{reasonItemClass} space-y-1"
							data-testid="{testIdPrefix}-rejected-ai-debug-reason-item"
						>
							<p class="text-[10px] leading-snug">{REJECTED_AI_DEBUG_FAILURE_TYPE_LINE}</p>
							{#if formatRejectedAiFailureModelLine(debug.model)}
								<p class="text-[10px] leading-snug">{formatRejectedAiFailureModelLine(debug.model)}</p>
							{/if}
							{#if formatRejectedAiFailureTimeoutLine(debug.timeoutMs)}
								<p class="text-[10px] leading-snug">{formatRejectedAiFailureTimeoutLine(debug.timeoutMs)}</p>
							{/if}
							<p class="text-[10px] leading-snug">{REJECTED_AI_DEBUG_FAILURE_RESULT_LINE}</p>
						</li>
					{:else}
						<li
							class={reasonItemClass}
							data-testid="{testIdPrefix}-rejected-ai-debug-reason-item"
						>
							<span class={reasonCodeClass} data-testid="{testIdPrefix}-rejected-ai-debug-reason-code"
								>{reason.code}</span
							>
							<span data-testid="{testIdPrefix}-rejected-ai-debug-reason-label">{reason.label}</span>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</div>
</details>
