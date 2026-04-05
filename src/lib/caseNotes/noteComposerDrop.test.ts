import { describe, expect, it, vi } from 'vitest';
import {
	composerDragLeaveToDescendant,
	createNoteComposerDropHandlers,
	dataTransferHasFiles
} from './noteComposerDrop';

function mockDataTransfer(opts: { hasFilesType: boolean; files?: FileList | null }): DataTransfer {
	const types = opts.hasFilesType ? (['Files'] as unknown as DOMStringList) : ([] as unknown as DOMStringList);
	return {
		types,
		files: opts.files ?? null,
		dropEffect: 'none'
	} as DataTransfer;
}

function makeDragEvent(init: {
	type: string;
	currentTarget: HTMLElement;
	relatedTarget?: EventTarget | null;
	dataTransfer?: DataTransfer | null;
}): DragEvent {
	let defaultPrevented = false;
	const ev = {
		type: init.type,
		dataTransfer: init.dataTransfer ?? null,
		relatedTarget: init.relatedTarget ?? null,
		currentTarget: init.currentTarget,
		get defaultPrevented() {
			return defaultPrevented;
		},
		preventDefault() {
			defaultPrevented = true;
		},
		stopPropagation: vi.fn()
	};
	return ev as unknown as DragEvent;
}

describe('noteComposerDrop', () => {
	it('dataTransferHasFiles detects Files type', () => {
		const empty = mockDataTransfer({ hasFilesType: false });
		expect(dataTransferHasFiles(empty)).toBe(false);
		const withFiles = mockDataTransfer({ hasFilesType: true });
		expect(dataTransferHasFiles(withFiles)).toBe(true);
	});

	it('composerDragLeaveToDescendant is true when relatedTarget is inside currentTarget', () => {
		const inner = { nodeType: 1 } as unknown as Node;
		const outer = { contains: (n: Node) => n === inner } as unknown as HTMLElement;
		expect(composerDragLeaveToDescendant(outer, inner)).toBe(true);
	});

	it('composerDragLeaveToDescendant is false when relatedTarget is outside', () => {
		const a = { contains: () => false } as unknown as HTMLElement;
		const b = { nodeType: 1 } as unknown as Node;
		expect(composerDragLeaveToDescendant(a, b)).toBe(false);
	});

	it('dragenter sets drop active for file drags', () => {
		const setDropActive = vi.fn();
		const h = createNoteComposerDropHandlers({
			isCreateMode: () => true,
			attachDraft: vi.fn(),
			attachNote: vi.fn(),
			setDropActive
		});
		const zone = { contains: () => false } as unknown as HTMLElement;
		const dt = mockDataTransfer({ hasFilesType: true });
		const ev = makeDragEvent({ type: 'dragenter', currentTarget: zone, dataTransfer: dt });
		h.onDragEnter(ev);
		expect(setDropActive).toHaveBeenCalledWith(true);
		expect(ev.defaultPrevented).toBe(true);
	});

	it('dragleave clears drop active when leaving the zone (not into a child)', () => {
		const setDropActive = vi.fn();
		const h = createNoteComposerDropHandlers({
			isCreateMode: () => true,
			attachDraft: vi.fn(),
			attachNote: vi.fn(),
			setDropActive
		});
		const zone = { contains: () => false } as unknown as HTMLElement;
		const dt = mockDataTransfer({ hasFilesType: true });
		const outside = { nodeType: 1 } as unknown as Node;
		const ev = makeDragEvent({
			type: 'dragleave',
			currentTarget: zone,
			dataTransfer: dt,
			relatedTarget: outside
		});
		h.onDragLeave(ev);
		expect(setDropActive).toHaveBeenCalledWith(false);
	});

	it('dragleave does not clear when moving into a descendant of the zone', () => {
		const setDropActive = vi.fn();
		const h = createNoteComposerDropHandlers({
			isCreateMode: () => true,
			attachDraft: vi.fn(),
			attachNote: vi.fn(),
			setDropActive
		});
		const child = { nodeType: 1 } as unknown as Node;
		const zone = { contains: (n: Node | null) => n === child } as unknown as HTMLElement;
		const dt = mockDataTransfer({ hasFilesType: true });
		const ev = makeDragEvent({
			type: 'dragleave',
			currentTarget: zone,
			dataTransfer: dt,
			relatedTarget: child
		});
		h.onDragLeave(ev);
		expect(setDropActive).not.toHaveBeenCalled();
	});

	it('drop prevents default and calls attachDraft in create mode', () => {
		const file = new File(['a'], 'one.txt', { type: 'text/plain' });
		const files = [file] as unknown as FileList;
		Object.defineProperty(files, 'length', { value: 1 });
		const attachDraft = vi.fn();
		const attachNote = vi.fn();
		const setDropActive = vi.fn();
		const h = createNoteComposerDropHandlers({
			isCreateMode: () => true,
			attachDraft,
			attachNote,
			setDropActive
		});
		const zone = { contains: () => false } as unknown as HTMLElement;
		const dt = mockDataTransfer({ hasFilesType: true, files });
		const ev = makeDragEvent({ type: 'drop', currentTarget: zone, dataTransfer: dt });
		h.onDrop(ev);
		expect(ev.defaultPrevented).toBe(true);
		expect(setDropActive).toHaveBeenCalledWith(false);
		expect(attachDraft).toHaveBeenCalledTimes(1);
		expect(attachDraft.mock.calls[0][0]).toBe(files);
		expect(attachNote).not.toHaveBeenCalled();
	});

	it('drop calls attachNote in edit mode', () => {
		const file = new File(['b'], 'two.txt', { type: 'text/plain' });
		const files = [file] as unknown as FileList;
		Object.defineProperty(files, 'length', { value: 1 });
		const attachDraft = vi.fn();
		const attachNote = vi.fn();
		const h = createNoteComposerDropHandlers({
			isCreateMode: () => false,
			attachDraft,
			attachNote,
			setDropActive: vi.fn()
		});
		const zone = { contains: () => false } as unknown as HTMLElement;
		const dt = mockDataTransfer({ hasFilesType: true, files });
		const ev = makeDragEvent({ type: 'drop', currentTarget: zone, dataTransfer: dt });
		h.onDrop(ev);
		expect(attachNote).toHaveBeenCalledTimes(1);
		expect(attachNote.mock.calls[0][0]).toBe(files);
		expect(attachDraft).not.toHaveBeenCalled();
	});
});
