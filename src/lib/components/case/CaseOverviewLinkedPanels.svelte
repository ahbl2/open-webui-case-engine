<script lang="ts">
	/**
	 * P82-05 — Overview linked panels: bounded previews for Files, committed Entities, and your Notebook notes.
	 * Uses existing Case Engine list endpoints only; no new aggregation or mock rows.
	 */
	import { onDestroy } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import {
		listCaseFilesPage,
		listCaseIntelligenceCommittedEntities,
		listCaseNotebookNotes,
		type CaseFile,
		type CaseIntelligenceCommittedEntity,
		type NotebookNote
	} from '$lib/apis/caseEngine';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		DS_BADGE_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_STACK_CLASSES,
		DS_TYPE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_STATUS_SURFACE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;

	const PREVIEW_LIMIT = 3;

	type PanelReady<T> = { kind: 'loading' } | { kind: 'ready'; total: number; rows: T[] } | { kind: 'error'; message: string };

	type FileRow = { id: string; name: string; uploadedAt: string };
	type EntityRow = { id: string; label: string; kind: string };
	type NoteRow = { id: string; headline: string; updatedAt: string };

	let loadGeneration = 0;
	let filesPanel: PanelReady<FileRow> = { kind: 'loading' };
	let entitiesPanel: PanelReady<EntityRow> = { kind: 'loading' };
	let notesPanel: PanelReady<NoteRow> = { kind: 'loading' };

	function sortEntitiesForPreview(ents: CaseIntelligenceCommittedEntity[]): CaseIntelligenceCommittedEntity[] {
		return [...ents].sort((a, b) => {
			const ta = (a.updated_at ?? a.created_at ?? '').trim();
			const tb = (b.updated_at ?? b.created_at ?? '').trim();
			return new Date(tb).getTime() - new Date(ta).getTime();
		});
	}

	function sortNotesForPreview(notes: NotebookNote[]): NotebookNote[] {
		return [...notes].sort(
			(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
		);
	}

	function noteHeadline(n: NotebookNote): string {
		const t = (n.title ?? '').trim();
		if (t) return t;
		const body = (n.current_text ?? '').trim().replace(/\s+/g, ' ');
		const max = 100;
		if (body.length <= max) return body || '(Empty note)';
		return `${body.slice(0, max - 1)}…`;
	}

	function mapFiles(files: CaseFile[]): FileRow[] {
		return files.slice(0, PREVIEW_LIMIT).map((f) => ({
			id: String(f.id ?? ''),
			name: (f.original_filename ?? 'File').trim() || 'File',
			uploadedAt: f.uploaded_at ?? ''
		}));
	}

	function mapEntities(ents: CaseIntelligenceCommittedEntity[]): EntityRow[] {
		return sortEntitiesForPreview(ents)
			.slice(0, PREVIEW_LIMIT)
			.map((e) => ({
				id: e.id,
				label: (e.display_label ?? '').trim() || '—',
				kind: (e.entity_kind ?? '').trim() || '—'
			}));
	}

	function mapNotes(notes: NotebookNote[]): NoteRow[] {
		return sortNotesForPreview(notes)
			.slice(0, PREVIEW_LIMIT)
			.map((n) => ({
				id: String(n.id),
				headline: noteHeadline(n),
				updatedAt: n.updated_at ?? ''
			}));
	}

	async function loadPanels(id: string, token: string, gen: number): Promise<void> {
		filesPanel = { kind: 'loading' };
		entitiesPanel = { kind: 'loading' };
		notesPanel = { kind: 'loading' };

		const settled = await Promise.allSettled([
			listCaseFilesPage(id, token, { limit: PREVIEW_LIMIT, offset: 0 }),
			listCaseIntelligenceCommittedEntities(id, token),
			listCaseNotebookNotes(id, token)
		]);
		if (gen !== loadGeneration) return;

		const [fr, en, nb] = settled;

		if (fr.status === 'fulfilled') {
			const total = fr.value.totalFiles;
			if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
				filesPanel = { kind: 'error', message: 'Invalid file count from Case Engine.' };
			} else if (total === 0) {
				filesPanel = { kind: 'ready', total: 0, rows: [] };
			} else {
				filesPanel = {
					kind: 'ready',
					total,
					rows: mapFiles(fr.value.files ?? [])
				};
			}
		} else {
			filesPanel = {
				kind: 'error',
				message: fr.reason instanceof Error ? fr.reason.message : 'Could not load files.'
			};
		}

		if (en.status === 'fulfilled') {
			const ents = en.value.committed_entities ?? [];
			entitiesPanel = {
				kind: 'ready',
				total: ents.length,
				rows: mapEntities(ents)
			};
		} else {
			entitiesPanel = {
				kind: 'error',
				message: en.reason instanceof Error ? en.reason.message : 'Could not load entities.'
			};
		}

		if (nb.status === 'fulfilled') {
			const notes = nb.value;
			notesPanel = {
				kind: 'ready',
				total: notes.length,
				rows: mapNotes(notes)
			};
		} else {
			notesPanel = {
				kind: 'error',
				message: nb.reason instanceof Error ? nb.reason.message : 'Could not load notes.'
			};
		}
	}

	$: token = $caseEngineToken;

	$: if (caseId && token) {
		loadGeneration += 1;
		const gen = loadGeneration;
		loadPanels(caseId, token, gen);
	} else {
		loadGeneration += 1;
		filesPanel = { kind: 'loading' };
		entitiesPanel = { kind: 'loading' };
		notesPanel = { kind: 'loading' };
	}

	onDestroy(() => {
		loadGeneration += 1;
	});
