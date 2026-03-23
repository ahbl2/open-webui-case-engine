<script lang="ts">
	import type { TimelineEntry } from '$lib/apis/caseEngine';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';

	export let entry: TimelineEntry;

	const TYPE_LABELS: Record<string, string> = {
		note:         'Note',
		surveillance: 'Surveillance',
		interview:    'Interview',
		evidence:     'Evidence'
	};

	const TYPE_COLORS: Record<string, string> = {
		note:         'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
		surveillance: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
		interview:    'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
		evidence:     'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
	};

	function typeLabel(type: string): string {
		return TYPE_LABELS[type] ?? type;
	}

	function typeColor(type: string): string {
		return TYPE_COLORS[type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
	}

	function entryText(e: TimelineEntry): string {
		return (e.text_cleaned ?? e.text_original ?? '').trim();
	}

	function parseTags(raw: string | string[] | null | undefined): string[] {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw;
		try { return JSON.parse(raw); } catch { return []; }
	}

	$: tags = parseTags(entry.tags);
</script>

<li
	class="flex flex-col gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700
	       bg-white dark:bg-gray-900 px-4 py-3 shadow-sm"
	data-testid="timeline-entry"
	data-entry-id={entry.id}
>
	<!-- Entry meta row -->
	<div class="flex items-center gap-2 flex-wrap">
		<!-- Type badge -->
		<span class="text-xs font-medium px-1.5 py-0.5 rounded {typeColor(entry.type)}">
			{typeLabel(entry.type)}
		</span>

		<!-- occurred_at — primary timestamp (when it happened) -->
		<time
			datetime={entry.occurred_at}
			class="text-xs font-mono text-gray-500 dark:text-gray-400"
			title="When this occurred"
		>
			{formatCaseDateTime(entry.occurred_at)}
		</time>

		{#if entry.location_text}
			<span
				class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[16rem]"
				title={entry.location_text}
			>
				📍 {entry.location_text}
			</span>
		{/if}
	</div>

	<!-- Entry body -->
	<p class="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
		{entryText(entry)}
	</p>

	<!-- Tags -->
	{#if tags.length > 0}
		<div class="flex flex-wrap gap-1 mt-0.5">
			{#each tags as tag}
				<span
					class="text-xs px-1 py-0.5 rounded
					       bg-gray-100 dark:bg-gray-800
					       text-gray-500 dark:text-gray-400 font-mono"
				>
					{tag}
				</span>
			{/each}
		</div>
	{/if}

	<!-- Recorded-by / created_at footer -->
	<div class="flex items-center gap-2 pt-0.5 border-t border-gray-100 dark:border-gray-800 mt-0.5">
		<span class="text-xs text-gray-400 dark:text-gray-500">
			Recorded
			<time datetime={entry.created_at} class="font-mono">
				{formatCaseDateTime(entry.created_at)}
			</time>
			by <span class="font-medium text-gray-600 dark:text-gray-300">{entry.created_by}</span>
		</span>
	</div>
</li>
