/**
 * P38-04 — Case Files drag/drop helpers (entry-method parity with file picker).
 * Keeps file-type detection testable without mounting Svelte.
 */
export function dataTransferHasFiles(dt: DataTransfer | null | undefined): boolean {
	if (!dt?.types) return false;
	// DOM `DataTransfer.types` is a DOMStringList / string[]; `Files` is the standard type for file drags.
	for (let i = 0; i < dt.types.length; i += 1) {
		if (dt.types[i] === 'Files') return true;
	}
	return false;
}