</script>

<section
	id="summary-module-linked-panels"
	class="{DS_STACK_CLASSES.stack} border-b border-[color:var(--ds-border-default)] pb-6"
	data-testid="case-overview-linked-panels"
	aria-labelledby="case-overview-linked-panels-heading"
>
	<div class={DS_STACK_CLASSES.tight}>
		<h2 id="case-overview-linked-panels-heading" class={DS_TYPE_CLASSES.panel}>
			Files, entities, and notes
		</h2>
		<p class="{DS_TYPE_CLASSES.meta} max-w-3xl text-[var(--ds-text-secondary)]">
			Compact previews from Case Engine. Files and entities are case-wide; notebook previews are your drafts only
			(owner-scoped, same as the Notes tab).
		</p>
	</div>

	{#if !token}
		<p class="{DS_TYPE_CLASSES.meta} mt-4" data-testid="case-overview-linked-panels-no-token">
			Case Engine sign-in required to load these panels.
		</p>
	{:else}
		<div
			class="mt-4 grid gap-4 lg:grid-cols-3"
			data-testid="case-overview-linked-panels-grid"
		>
			<!-- Files -->
			<div class={DS_SUMMARY_CLASSES.outputCard}>
				<div class="flex flex-wrap items-start justify-between gap-2">
					<h3 class={DS_TYPE_CLASSES.label}>Files</h3>
					<a
						href="/case/{caseId}/files"
						class="{DS_SUMMARY_CLASSES.navLink} shrink-0"
						data-testid="case-overview-linked-panels-files-link"
						>View files</a
					>
				</div>
				{#if filesPanel.kind === 'loading'}
					<div class="mt-3 flex items-center gap-2" role="status">
						<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
						<span class={DS_TYPE_CLASSES.meta}>Loading…</span>
					</div>
				{:else if filesPanel.kind === 'error'}
					<div class="mt-3 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
						<p class="ds-status-copy">{filesPanel.message}</p>
					</div>
				{:else if filesPanel.total === 0}
					<p class="{DS_TYPE_CLASSES.meta} mt-3" data-testid="case-overview-linked-panels-files-empty">
						No files uploaded for this case.
					</p>
				{:else}
					<p class="{DS_TYPE_CLASSES.meta} mt-2 tabular-nums">
						<span class="font-medium text-[var(--ds-text-primary)]">{filesPanel.total}</span>
						file{filesPanel.total === 1 ? '' : 's'} total
					</p>
					<ul class="mt-3 list-none space-y-2.5 p-0" data-testid="case-overview-linked-panels-files-preview">
						{#each filesPanel.rows as row (row.id)}
							<li class="border-t border-[color:var(--ds-border-subtle)] pt-2 first:border-t-0 first:pt-0">
								<p class="{DS_TYPE_CLASSES.body} line-clamp-2 break-words">{row.name}</p>
								{#if row.uploadedAt}
									<p class="{DS_TYPE_CLASSES.meta} mt-0.5">
										Uploaded {formatCaseDateTime(row.uploadedAt)}
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Entities -->
			<div class={DS_SUMMARY_CLASSES.outputCard}>
				<div class="flex flex-wrap items-start justify-between gap-2">
					<h3 class={DS_TYPE_CLASSES.label}>Committed entities</h3>
					<a
						href="/case/{caseId}/entities"
						class="{DS_SUMMARY_CLASSES.navLink} shrink-0"
						data-testid="case-overview-linked-panels-entities-link"
						>View entities</a
					>
				</div>
				{#if entitiesPanel.kind === 'loading'}
					<div class="mt-3 flex items-center gap-2" role="status">
						<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
						<span class={DS_TYPE_CLASSES.meta}>Loading…</span>
					</div>
				{:else if entitiesPanel.kind === 'error'}
					<div class="mt-3 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
						<p class="ds-status-copy">{entitiesPanel.message}</p>
					</div>
				{:else if entitiesPanel.total === 0}
					<p class="{DS_TYPE_CLASSES.meta} mt-3" data-testid="case-overview-linked-panels-entities-empty">
						No committed entities for this case.
					</p>
				{:else}
					<p class="{DS_TYPE_CLASSES.meta} mt-2 tabular-nums">
						<span class="font-medium text-[var(--ds-text-primary)]">{entitiesPanel.total}</span>
						committed
					</p>
					<ul class="mt-3 list-none space-y-2.5 p-0" data-testid="case-overview-linked-panels-entities-preview">
						{#each entitiesPanel.rows as row (row.id)}
							<li class="border-t border-[color:var(--ds-border-subtle)] pt-2 first:border-t-0 first:pt-0">
								<p class="{DS_TYPE_CLASSES.body} line-clamp-2 break-words">{row.label}</p>
								<p class="mt-1">
									<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}">{row.kind}</span>
								</p>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Notes (owner-scoped) -->
			<div class={DS_SUMMARY_CLASSES.outputCard}>
				<div class="flex flex-wrap items-start justify-between gap-2">
					<h3 class={DS_TYPE_CLASSES.label}>Your notes</h3>
					<a
						href="/case/{caseId}/notes"
						class="{DS_SUMMARY_CLASSES.navLink} shrink-0"
						data-testid="case-overview-linked-panels-notes-link"
						>View notes</a
					>
				</div>
				<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[var(--ds-text-secondary)]">
					Your notebook drafts (owner-scoped; same API as the Notes tab).
				</p>
				{#if notesPanel.kind === 'loading'}
					<div class="mt-3 flex items-center gap-2" role="status">
						<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
						<span class={DS_TYPE_CLASSES.meta}>Loading…</span>
					</div>
				{:else if notesPanel.kind === 'error'}
					<div class="mt-3 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
						<p class="ds-status-copy">{notesPanel.message}</p>
					</div>
				{:else if notesPanel.total === 0}
					<p class="{DS_TYPE_CLASSES.meta} mt-3" data-testid="case-overview-linked-panels-notes-empty">
						No notebook notes yet.
					</p>
				{:else}
					<p class="{DS_TYPE_CLASSES.meta} mt-2 tabular-nums">
						<span class="font-medium text-[var(--ds-text-primary)]">{notesPanel.total}</span>
						note{notesPanel.total === 1 ? '' : 's'}
					</p>
					<ul class="mt-3 list-none space-y-2.5 p-0" data-testid="case-overview-linked-panels-notes-preview">
						{#each notesPanel.rows as row (row.id)}
							<li class="border-t border-[color:var(--ds-border-subtle)] pt-2 first:border-t-0 first:pt-0">
								<p class="{DS_TYPE_CLASSES.body} line-clamp-2 break-words">{row.headline}</p>
								{#if row.updatedAt}
									<p class="{DS_TYPE_CLASSES.meta} mt-0.5">
										Updated {formatCaseDateTime(row.updatedAt)}
									</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	{/if}
</section>
