<script lang="ts">
	import { page } from '$app/stores';
	import { DS_APP_SHELL_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	/**
	 * P75-02 — Wave 2 app shell **main** region only (bounded height, flex chain).
	 * The workspace top strip (`DetectiveAppShellTopBar`) is rendered in `(app)/+layout`
	 * as a sibling on `data-testid="app-main-content-pane"` so it sits on the app canvas,
	 * not nested inside this frame. `/case/*` suppresses the top strip in layout only.
	 */
	$: isCaseWorkspaceRoute = $page.url.pathname.startsWith('/case/');
</script>

<div
	class="{DS_APP_SHELL_CLASSES.main} flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden"
	data-region="app-shell-main"
	data-app-shell-case-route={isCaseWorkspaceRoute ? 'true' : 'false'}
	data-testid="detective-app-shell-main"
>
	<slot />
</div>
