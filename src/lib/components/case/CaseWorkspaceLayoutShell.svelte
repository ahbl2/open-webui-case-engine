<!--
	P132.5-01 — Three-zone case workspace frame: left / center (primary) / right.
	Presentation only; slots supply content. No API, stores, routing, or mutations.
	P132.5-05 — DS rail + primary canvas (`DS_WORKSPACE_SHELL_CLASSES`).
	Mobile: center column stacks first; desktop: three columns (center flex-grows).
-->
<script lang="ts">
	import { DS_WORKSPACE_SHELL_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
</script>

<div
	class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row lg:gap-0"
	data-testid="case-workspace-layout-shell"
	data-region="case-workspace-layout-shell"
>
	<aside
		class="{DS_WORKSPACE_SHELL_CLASSES.layoutRail} order-2 flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-b border-[color:var(--ce-l-chrome-border)] lg:order-1 lg:w-[min(17rem,100%)] lg:border-b-0 lg:border-r"
		data-testid="case-workspace-shell-left"
		data-region="case-workspace-shell-left"
	>
		<slot name="left" />
	</aside>

	<section
		class="{DS_WORKSPACE_SHELL_CLASSES.layoutCenter} order-1 flex min-h-[40vh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0 lg:min-w-0 lg:basis-0 lg:grow lg:order-2"
		data-testid="case-workspace-shell-center"
		data-region="case-workspace-shell-center"
		data-p1325-center-primary="true"
		aria-label="Primary work area"
	>
		<slot name="center" />
	</section>

	<aside
		class="{DS_WORKSPACE_SHELL_CLASSES.layoutRail} order-3 flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-t border-[color:var(--ce-l-chrome-border)] lg:w-[min(18rem,100%)] lg:border-l lg:border-t-0"
		data-testid="case-workspace-shell-right"
		data-region="case-workspace-shell-right"
	>
		<slot name="right" />
	</aside>
</div>
