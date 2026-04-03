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
});
