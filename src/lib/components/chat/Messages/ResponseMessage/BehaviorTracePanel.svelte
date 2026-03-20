<script lang="ts">
	import type { BehaviorTrace } from '$lib/types/behaviorTrace';

	export let trace: BehaviorTrace;
</script>

<!--
	DEV-ONLY debug panel. Never imported or rendered in production builds.
	BehaviorTrace is ephemeral / in-memory only — never persisted, never sent to backend.
-->
<div
	class="mt-2 rounded border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2.5 text-[11px] leading-relaxed font-mono text-gray-600 dark:text-gray-400"
>
	<div class="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-2 font-sans font-semibold select-none">
		BehaviorTrace
	</div>

	<!-- Guard Decision — most actionable field; shown first -->
	<div class="flex gap-2 mb-0.5">
		<span class="text-gray-400 dark:text-gray-600 shrink-0">guard</span>
		<span class="font-semibold text-gray-700 dark:text-gray-300">{trace.guardDecision}</span>
	</div>

	<!-- Guard Explanation breakdown (present on clarification + success paths) -->
	{#if trace.guardExplanation}
		<div class="ml-3 mb-1.5 mt-0.5">
			<!-- Compact boolean signals in one flex row -->
			<div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400 dark:text-gray-600 mb-1">
				<span>
					first-turn
					<span class={trace.guardExplanation.isFirstTurn ? 'text-gray-600 dark:text-gray-400' : ''}>
						{trace.guardExplanation.isFirstTurn ? 'yes' : 'no'}
					</span>
				</span>
				<span>
					state
					<span class={trace.guardExplanation.statePresent ? 'text-gray-600 dark:text-gray-400' : ''}>
						{trace.guardExplanation.statePresent ? 'yes' : 'no'}
					</span>
				</span>
				{#if trace.guardExplanation.firstTurnFallbackAttempted}
					<span>
						fallback
						<span class={trace.guardExplanation.firstTurnFallbackMatched ? 'text-gray-600 dark:text-gray-400' : 'text-red-400 dark:text-red-500'}>
							{trace.guardExplanation.firstTurnFallbackMatched ? 'matched' : 'no-match'}
						</span>
					</span>
				{/if}
				<span>
					anchor-check
					<span>{trace.guardExplanation.anchorConfidenceChecked ? 'yes' : 'no'}</span>
				</span>
			</div>
			<!-- Stable codes -->
			{#if trace.guardExplanation.codes.length > 0}
				<div class="flex flex-wrap gap-1 mb-1">
					{#each trace.guardExplanation.codes as code}
						<span class="px-1 rounded bg-gray-100 dark:bg-gray-800 text-[9px] font-mono text-gray-500 dark:text-gray-500 select-all">{code}</span>
					{/each}
				</div>
			{/if}
			<!-- Reason narrative -->
			{#each trace.guardExplanation.reasons as reason}
				<div class="text-[10px] text-gray-500 dark:text-gray-500 leading-snug">› {reason}</div>
			{/each}
		</div>
	{/if}

	<!-- Context Resolution breakdown -->
	{#if trace.contextResolution}
		{@const cr = trace.contextResolution}
		<div class="mt-1.5 mb-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-800">
			<div class="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-1 font-sans font-semibold select-none">resolution</div>

			<!-- Strategy — most diagnostic signal -->
			<div class="flex gap-2 mb-0.5">
				<span class="text-gray-400 dark:text-gray-600 shrink-0">strategy</span>
				<span class="font-semibold text-gray-700 dark:text-gray-300">{cr.resolutionStrategy}</span>
			</div>

			<!-- Compact signal row -->
			<div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400 dark:text-gray-600 mb-1 ml-0">
				<span>
					ctx-dep <span class={cr.contextDependent ? 'text-gray-600 dark:text-gray-400' : ''}>{cr.contextDependent ? 'yes' : 'no'}</span>
				</span>
				<span>
					prior-turns <span class="text-gray-600 dark:text-gray-400">{cr.priorTurnsCount}</span>
				</span>
				<span>
					state <span class={cr.usedPriorState ? 'text-gray-600 dark:text-gray-400' : ''}>{cr.usedPriorState ? 'yes' : 'no'}</span>
				</span>
				<span>
					anchor <span>{cr.anchorDetected ? 'yes' : 'no'}</span>
				</span>
			</div>

			<!-- Input / resolved (only show resolved when it differs) -->
			<div class="flex gap-2 mb-0.5">
				<span class="text-gray-400 dark:text-gray-600 shrink-0">input</span>
				<span class="italic break-all">"{cr.originalQuery}"</span>
			</div>
			{#if cr.resolvedQuery !== cr.originalQuery}
				<div class="flex gap-2 mb-0.5">
					<span class="text-gray-400 dark:text-gray-600 shrink-0">resolved</span>
					<span class="italic text-gray-700 dark:text-gray-300 break-all">"{cr.resolvedQuery}"</span>
				</div>
			{/if}

			<!-- State signals — only when prior state was used -->
			{#if cr.stateSignals}
				{@const s = cr.stateSignals}
				<div class="mt-1 ml-0">
					<div class="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-0.5 font-sans select-none">state signals</div>
					{#if s.entity}
						<div class="flex gap-2 text-[10px]">
							<span class="text-gray-400 dark:text-gray-600 shrink-0">entity</span>
							<span class="text-gray-700 dark:text-gray-300">{s.entity}</span>
						</div>
					{/if}
					{#if s.location}
						<div class="flex gap-2 text-[10px]">
							<span class="text-gray-400 dark:text-gray-600 shrink-0">location</span>
							<span class="text-gray-700 dark:text-gray-300">{s.location}</span>
						</div>
					{/if}
					{#if s.actionBody}
						<div class="flex gap-2 text-[10px]">
							<span class="text-gray-400 dark:text-gray-600 shrink-0">action</span>
							<span class="text-gray-700 dark:text-gray-300">{s.actionBody}</span>
						</div>
					{/if}
					{#if s.dateHint}
						<div class="flex gap-2 text-[10px]">
							<span class="text-gray-400 dark:text-gray-600 shrink-0">date</span>
							<span class="text-gray-700 dark:text-gray-300">{s.dateHint}</span>
						</div>
					{/if}
					<div class="flex gap-2 text-[10px]">
						<span class="text-gray-400 dark:text-gray-600 shrink-0">q-type</span>
						<span>{s.lastQuestionType}</span>
					</div>
					<div class="flex gap-2 text-[10px] mt-0.5">
						<span class="text-gray-400 dark:text-gray-600 shrink-0">state-conf</span>
						<span class={s.stateConfidence === 'high' ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}>{s.stateConfidence}</span>
					</div>
					<div class="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 break-all">
						topic: "<span class="text-gray-500 dark:text-gray-500">{s.topic}</span>"
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Context Dependent (top-level shorthand — shown when contextResolution absent) -->
	{#if !trace.contextResolution}
	<div class="flex gap-2 mb-1">
		<span class="text-gray-400 dark:text-gray-600 shrink-0">context-dep</span>
		<span>{trace.contextDependent}</span>
	</div>

	<!-- Input query -->
	<div class="flex gap-2 mb-1">
		<span class="text-gray-400 dark:text-gray-600 shrink-0">input</span>
		<span class="italic break-all">"{trace.inputQuery}"</span>
	</div>

	<!-- Resolved query — only show when it differs from input -->
	{#if trace.resolvedQuery !== trace.inputQuery}
		<div class="flex gap-2 mb-1">
			<span class="text-gray-400 dark:text-gray-600 shrink-0">resolved</span>
			<span class="italic text-gray-700 dark:text-gray-300 break-all">"{trace.resolvedQuery}"</span>
		</div>
	{/if}
	{/if}

	<!-- Anchor Confidence — present only when Guard 2 ran -->
	{#if trace.anchorConfidence}
		<div class="flex gap-2 mb-1">
			<span class="text-gray-400 dark:text-gray-600 shrink-0">anchor</span>
			<span>
				{trace.anchorConfidence.level}
				{#if trace.anchorConfidence.factors.length > 0}
					<span class="text-gray-400 dark:text-gray-600 ml-1">
						({trace.anchorConfidence.factors.join(', ')})
					</span>
				{/if}
			</span>
		</div>
	{/if}

	<!-- Query Context — present on proceed path only -->
	{#if trace.queryContext}
		<div class="flex gap-2 mb-1">
			<span class="text-gray-400 dark:text-gray-600 shrink-0">context</span>
			<span>{trace.queryContext}</span>
		</div>
	{/if}

	<!-- Suggestions — present on proceed path only -->
	{#if trace.suggestions && trace.suggestions.length > 0}
		<div class="mt-2 pt-1.5 border-t border-gray-200 dark:border-gray-800">
			<div class="text-gray-400 dark:text-gray-600 mb-1.5">
				suggestions ({trace.suggestions.length})
			</div>
			{#each trace.suggestions as s}
				<div class="ml-2 mb-2">
					<!-- Row 1: position, top-chip marker, text -->
					<div class="flex items-baseline gap-1.5 flex-wrap">
						<span class="text-gray-400 dark:text-gray-600 shrink-0">{s.finalPosition + 1}.</span>
						{#if s.isTopChip}
							<span class="text-[9px] font-sans font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400 shrink-0">top</span>
						{/if}
						<span class="italic break-all">"{s.text}"</span>
					</div>
					<!-- Row 2: score + bucket metadata -->
					<div class="ml-4 mt-0.5 flex gap-3 text-[10px] text-gray-400 dark:text-gray-600">
						{#if s.score !== undefined}
							<span>score <span class="text-gray-600 dark:text-gray-400 font-semibold">{s.score}</span></span>
						{/if}
						{#if s.bucket}
							<span>bucket <span class="text-gray-600 dark:text-gray-400">{s.bucket}</span></span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
