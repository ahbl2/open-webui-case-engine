<!--
	P82-01 — Shared case workspace frame: identity/header slot, left nav rail,
	main column (context band + `ds-case-shell__body` owned by parent).
	P82-01-FU1 — Header slot owns Tier L `ce-l-identity-bar` chrome from `+layout.svelte` (no duplicate shell border).
-->
<div class="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
	<div class="shrink-0 z-10 min-w-0" data-region="case-shell-header">
		<slot name="header" />
	</div>
	<div class="flex flex-1 min-h-0 min-w-0 overflow-hidden" data-region="case-shell-main-split">
		<slot name="nav" />
		<div class="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
			<slot />
		</div>
	</div>
</div>
