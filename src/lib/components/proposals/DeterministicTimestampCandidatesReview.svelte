<script lang="ts">
	/**
	 * P41-04 — Review-only surfacing of Case Engine deterministic timestamp candidates (schema v2).
	 * Informational only; does not apply or select occurred_at.
	 */
	import {
		deterministicCandidateOperatorNote,
		deterministicConfidenceCategoryBadgeClasses,
		deterministicConfidenceCategoryShortLabel,
		type ParsedDeterministicCandidate
	} from '$lib/caseTimeline/deterministicTimestampCandidates';

	export let items: ParsedDeterministicCandidate[] = [];
</script>

{#if items.length > 0}
	<div
		class="mt-2 rounded-md border border-violet-200/80 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 px-2 py-2 space-y-1.5"
		data-testid="deterministic-timestamp-candidates-section"
	>
		<p class="text-[9px] font-semibold uppercase tracking-wider text-violet-800 dark:text-violet-200">
			Deterministic time hints (from excerpt)
		</p>
		<p class="text-[9px] text-violet-900/85 dark:text-violet-200/90 leading-snug">
			These are <strong>rule-based readings</strong> of text in the proposal excerpt. They are
			<strong>not</strong> the official “Occurred at” value and <strong>not</strong> committed until you
			approve and commit the proposal with a valid timeline time.
		</p>
		<ul class="space-y-2 list-none m-0 p-0">
			{#each items as entry, i (i)}
				<li
					class="rounded border border-violet-100 dark:border-violet-900/40 bg-white/70 dark:bg-gray-900/50 px-2 py-1.5"
					data-testid="deterministic-timestamp-candidate-row"
				>
					{#if entry.kind === 'v2'}
						{@const c = entry.candidate}
						<div class="flex flex-wrap items-center gap-1.5 mb-1">
							<span
								class="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded {deterministicConfidenceCategoryBadgeClasses(
									c.confidence_category
								)}"
								data-testid="deterministic-candidate-category-badge"
								data-confidence-category={c.confidence_category}
							>
								{deterministicConfidenceCategoryShortLabel(c.confidence_category)}
							</span>
							<span class="text-[9px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-[12rem]" title={c.raw_text}>
								{c.raw_text || '—'}
							</span>
						</div>
						<p class="text-[9px] text-gray-600 dark:text-gray-400 leading-snug mb-1">
							{deterministicCandidateOperatorNote(c)}
						</p>
						{#if c.confidence_category === 'ambiguous' && c.alternate_date_only_values}
							<div
								class="flex flex-wrap gap-2 text-[10px]"
								data-testid="deterministic-candidate-ambiguous-alternates"
							>
								<span
									class="font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800"
									data-testid="deterministic-candidate-alternate-a"
								>
									US (M/D): {c.alternate_date_only_values[0]}
								</span>
								<span
									class="font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800"
									data-testid="deterministic-candidate-alternate-b"
								>
									EU (D/M): {c.alternate_date_only_values[1]}
								</span>
							</div>
							<p class="text-[9px] text-amber-900/90 dark:text-amber-200/90 mt-1">
								Neither date is selected automatically — choose when you set “Occurred at”.
							</p>
						{:else if c.normalized_value}
							<div class="text-[10px] font-mono text-gray-800 dark:text-gray-200" data-testid="deterministic-candidate-normalized">
								{c.normalized_value}
							</div>
						{:else}
							<div class="text-[9px] text-gray-500 dark:text-gray-400 italic" data-testid="deterministic-candidate-no-normalized">
								No single normalized value — see note above.
							</div>
						{/if}
						{#if c.evidence_excerpt && c.evidence_excerpt.trim()}
							<div class="mt-1 text-[9px] text-gray-500 dark:text-gray-500">
								<span class="font-semibold text-gray-600 dark:text-gray-400">Evidence:</span>
								<span class="font-mono whitespace-pre-wrap break-words">{c.evidence_excerpt}</span>
							</div>
						{/if}
					{:else}
						<div class="text-[9px] text-amber-900 dark:text-amber-200" data-testid="deterministic-candidate-legacy">
							<strong>Legacy candidate shape</strong> (unknown schema) — raw preview only.
							<pre class="mt-1 text-[8px] overflow-x-auto opacity-90">{JSON.stringify(entry.raw)}</pre>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
