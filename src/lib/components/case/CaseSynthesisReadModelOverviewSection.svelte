<script lang="ts">
	/**
	 * Phase 96 — Loads {@link buildCaseSynthesisReadModel} (read-only GETs) and renders
	 * {@link CaseSynthesisReadModelPanel}. No mutations.
	 */
	import { caseEngineToken } from '$lib/stores';
	import { buildCaseSynthesisReadModel } from '$lib/case/caseSynthesisReadModel';
	import CaseSynthesisReadModelPanel from '$lib/components/case/CaseSynthesisReadModelPanel.svelte';
	import { DS_STACK_CLASSES, DS_TYPE_CLASSES, DS_SUMMARY_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;

	let loadSeq = 0;
	let loading = false;
	let error: string | null = null;
	let model: import('$lib/case/caseSynthesisReadModel').CaseSynthesisReadModel | null = null;

	async function load(): Promise<void> {
		const token = $caseEngineToken;
		if (!caseId?.trim()) {
			model = null;
			error = null;
			loading = false;
			return;
		}
		if (!token) {
			model = null;
			error = null;
			loading = false;
			return;
		}
		const seq = ++loadSeq;
		loading = true;
		error = null;
		try {
			const m = await buildCaseSynthesisReadModel(caseId.trim(), token, {
				includeFileExtractedText: false
			});
			if (seq !== loadSeq) return;
			model = m;
		} catch (e) {
			if (seq !== loadSeq) return;
			model = null;
			error = e instanceof Error ? e.message : 'Failed to load synthesis view.';
		} finally {
			if (seq === loadSeq) loading = false;
		}
	}

	$: if (caseId && $caseEngineToken) {
		void load();
	}
	$: if (caseId && !$caseEngineToken) {
		model = null;
		error = null;
		loading = false;
	}
</script>

<section
	class="{DS_SUMMARY_CLASSES.moduleBrief} {DS_STACK_CLASSES.stack}"
	id="summary-module-synthesis-read"
	aria-labelledby="summary-module-synthesis-read-heading"
	data-region="case-synthesis-read-section"
>
	<header class={DS_STACK_CLASSES.tight}>
		<h2 id="summary-module-synthesis-read-heading" class={DS_TYPE_CLASSES.panel}>
			What we know so far (read-only)
		</h2>
		<p class="{DS_TYPE_CLASSES.meta} max-w-2xl">
			Read-only layout from Case Engine—Timeline tab holds the official chronology. Does not save, export, or change
			records.
		</p>
	</header>

	<div class={DS_SUMMARY_CLASSES.sectionDivider}>
		<CaseSynthesisReadModelPanel {model} {loading} {error} />
	</div>
</section>
