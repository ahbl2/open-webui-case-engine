<script lang="ts">
	import { page } from '$app/stores';
	import { DS_APP_SHELL_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import DetectiveAppShellTopBar from '$lib/components/layout/DetectiveAppShellTopBar.svelte';

	/**
	 * P75-02 — Wave 2 app shell scaffold: structural regions for unified detective + admin shell.
	 *
	 * - Left sidebar: `DetectiveWorkspaceSidebar` (sibling in `(app)/+layout`, fixed).
	 * - Top utility: rendered here for non-case routes; suppressed on `/case/*` so the case
	 *   workspace shell (identity bar + tab strip) stays the primary chrome without double headers
	 *   or nested scroll conflicts (P75-08 — single navigation owner; no app-level case strip). P75-05: `DetectiveAppShellTopBar` in `data-region="app-shell-top"`.
	 * - Main canvas: routed pages; bounded height via flex chain (`flex-1 min-h-0`).
	 */
	$: isCaseWorkspaceRoute = $page.url.pathname.startsWith('/case/');
</script>

<div
	class="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden {DS_APP_SHELL_CLASSES.root}"
	data-testid="detective-app-shell"
>
	{#if !isCaseWorkspaceRoute}
		<header
			class="{DS_APP_SHELL_CLASSES.top} shrink-0"
			aria-label="Workspace top bar"
			data-region="app-shell-top"
		>
			<div class="{DS_APP_SHELL_CLASSES.topRow}">
				<DetectiveAppShellTopBar />
			</div>
		</header>
	{/if}

	<div
		class="{DS_APP_SHELL_CLASSES.main} flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden"
		data-region="app-shell-main"
		data-app-shell-case-route={isCaseWorkspaceRoute ? 'true' : 'false'}
	>
		<slot />
	</div>
</div>
