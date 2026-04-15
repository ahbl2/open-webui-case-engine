<script lang="ts">
	/**
	 * P131.6-01 — Home dashboard center column: activity + intelligence (composition only).
	 * P131.6-02 — State-aware activity + intel empty surfaces (no new data sources).
	 * P131.6-03 — Optional error surfaces for future feeds (defaults: no error).
	 * P131.6-04 — Section labels (h3) + aria-labelledby.
	 * P131.7-07 — Activity feed row chrome (icon | text | meta); data array empty until feed API exists.
	 * P131.9-05B — Activity + intel cells shared with desktop `ds-occ-dashboard-board` via OccHomeBoardActivity.
	 */
	import { DS_STACK_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import OccHomeBoardActivity from './OccHomeBoardActivity.svelte';
	import OccRailIntel from '$lib/components/operator/OccRailIntel.svelte';
	import { getContext } from 'svelte';

	const i18n = getContext('i18n');

	export let activityHasError = false;
	export let onRetryActivity: (() => void) | undefined = undefined;
	export let activityRetryDisabled = false;

	export let intelHasError = false;
	export let onRetryIntel: (() => void) | undefined = undefined;
	export let intelRetryDisabled = false;
</script>

<div class="{DS_STACK_CLASSES.stack} min-w-0" data-testid="occ-home-dashboard-center">
	<OccHomeBoardActivity
		activityHasError={activityHasError}
		onRetryActivity={onRetryActivity}
		activityRetryDisabled={activityRetryDisabled}
	/>

	<OccRailIntel
		hasError={intelHasError}
		onRetry={onRetryIntel}
		retryDisabled={intelRetryDisabled}
		retryAriaLabel={$i18n.t('Retry loading intelligence feed')}
	/>
</div>
