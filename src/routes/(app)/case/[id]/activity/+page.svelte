<script lang="ts">
	/**
	 * P129-01 — Activity audit framing (`CaseActivityFraming`); case id via `getRouteCaseIdString` only.
	 * No activity fetch or list (P129-02 / P129-03); placeholder empty state only.
	 */
	import { page } from '$app/stores';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import CaseActivityFraming from '$lib/components/case/CaseActivityFraming.svelte';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import { getRouteCaseIdString } from '$lib/caseContext/routeCaseContext';
	import {
		P129_ACTIVITY_EMPTY_DESCRIPTION,
		P129_ACTIVITY_EMPTY_TITLE
	} from '$lib/caseContext/p129ActivityFramingCopy';

	$: routeCaseId = getRouteCaseIdString($page.params);
</script>

<CaseWorkspaceContentRegion testId="case-activity-page">
	<div
		class="ce-l-activity-shell flex min-h-0 flex-1 flex-col overflow-hidden"
		data-route-case-id={routeCaseId || undefined}
	>
		<!-- P129-01 — Identity framing: always first; visible for empty and when list exists (future). -->
		<CaseActivityFraming />
		<div
			class="ce-l-activity-primary-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-3 pb-4"
			data-testid="case-activity-primary-scroll"
			data-region="case-activity-primary-scroll"
		>
			<!-- Populated list + loading state: P129-02 / P129-03. Framing remains above. -->
			<CaseEmptyState
				title={P129_ACTIVITY_EMPTY_TITLE}
				description={P129_ACTIVITY_EMPTY_DESCRIPTION}
				testId="case-activity-empty"
			/>
		</div>
	</div>
</CaseWorkspaceContentRegion>
