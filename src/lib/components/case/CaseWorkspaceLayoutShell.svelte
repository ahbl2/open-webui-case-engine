<!--
	P132.5-01 — Three-zone case workspace frame: left / center (primary) / right.
	Presentational only; slots supply content. No API, stores, routing, or mutations.
	Mobile: center column stacks first; desktop: three columns (center flex-grows).
-->
<div
	class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row lg:gap-0"
	data-testid="case-workspace-layout-shell"
	data-region="case-workspace-layout-shell"
>
	<aside
		class="order-2 flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-b border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] lg:order-1 lg:w-[min(17rem,100%)] lg:border-b-0 lg:border-r"
		data-testid="case-workspace-shell-left"
		data-region="case-workspace-shell-left"
	>
		<slot name="left" />
	</aside>

	<section
		class="order-1 flex min-h-[40vh] min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0 lg:order-2"
		data-testid="case-workspace-shell-center"
		data-region="case-workspace-shell-center"
		aria-label="Primary work area"
	>
		<slot name="center" />
	</section>

	<aside
		class="order-3 flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-t border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] lg:w-[min(18rem,100%)] lg:border-l lg:border-t-0"
		data-testid="case-workspace-shell-right"
		data-region="case-workspace-shell-right"
	>
		<slot name="right" />
	</aside>
</div>
