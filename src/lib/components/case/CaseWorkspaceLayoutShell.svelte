<!--
	P132.5-01 — Case workspace frame: center (primary) + optional right rail.
	Left “Case context & support” rail removed — primary nav is the tab bar under the header.
	Presentation only; slots supply content. No API, stores, routing, or mutations.
	P132.5-05 — DS rail + primary canvas (`DS_WORKSPACE_SHELL_CLASSES`).
	Mobile: center stacks first; desktop: center flex-grows beside optional right rail.
-->
<script lang="ts">
	import { DS_WORKSPACE_SHELL_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	/** When true, the right rail is not rendered (Overview dashboard carries its own secondary column). */
	export let hideRightRail = false;
</script>

<div
	class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row lg:gap-0"
	data-testid="case-workspace-layout-shell"
	data-region="case-workspace-layout-shell"
	data-hide-right-rail={hideRightRail ? 'true' : 'false'}
>
	<section
		class="{DS_WORKSPACE_SHELL_CLASSES.layoutCenter} order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:basis-0 lg:grow"
		data-testid="case-workspace-shell-center"
		data-region="case-workspace-shell-center"
		data-p1325-center-primary="true"
		aria-label="Primary work area"
	>
		<slot name="center" />
	</section>

	{#if !hideRightRail}
		<aside
			class="{DS_WORKSPACE_SHELL_CLASSES.layoutRail} order-3 flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-t border-[color:var(--ce-l-chrome-border)] lg:w-[min(18rem,100%)] lg:border-l lg:border-t-0"
			data-testid="case-workspace-shell-right"
			data-region="case-workspace-shell-right"
		>
			<slot name="right" />
		</aside>
	{/if}
</div>
