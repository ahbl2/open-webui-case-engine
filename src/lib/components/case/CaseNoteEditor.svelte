<script lang="ts">
	/**
	 * P28-20 — Case Note Editor Shell (Read-Only POC)
	 * P28-21 — Embedded in case notes list (read-only)
	 * P28-22 — Extended with governed editable mode (CE-backed, explicit save)
	 *
	 * TipTap (`RichTextInput`) for case notebook notes. Persisted body is **GitHub-Flavored
	 * Markdown** (via the editor’s Turndown pipeline) so bold, lists, headings, links, etc.
	 * round-trip with Case Engine `text` fields.
	 *
	 * READ-ONLY (editable=false):
	 *   - No persistence; content is display-only
	 *
	 * EDIT MODE (editable=true):
	 *   - Toolbar: font size (px), lists, bold/italic/underline/strike, code block — no H1–H3 buttons
	 *   - Emits `change` with updated Markdown on each edit; caller saves to CE
	 *
	 * Legacy notes stored as plain text still render: parsed as Markdown (minimal syntax).
	 *
	 * Props: content — note body (markdown string). title, label, showHeader, editable.
	 * Events: change — (markdown: string)
	 */

	import { createEventDispatcher, getContext } from 'svelte';
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import RichTextInput from '$lib/components/common/RichTextInput.svelte';
	import FormattingButtons from '$lib/components/common/RichTextInput/FormattingButtons.svelte';

	marked.use({
		breaks: true,
		gfm: true
	});

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher<{ change: string }>();

	export let content: string = '';
	export let title: string = '';
	export let label: string = '';
	export let showHeader: boolean = true;
	export let editable: boolean = false;

	let editor = null;

	function noteSpanStyleHook(node: Element, data: { attrName?: string; attrValue?: string; forceKeepAttr?: boolean }) {
		if (data.attrName !== 'style' || node.nodeName !== 'SPAN') return;
		const raw = data.attrValue ?? '';
		const m = raw.match(/font-size\s*:\s*([^;]+)/i);
		if (!m) return;
		const val = m[1].trim();
		if (!/^[\d.]+(px|pt|rem|em)$/i.test(val)) return;
		data.attrValue = `font-size: ${val}`;
		data.forceKeepAttr = true;
	}

	/** Stored CE text → safe HTML for TipTap (view + one-shot edit init). */
	function noteMarkdownToSafeHtml(text: string): string {
		const raw = text.replace(/\r\n?/g, '\n');
		if (!raw.trim()) return '<p></p>';
		const html = marked.parse(raw) as string;
		DOMPurify.addHook('uponSanitizeAttribute', noteSpanStyleHook);
		try {
			return DOMPurify.sanitize(html, { ADD_TAGS: ['span'], ADD_ATTR: ['style'] });
		} finally {
			DOMPurify.removeHook('uponSanitizeAttribute', noteSpanStyleHook);
		}
	}

	let renderedHtml = '';
	$: renderedHtml = content?.trim() ? noteMarkdownToSafeHtml(content) : '';

	$: if (!editable && editor && renderedHtml !== undefined) {
		editor.commands.setContent(renderedHtml || '<p></p>');
	}

	let editInitialized = false;
	$: if (editable && editor && !editInitialized) {
		editor.commands.setContent(noteMarkdownToSafeHtml(content ?? ''));
		editInitialized = true;
	}

	const handleChange = (e: { html: string; json: unknown; md: string }) => {
		if (!editable) return;
		dispatch('change', e.md ?? '');
	};
</script>

<div
	class="flex min-w-0 flex-col {showHeader || editable ? 'min-h-0' : ''} w-full {showHeader ? 'h-full' : ''}"
	data-testid="case-note-editor-shell"
>
	{#if showHeader}
		<div
			class="shrink-0 flex items-center gap-2 border-b border-gray-200 px-3.5 py-2 dark:border-gray-800"
		>
			{#if title}
				<h2 class="flex-1 truncate text-base font-medium text-gray-800 dark:text-gray-100">
					{title}
				</h2>
			{:else}
				<h2 class="flex-1 truncate text-base font-medium italic text-gray-400 dark:text-gray-600">
					{$i18n.t('Untitled')}
				</h2>
			{/if}

			{#if label}
				<span
					class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium
					       bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
				>
					{label}
				</span>
			{/if}

			{#if editable}
				<span
					class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium
					       bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
				>
					{$i18n.t('Editing')}
				</span>
			{:else}
				<span
					class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium
					       bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
				>
					{$i18n.t('Read-only')}
				</span>
			{/if}
		</div>
	{/if}

	{#if editable && editor}
		<div
			class="shrink-0 overflow-x-auto border-b border-gray-200 bg-gray-50/95 dark:border-gray-800 dark:bg-gray-900/50"
			data-testid="case-note-formatting-toolbar"
			aria-label="Text formatting"
		>
			<div class="flex min-w-0 justify-start p-1">
				<FormattingButtons {editor} showHeadings={false} showFontSize={true} />
			</div>
		</div>
	{/if}

	<div
		class="{showHeader || editable
			? 'min-h-0 flex-1 overflow-y-auto'
			: ''} {editable ? 'min-h-[6rem]' : ''} px-2 py-2"
		id="case-note-editor-body"
	>
		{#if content || editable}
			<RichTextInput
				bind:editor
				id="case-note-editor"
				className="input-prose-sm px-0.5 {showHeader ? 'h-full min-h-0' : 'min-h-0'}"
				editable={editable}
				richText={true}
				collaboration={false}
				showFormattingToolbar={false}
				dragHandle={false}
				link={true}
				image={false}
				fileHandler={false}
				onChange={handleChange}
			/>
		{:else}
			<div
				class="flex items-center justify-center py-6 text-sm text-gray-400 dark:text-gray-600 {showHeader
					? 'h-full'
					: ''}"
			>
				{$i18n.t('No content.')}
			</div>
		{/if}
	</div>
</div>
