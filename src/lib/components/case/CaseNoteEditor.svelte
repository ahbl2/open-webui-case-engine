<script lang="ts">
	/**
	 * P28-20 — Case Note Editor Shell (Read-Only POC)
	 * P28-21 — Embedded in case notes list (read-only)
	 * P28-22 — Extended with governed editable mode (CE-backed, explicit save)
	 *
	 * Displays a single Case Engine notebook note using the TipTap rich-text
	 * editor shell from the OWUI Notes UI.
	 *
	 * READ-ONLY constraints (editable=false, the default):
	 *   - editable={false} enforced on TipTap — no user input accepted
	 *   - No autosave, no debounce, no OWUI Notes API calls
	 *   - No Socket.IO collaboration
	 *   - No persistence of any kind
	 *
	 * EDIT MODE constraints (editable=true):
	 *   - Explicitly enabled by caller — never automatic
	 *   - Emits 'change' event with updated plain text on every user edit
	 *   - Caller owns Save/Cancel — this component never calls any backend
	 *   - No autosave, no debounce, no OWUI Notes API calls
	 *   - richText=false: TipTap operates in plain-text paragraph mode only
	 *     (no bold/italic/lists in edit mode — edit is markdown-in/markdown-out)
	 *   - Content initialized from `content` prop exactly once on mount;
	 *     subsequent prop changes do NOT re-initialize editor during editing
	 *     (guards against reactive loops when parent mirrors editText ↔ content)
	 *
	 * Data source: caller is responsible for fetching note content from
	 * Case Engine. This component never fetches or writes to any backend.
	 *
	 * Props:
	 *   content    — note body as a plain-text / markdown string
	 *   title      — optional display title (shown in standalone header)
	 *   label      — optional badge label (e.g. "Working draft")
	 *   showHeader — false for list/embedded use (suppresses header, auto-sizes)
	 *   editable   — true enables edit mode; false (default) is read-only
	 *
	 * Events:
	 *   change     — fires in edit mode with updated plain text (string)
	 */

	import { createEventDispatcher, getContext } from 'svelte';
	import RichTextInput from '$lib/components/common/RichTextInput.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher<{ change: string }>();

	export let content: string = '';
	export let title: string = '';
	export let label: string = '';
	/** false = embedded in list card (no header, auto-height). true = standalone (full-height). */
	export let showHeader: boolean = true;
	/** false (default) = read-only view. true = edit mode with change events. */
	export let editable: boolean = false;

	let editor = null;

	// ── View mode ────────────────────────────────────────────────────────────
	// Notes are stored as plain text (newline-separated) from the TipTap editor.
	// Running through marked.parse() collapses single newlines into spaces per
	// Markdown spec, causing view mode to appear visually flattened.
	// Use the same HTML representation as edit mode: each \n becomes <br> inside
	// a single paragraph, so view and edit are visually consistent.
	let renderedHtml = '';
	function toViewHtml(text: string): string {
		if (!text) return '';
		const normalized = text.replace(/\r\n?/g, '\n');
		const escaped = normalized
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
	}
	$: renderedHtml = content ? toViewHtml(content) : '';

	// Push external content changes into the read-only editor (e.g. after a CE reload).
	// Guard: only in view mode — edit mode must never have content pushed in reactively.
	$: if (!editable && editor && renderedHtml !== undefined) {
		editor.commands.setContent(renderedHtml);
	}

	// ── Edit mode ─────────────────────────────────────────────────────────────
	// Initialize the TipTap editor exactly once from `content` when edit mode begins.
	// The flag prevents re-initialization when the parent mirrors editText ↔ content prop.
	let editInitialized = false;
	$: if (editable && editor && !editInitialized) {
		editor.commands.setContent(toEditHtml(content));
		editInitialized = true;
	}

	/**
	 * Convert stored plain text to TipTap edit HTML without newline inflation.
	 *
	 * Important:
	 * - Preserve user-entered spacing exactly (including intentional blank lines).
	 * - Avoid mapping each line to a separate paragraph; paragraph spacing in the
	 *   editor can make single newlines appear as extra blank lines and compound
	 *   across repeated edit/save cycles.
	 * - Represent line breaks as <br> within one paragraph for stable round-trip.
	 */
	function toEditHtml(text: string): string {
		if (!text) return '<p><br></p>';
		const normalized = text.replace(/\r\n?/g, '\n');
		const escaped = normalized
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
		return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
	}

	/**
	 * Called by RichTextInput's onChange on every editor transaction.
	 * Extracts plain text using a single newline as the block separator
	 * (matching the per-line paragraph structure from toEditHtml).
	 * Dispatches 'change' event so the parent can update its editText variable.
	 * Does NOT call any backend — save is the caller's responsibility.
	 */
	const handleChange = (_e: { html: string; json: unknown; md: string }) => {
		if (!editable || !editor) return;
		dispatch('change', editor.getText({ blockSeparator: '\n' }));
	};
