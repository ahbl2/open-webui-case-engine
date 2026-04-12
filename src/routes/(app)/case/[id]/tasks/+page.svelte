<script lang="ts">
	// CRITICAL: Tasks are operational-only and NON-AUTHORITATIVE vs Timeline.
	// They must NEVER directly or indirectly cause any mutation of timeline_entries.
	//
	/**
	 * P86-01 — Tasks / Leads (operational only)
	 * P86-05 — Tier L shell + tasks tab.
	 * P89-07 — `CaseTasksPanel` loads/writes persisted Tasks via Case Engine (`case_tasks`); still not Timeline.
	 */
	import CaseTasksPanel from '$lib/components/case/CaseTasksPanel.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
</script>

<CaseWorkspaceContentRegion testId="case-tasks-page">
	<CaseTasksPanel />
</CaseWorkspaceContentRegion>
