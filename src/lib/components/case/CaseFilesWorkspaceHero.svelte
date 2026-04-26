<!--
	Files & Evidence — primary hero row (aligned with Activity/Timeline Tier L tokens).
-->
<script lang="ts">
	import { DS_BTN_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { FolderIcon, ArrowUpTrayIcon, EllipsisHorizontalIcon } from 'heroicons-svelte/24/outline';

	export let title = 'Files & Evidence';
	export let subtitle =
		'Secure repository for all case files. Extracted content is indexed for search and AI analysis.';
	export let uploading = false;
	export let disabled = false;
	export let onUploadClick: (() => void) | undefined = undefined;
	export let onNewFolderClick: (() => void) | undefined = undefined;
</script>

<section
	class="shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] px-3 py-3 sm:px-4"
	aria-labelledby="case-files-workspace-hero-title"
	data-testid="case-files-workspace-hero"
>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0 flex-1">
			<div class="flex items-start gap-2">
				<FolderIcon
					class="h-6 w-6 shrink-0 text-[color:var(--ce-l-text-muted)] sm:h-7 sm:w-7"
					aria-hidden="true"
				/>
				<div class="min-w-0">
					<h2
						id="case-files-workspace-hero-title"
						class="m-0 text-lg font-semibold leading-snug tracking-tight text-[color:var(--ce-l-text-primary)] sm:text-xl"
					>
						{title}
					</h2>
					<p
						class="m-0 mt-1 max-w-3xl text-xs leading-snug text-[color:var(--ce-l-text-muted)] sm:text-sm"
					>
						{subtitle}
					</p>
				</div>
			</div>
		</div>
		<div class="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
			<button
				type="button"
				class="{DS_BTN_CLASSES.primary} inline-flex items-center gap-1.5"
				disabled={disabled || uploading}
				data-testid="case-files-hero-upload-btn"
				on:click={() => onUploadClick?.()}
			>
				<ArrowUpTrayIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
				{uploading ? 'Uploading…' : 'Upload Files'}
			</button>
			<button
				type="button"
				class="{DS_BTN_CLASSES.secondary} inline-flex items-center gap-1.5"
				disabled={disabled}
				data-testid="case-files-hero-new-folder-btn"
				on:click={() => onNewFolderClick?.()}
			>
				<FolderIcon class="h-4 w-4 shrink-0" aria-hidden="true" />
				New folder
			</button>
			<details class="relative" data-testid="case-files-hero-more-menu">
				<summary
					class="list-none cursor-pointer {DS_BTN_CLASSES.ghost} flex items-center p-2 [&::-webkit-details-marker]:hidden"
					aria-label="More file actions"
					data-testid="case-files-hero-more-btn"
				>
					<EllipsisHorizontalIcon class="h-5 w-5 text-[color:var(--ce-l-text-muted)]" />
				</summary>
				<div
					class="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-md border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] py-1 shadow-lg"
					role="menu"
				>
					<button
						type="button"
						class="w-full px-3 py-2 text-left text-sm text-[color:var(--ce-l-text-muted)] disabled:opacity-50"
						disabled={true}
						role="menuitem"
					>
						Export list (soon)
					</button>
					<button
						type="button"
						class="w-full px-3 py-2 text-left text-sm text-[color:var(--ce-l-text-muted)] disabled:opacity-50"
						disabled={true}
						role="menuitem"
					>
						Bulk tag (soon)
					</button>
				</div>
			</details>
		</div>
	</div>
</section>