</script>

<!--
	Case Note Editor Shell.

	Standalone mode (showHeader=true):
	  Full-height flex container that fills its parent.
	  Shows a header row (title, optional label, status badge).

	Embedded/list mode (showHeader=false):
	  Auto-height container, no header.
	  Caller wraps in a max-height div to bound list card height.

	Edit mode (editable=true):
	  TipTap accepts user input (plain-text only — no formatting toolbar).
	  Status badge changes from "Read-only" to "Editing".
	  Emits 'change' events; caller owns Save/Cancel.
-->
<div
	class="flex flex-col w-full {showHeader ? 'h-full' : ''}"
	data-testid="case-note-editor-shell"
>
	<!-- Header row — standalone use only (showHeader=true) -->
	{#if showHeader}
		<div
			class="shrink-0 flex items-center gap-2 px-3.5 py-2 border-b border-gray-200 dark:border-gray-800"
		>
			{#if title}
				<h2 class="flex-1 text-base font-medium text-gray-800 dark:text-gray-100 truncate">
					{title}
				</h2>
			{:else}
				<h2
					class="flex-1 text-base font-medium text-gray-400 dark:text-gray-600 truncate italic"
				>
					{$i18n.t('Untitled')}
				</h2>
			{/if}

			{#if label}
				<span
					class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded
					       bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
				>
					{label}
				</span>
			{/if}

			<!-- Status badge: changes between view and edit mode -->
			{#if editable}
				<span
					class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded
					       bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
				>
					{$i18n.t('Editing')}
				</span>
			{:else}
				<span
					class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded
					       bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
					title="This view is read-only. Editing is not yet wired."
				>
					{$i18n.t('Read-only')}
				</span>
			{/if}
		</div>
	{/if}

	<!--
		Editor body.
		Standalone: flex-1 + overflow-y-auto so the body fills remaining parent height.
		Embedded:   no flex-1 so the container sizes to content; caller bounds with max-h.

		Edit mode: min-h-[6rem] ensures at least ~4 typing lines even when content is short.
	-->
	<div
		class="{showHeader ? 'flex-1 overflow-y-auto' : ''} {editable ? 'min-h-[6rem]' : ''} px-2 py-2"
		id="case-note-editor-body"
	>
		{#if content || editable}
			<RichTextInput
				bind:editor
				id="case-note-editor"
				className="input-prose-sm px-0.5 {showHeader ? 'h-full' : ''}"
				editable={editable}
				richText={!editable}
				collaboration={false}
				showFormattingToolbar={false}
				dragHandle={false}
				link={false}
				image={false}
				fileHandler={false}
				onChange={handleChange}
			/>
		{:else}
			<div
				class="flex items-center justify-center {showHeader ? 'h-full' : ''} py-6 text-sm text-gray-400 dark:text-gray-600"
			>
				{$i18n.t('No content.')}
			</div>
		{/if}
	</div>
</div>
