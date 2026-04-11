<script lang="ts">
	/**
	 * P82-01 — Case-scoped left rail (Phase 82 scope: five destinations).
	 * P82-01-FU1 — No “More tools” section; other case routes remain reachable via bookmarks/redirects and app chrome.
	 */
	import { page } from '$app/stores';
	import { resolveActiveCaseSection } from '$lib/utils/caseNavSection';
	import { isDetectiveWave3CaseShellEnabled } from '$lib/case/detectiveWave3CaseShell';

	$: caseId = $page.params.id ?? '';
	$: activeSection = resolveActiveCaseSection($page.url.pathname);
	$: wave3CaseShellEnabled = isDetectiveWave3CaseShellEnabled();

	const primaryNavItems: Array<{ id: string; label: string }> = [
		{ id: 'summary', label: 'Overview' },
		{ id: 'timeline', label: 'Timeline' },
		{ id: 'files', label: 'Files' },
		{ id: 'entities', label: 'Entities' },
		{ id: 'notes', label: 'Notes' }
	];

	function primaryHref(id: string, sectionId: string): string {
		return `/case/${id}/${sectionId}`;
	}
</script>

<nav
	class="ce-l-case-nav-rail flex flex-col gap-1 p-2 shrink-0 z-[5]"
	data-testid="case-workspace-nav"
	aria-label="Case sections"
	data-region={wave3CaseShellEnabled ? 'case-shell-tabs' : undefined}
>
	{#each primaryNavItems as item}
		<a
			href={primaryHref(caseId, item.id)}
			class="ce-l-tab-link ce-l-case-nav-link {activeSection === item.id ? 'ce-l-tab-link--active' : ''}"
			data-case-tab={item.id}
			aria-current={activeSection === item.id ? 'page' : undefined}
		>
			{item.label}
		</a>
	{/each}
</nav>
