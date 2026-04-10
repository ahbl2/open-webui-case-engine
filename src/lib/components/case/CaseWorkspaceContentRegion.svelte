<script lang="ts">
	/**
	 * Tier L flex column shell for tab content areas that participate in nested scroll
	 * (P70-06 min-h-0 discipline). Phase 71 Wave 0 primitive — use in P71-05+ as needed.
	 * P71-FU3: no `h-full` on this flex item (percentage height fights flex-basis).
	 * P71-FU6: Tailwind `flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden` + unlayered `.ce-l-content-region`
	 * so computed display is flex-column; route primary scrollports get bounded height.
	 */
	export let testId = '';
</script>

<div
	class="ce-l-content-region flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden"
	data-testid={testId || undefined}
>
	<slot />
</div>
