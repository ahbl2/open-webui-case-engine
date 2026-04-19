<!--
	P129 — Heroicon outline per KPI domain variant (parity with Summary KPI canon).
-->
<script lang="ts">
	import type { P129ActivityKpiVariant } from '$lib/case/p129ActivityDomainTheme';
	import {
		BookOpenIcon,
		CalendarDaysIcon,
		ClipboardDocumentListIcon,
		DocumentTextIcon,
		FolderIcon,
		ShieldCheckIcon,
		UserGroupIcon
	} from 'heroicons-svelte/24/outline';

	export let variant: P129ActivityKpiVariant;
</script>

{#if variant === 'blue'}
	<CalendarDaysIcon />
{:else if variant === 'cyan'}
	<BookOpenIcon />
{:else if variant === 'green'}
	<FolderIcon />
{:else if variant === 'violet'}
	<UserGroupIcon />
{:else if variant === 'yellow'}
	<ClipboardDocumentListIcon />
{:else if variant === 'rose'}
	<DocumentTextIcon />
{:else if variant === 'orange'}
	<ShieldCheckIcon />
{/if}
