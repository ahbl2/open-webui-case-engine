<script lang="ts">
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import { getContext } from 'svelte';

	const i18n = getContext('i18n');

	export let followUps: string[] = [];
	export let topSuggestionLabel: string | undefined = undefined;
	export let onClick: (followUp: string) => void = () => {};

	// Per-label style tokens. Using explicit string literals so Tailwind JIT
	// can statically detect and include all classes at build time.
	type LabelStyle = { chipClass: string; accentClass: string };
	function getLabelStyle(label: string | undefined): LabelStyle {
		switch (label) {
			case 'Clarify event':
				return {
					chipClass:   'border-l-2 border-slate-300/70 dark:border-slate-500/50 bg-slate-50/50 dark:bg-slate-800/10 pl-2',
					accentClass: 'text-slate-500/80 dark:text-slate-400/70',
				};
			case 'Continue timeline':
				return {
					chipClass:   'border-l-2 border-blue-300/70 dark:border-blue-500/40 bg-blue-50/40 dark:bg-blue-900/10 pl-2',
					accentClass: 'text-blue-500/75 dark:text-blue-400/65',
				};
			case 'Follow evidence':
				return {
					chipClass:   'border-l-2 border-amber-300/70 dark:border-amber-500/35 bg-amber-50/50 dark:bg-amber-900/10 pl-2',
					accentClass: 'text-amber-600/70 dark:text-amber-400/60',
				};
			default: // 'Best next step', 'Most relevant', unknown
				return {
					chipClass:   'border-l-2 border-blue-200/60 dark:border-blue-600/30 bg-blue-50/30 dark:bg-blue-950/5 pl-2',
					accentClass: 'text-blue-500/75 dark:text-blue-400/65',
				};
		}
	}
</script>

<div class="mt-4">
	<div class="text-sm font-medium">
		{$i18n.t('Follow up')}
	</div>

	<div class="flex flex-col text-left gap-1 mt-1.5">
		{#each followUps as followUp, idx (idx)}
			{@const style = idx === 0 && topSuggestionLabel ? getLabelStyle(topSuggestionLabel) : null}
			<Tooltip content={followUp} placement="top-start" className="line-clamp-1">
				<button
					class="py-1.5 text-left text-sm transition cursor-pointer w-full
						{idx === 0
							? `text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white ${style ? style.chipClass : ''}`
							: 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}"
					on:click={() => onClick(followUp)}
					aria-label={idx === 0 && topSuggestionLabel
						? $i18n.t('{{label}}: {{question}}', { label: topSuggestionLabel, question: followUp })
						: $i18n.t('Follow up: {{question}}', { question: followUp })}
					title={idx === 0 && topSuggestionLabel ? $i18n.t(topSuggestionLabel) : undefined}
				>
					{#if idx === 0 && topSuggestionLabel}
						<div class="text-xs font-medium mb-0.5 {style?.accentClass ?? 'text-blue-500/75 dark:text-blue-400/65'}">
							{$i18n.t(topSuggestionLabel)}
						</div>
					{/if}
					<div class="flex items-center gap-1.5">
						{#if idx === 0}
							<span class="shrink-0 leading-none {style?.accentClass ?? 'text-blue-500 dark:text-blue-400'}" aria-hidden="true">›</span>
						{/if}
						<div class="line-clamp-1">
							{followUp}
						</div>
					</div>
				</button>
			</Tooltip>

			{#if idx < followUps.length - 1}
				<hr class="border-gray-50 dark:border-gray-850/30" />
			{/if}
		{/each}
	</div>
</div>
