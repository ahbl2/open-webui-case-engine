/**
 * Source contract tests — Case Notes workflow labels (no Svelte mount).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const pagePath = join(dirname(fileURLToPath(import.meta.url)), '+page.svelte');

describe('Case Notes workflow UI (+page.svelte)', () => {
	it('surfaces Structure Note as primary workflow action with stable test ids (create + edit only)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/Structure Note/);
		expect(src).toMatch(/case-note-structure-note-action/);
		expect(src).toMatch(/case-note-structure-note-action-edit/);
		expect(src).not.toMatch(/case-note-structure-note-action-view/);
		expect(src).toMatch(/notes-workflow-shimmer/);
	});

	it('does not surface Polish wording as an operator-visible control', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).not.toMatch(/Polish wording/);
		expect(src).not.toMatch(/case-note-ai-wording-assist/);
		expect(src).not.toMatch(/case-note-secondary-ai-actions/);
	});

	it('lists soft-delete from the note browser overflow menu with confirmation wiring', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/case-note-list-overflow-trigger/);
		expect(src).toMatch(/case-note-delete-from-list/);
		expect(src).toMatch(/Delete note/);
		expect(src).toMatch(/showDeleteConfirm/);
		expect(src).toMatch(/Delete note\?/);
	});

	it('note list overflow uses a single real trigger button (asChild + melt) with a usable hit target', () => {
		const src = readFileSync(pagePath, 'utf8');
		const asChildTriggers = src.match(/<DropdownMenu\.Trigger asChild let:builder>/g) ?? [];
		expect(asChildTriggers.length).toBe(2);
		expect(src).toMatch(/use:builder\.action/);
		expect(src).toMatch(/on:pointerdown\|stopPropagation/);
		expect(src).toMatch(/min-h-\[2\.25rem\].*min-w-\[2\.25rem\]/);
		expect(src).toMatch(/pointer-events-none/);
	});

	it('uses deterministic buildAutoNoteTitle for blank user title on save paths', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/import \{ buildAutoNoteTitle \} from '\$lib\/caseNotes\/buildAutoNoteTitle'/);
		expect(src).toMatch(/buildAutoNoteTitle\(text\)/);
	});

	it('blocks empty note body on save with a single operator-facing message', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/NOTE_BODY_REQUIRED_MSG/);
		expect(src).toMatch(/Add note content before saving\./);
	});

	it('does not expose P34 prototype as a default user label in the page source', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).not.toMatch(/P34 Prototype/);
		expect(src).not.toMatch(/👉 Generate Structured Draft/);
	});

	it('P34 legacy prototype preview path removed from Notes UI (superseded by Structure Note)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).not.toMatch(/Legacy preview/);
		expect(src).not.toMatch(/case-note-p34-prototype-panel/);
		expect(src).not.toMatch(/previewP34Prototype/);
	});

	it('P37 Option B — Structure Note orchestrates transient narrative pipeline (no save-first footer)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/structuredNotesTransientNarrativeSource/);
		expect(src).toMatch(/structuredNotesNarrativePipelineNonce/);
		expect(src).toMatch(/handleNarrativeAcceptFromWorkflow/);
		expect(src).toMatch(/handleNarrativeRejectFromWorkflow/);
		expect(src).toMatch(/notesWorkflowSnapshotBeforeStructure/);
		expect(src).toMatch(/narrativePrimaryWorkflow=\{true\}/);
		expect(src).not.toMatch(/case-note-editor-generate-narrative-action-create/);
		expect(src).not.toMatch(/notebookNoteIdForNarrativePreview/);
	});

	it('P37 — narrative full-pane: panel event, reset when structured panel closes, hide duplicate editor branch', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/notesNarrativeReviewFullPane/);
		expect(src).toMatch(/onNarrativePreviewFullPane/);
		expect(src).toMatch(/if \(!structuredNotesVisible\) notesNarrativeReviewFullPane = false/);
		expect(src).toMatch(/\{#if !notesNarrativeReviewFullPane\}/);
		expect(src).toMatch(/data-notes-narrative-full-pane/);
		expect(src).not.toMatch(/case-notes-full-pane-debug-state/);
		expect(src).not.toMatch(/FULL_PANE_STATE/);
		expect(src).not.toMatch(/\[narrative-full-pane parent\] state now=/);
	});

	it('operator cleanup — no floating bottom-right enhance/dev observability cluster', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).not.toMatch(/data-testid="enhance-dev-panels"/);
		expect(src).not.toMatch(/Enhance Audit \(dev\)/);
		expect(src).not.toMatch(/Enhance trace \(dev\)/);
		expect(src).not.toMatch(/Structured draft trace \(dev\)/);
	});

	it('Case Notes sidebar header is Case Notes only (no working-drafts disclaimer)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(
			/<h2 class="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">\s*Case Notes\s*<\/h2>/
		);
		expect(src).not.toMatch(/Working drafts only/);
		expect(src).not.toMatch(/case-notes-disclaimer/);
	});

	it('dictation — mic/Retry use void startDictation() to surface async rejections', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/data-testid="case-note-dictate-action"/);
		expect(src).toMatch(/on:click=\{\(\) => void startDictation\(\)\}/);
	});

	it('Notes Enhance UI removed (no panel, no polishing spinner copy)', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).not.toMatch(/case-note-enhance-panel/);
		expect(src).not.toMatch(/Polishing wording/);
		expect(src).not.toMatch(/enhanceState/);
		expect(src).not.toMatch(/handleEnhance/);
	});

	it('attachment helper copy references Structure Note / narrative, not chat proposals', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/Structure Note/);
		expect(src).not.toMatch(/proposal below/);
	});

	it('composer scroll regions wire file drag/drop to the same attach handlers as the clip control', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/case-note-composer-drop-overlay/);
		expect(src).toMatch(/Drop files to attach/);
		expect(src).toMatch(/createNoteComposerDropHandlers/);
		expect(src).toMatch(/noteComposerDropHandlers\.onDrop/);
		expect(src).toMatch(/attachDraft: \(files\) => void handleAttachFileToDraft\(files\)/);
		expect(src).toMatch(/attachNote: \(files\) => void handleAttachFileToNote\(files\)/);
	});

	it('stabilization: duplicate seeds fresh draft attachment session; cancel create clears draft attachments', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(
			/Fresh draft session \(same as \+ New\) so duplicate does not inherit a prior create attachment session/
		);
		expect(src).toMatch(/Abandon draft-session attachments so the next create\/duplicate does not inherit them/);
	});

	it('stabilization: save and cancel respect attachment upload in-flight; Structure Note pauses during upload', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/disabled=\{creating \|\| attachmentUploading\}/);
		expect(src).toMatch(/disabled=\{saving \|\| attachmentUploading\}/);
		expect(src).toMatch(
			/disabled=\{structuredNotesLoading \|\| structuredNotesActionBusy \|\| attachmentUploading\}/
		);
	});

	it('stabilization: attachment hints mention drop zone; create empty-state copy uses Save note', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/drop files on the note area/);
		expect(src).toMatch(
			/Use 📎 or drop files on the note area to attach\. Process to extract text, then insert into the draft\. <span class="font-medium not-italic">Save note<\/span>/
		);
	});

	it('tooltip audit: aligned overflow menus, Structure Note, attach clip, dictation mic, insert/process hints', () => {
		const src = readFileSync(pagePath, 'utf8');
		const structureTitle =
			'Structure Note: preview extraction and narrative from the editor. Does not save the note.';
		const matches = src.match(new RegExp(structureTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
		expect(matches?.length).toBe(2);
		expect(src).toMatch(/title="More actions for this note"/);
		expect(src).toMatch(/title="Attach files \(choose or drop on note area\)"/);
		expect(src).toMatch(/title="Dictate into the note \(speech to text\)"/);
		expect(src).toMatch(/title="Insert into the note editor \(appends if there is already text\)"/);
		expect(src).not.toMatch(/for use in a note draft or proposal/);
	});

	it('post-delete selection: next-at-same-index, else previous, else idle; no jump to notes[0]', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/visibleBeforeDelete/);
		expect(src).toMatch(/remainingVisible/);
		expect(src).toMatch(/deleteVisibleIndex/);
		expect(src).toMatch(/remainingVisible\[deleteVisibleIndex\]/);
		expect(src).toMatch(/Math\.max\(0, deleteVisibleIndex - 1\)/);
		expect(src).toMatch(/loadNoteAttachments\(nextSelected\.id\)/);
		expect(src).not.toMatch(/selectedNote = notes\.length > 0 \? notes\[0\]/);
	});

	it('post-delete selection leaves selection unchanged when deleted note was not selected', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toMatch(/const wasSelected = selectedNote\?\.id === noteToDelete\.id/);
		expect(src).toMatch(/if \(wasSelected\)/);
	});
});
