<script lang="ts">
	/**
	 * P74-09 — Primitive entry point for Ask integrity banner (reuses `CaseEngineAskIntegrityBanner`).
	 */
	import CaseEngineAskIntegrityBanner from '$lib/components/case/CaseEngineAskIntegrityBanner.svelte';
	import type { AskIntegrityPresentation } from '$lib/utils/askIntegrityUi';

	export let integrityPresentation: AskIntegrityPresentation | undefined = undefined;
</script>

<CaseEngineAskIntegrityBanner {integrityPresentation}>
	<slot name="detail" slot="detail" />
</CaseEngineAskIntegrityBanner>
