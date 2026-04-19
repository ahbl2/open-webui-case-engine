<script lang="ts">
	/**
	 * Tier L flex column shell for tab content areas that participate in nested scroll
	 * (P70-06 min-h-0 discipline). Phase 71 Wave 0 primitive — use in P71-05+ as needed.
	 * P71-FU3: no `h-full` on this flex item (percentage height fights flex-basis).
	 * P71-FU6: Tailwind `flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden` + unlayered `.ce-l-content-region`
	 * so computed display is flex-column; route primary scrollports get bounded height.
	 * When true, omit bounded flex scroll — parent `case-workspace-main` scrolls (`/case/:id/summary` OCC).
	 * Delegate mode pairs with `.ce-l-content-region--delegate-page-scroll` in `caseWorkspaceTierL.css`.
	 */
	export let testId = '';
	export let delegatePageScroll = false;
</script>

<div
	class={delegatePageScroll
		? 'ce-l-content-region ce-l-content-region--delegate-page-scroll flex w-full min-w-0 flex-col'
		: 'ce-l-content-region flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden'}
	data-testid={testId || undefined}
>
	<slot />
</div>
