<script lang="ts">
	/**
	 * P75-08 — Wave 2 `/search` route: deep-link target for global search (P75-01 inventory gap).
	 *
	 * Posture: primary UX is `SearchModal` (P75-09 — modes: Search / Jump / Command / Workspace).
	 * Same `showSearch` store as GNAV + top bar. This route keeps `/search` in the shell; on load we
	 * open the modal. No duplicate case shell — case routes remain `/case/:id/...` only.
	 */
	import { onMount, getContext } from 'svelte';
	import { showSearch, WEBUI_NAME } from '$lib/stores';
	import { DS_EMPTY_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	const i18n = getContext('i18n');

	onMount(() => {
		showSearch.set(true);
	});
</script>

<svelte:head>
	<title>{$i18n.t('Search')} • {$WEBUI_NAME}</title>
</svelte:head>

<div
	class="flex flex-1 flex-col w-full min-w-0 h-full overflow-y-auto px-4 py-6 md:px-8 md:py-8"
	data-testid="search-route-page"
>
	<div class="max-w-4xl w-full mx-auto">
		<p class="{DS_EMPTY_CLASSES.description} text-center">
			{$i18n.t(
				'Use the Global search & command panel for chat history (Search tab), app navigation (Jump), and honest placeholders for command palette / case-wide search. Case tools open per case workspace.'
			)}
		</p>
	</div>
</div>
