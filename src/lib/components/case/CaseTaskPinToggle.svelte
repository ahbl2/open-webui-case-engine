<!--
  P93-04: Pin / unpin — explicit operator control; server-backed only; not ordering or workflow.
  P94-04: Minimum hit area for row affordance (no behavior change).
-->
<script lang="ts">
	import { DS_BTN_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let pinned: boolean;
	export let disabled: boolean;
	export let taskId: string;
	export let onToggle: () => void;
</script>

<button
	type="button"
	class="{DS_BTN_CLASSES.ghost} min-h-9 min-w-9 inline-flex items-center justify-center p-1 rounded shrink-0"
	aria-pressed={pinned}
	aria-label={pinned ? 'Unpin task' : 'Pin task'}
	data-testid="case-tasks-row-pin"
	data-task-id={taskId}
	data-pinned={pinned ? 'true' : 'false'}
	title={pinned ? 'Unpin task' : 'Pin task'}
	{disabled}
	on:click={onToggle}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="size-3.5 {pinned
			? 'text-slate-600 dark:text-slate-300'
			: 'text-slate-400 dark:text-slate-500 opacity-90'}"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M12 17v5" />
		<path
			d="M9 10.76a2 2 0 0 0-1.11 1.79l-1.12 1.12a.5.5 0 0 1-.7 0l-2.83-2.83a.5.5 0 0 1 0-.7l1.12-1.12a2 2 0 0 0 1.79-1.11L12 2l7 7-2 2.5"
		/>
	</svg>
</button>
