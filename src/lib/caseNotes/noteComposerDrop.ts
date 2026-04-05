/**
 * Case Notes composer — HTML5 file drag/drop helpers.
 * Keeps drop-target UI and routing next to the Notes page; logic is unit-tested in isolation.
 */

export function dataTransferHasFiles(dt: DataTransfer | null): boolean {
	if (!dt?.types) return false;
	for (let i = 0; i < dt.types.length; i++) {
		if (dt.types[i] === 'Files') return true;
	}
	return false;
}

function isDomNode(t: EventTarget | null): t is Node {
	return (
		t !== null &&
		typeof t === 'object' &&
		'nodeType' in t &&
		typeof (t as { nodeType: unknown }).nodeType === 'number'
	);
}

/** True if the pointer is moving from `currentTarget` into a descendant (stay "inside" the drop zone). */
export function composerDragLeaveToDescendant(
	currentTarget: HTMLElement,
	relatedTarget: EventTarget | null
): boolean {
	if (!isDomNode(relatedTarget)) return false;
	return currentTarget.contains(relatedTarget);
}

export interface NoteComposerDropHandlersConfig {
	isCreateMode: () => boolean;
	attachDraft: (files: FileList | null) => void | Promise<void>;
	attachNote: (files: FileList | null) => void | Promise<void>;
	setDropActive: (active: boolean) => void;
}

/**
 * Handlers for a single composer drop zone (create or edit scroll region).
 * Drop routes to the same attach entry points as the clip / file input controls.
 */
export function createNoteComposerDropHandlers(config: NoteComposerDropHandlersConfig) {
	function onDragEnter(e: DragEvent) {
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		config.setDropActive(true);
	}

	function onDragLeave(e: DragEvent) {
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		const el = e.currentTarget as HTMLElement;
		if (composerDragLeaveToDescendant(el, e.relatedTarget)) return;
		config.setDropActive(false);
	}

	function onDragOver(e: DragEvent) {
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
	}

	function onDrop(e: DragEvent) {
		if (!dataTransferHasFiles(e.dataTransfer)) return;
		e.preventDefault();
		e.stopPropagation();
		config.setDropActive(false);
		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;
		if (config.isCreateMode()) {
			void config.attachDraft(files);
		} else {
			void config.attachNote(files);
		}
	}

	return { onDragEnter, onDragLeave, onDragOver, onDrop };
}
