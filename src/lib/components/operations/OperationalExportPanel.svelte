<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		exportPlanBriefJSON,
		exportPlanBriefMarkdown,
		exportPlanBriefHTML
	} from '$lib/apis/operationsApi';

	export let caseId: string;
	export let planId: string;
	export let token: string;

	let exporting: 'json' | 'md' | 'html' | null = null;

	async function handleExport(format: 'json' | 'md' | 'html') {
		if (!caseId || !planId || !token) return;
		exporting = format;
		try {
			if (format === 'json') await exportPlanBriefJSON(caseId, planId, token);
			else if (format === 'md') await exportPlanBriefMarkdown(caseId, planId, token);
			else await exportPlanBriefHTML(caseId, planId, token);
			toast.success(`Exported as ${format.toUpperCase()}`);
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Export failed');
		} finally {
			exporting = null;
		}
	}
</script>

<section class="rounded-lg border border-base-300 bg-base-200/50 p-4">
	<h3 class="text-sm font-semibold text-base-content mb-3">Export Operational Brief</h3>
	<p class="text-xs text-base-content/70 mb-3">Download the current plan brief as JSON, Markdown, or printable HTML.</p>
	<div class="flex flex-wrap gap-2">
		<button
			type="button"
			class="btn btn-sm btn-outline"
			disabled={exporting !== null}
			on:click={() => handleExport('json')}
		>
			{exporting === 'json' ? 'Exporting…' : 'Export JSON'}
		</button>
		<button
			type="button"
			class="btn btn-sm btn-outline"
			disabled={exporting !== null}
			on:click={() => handleExport('md')}
		>
			{exporting === 'md' ? 'Exporting…' : 'Export Markdown'}
		</button>
		<button
			type="button"
			class="btn btn-sm btn-outline"
			disabled={exporting !== null}
			on:click={() => handleExport('html')}
		>
			{exporting === 'html' ? 'Exporting…' : 'Export HTML'}
		</button>
	</div>
</section>
