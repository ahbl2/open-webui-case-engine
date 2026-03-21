/**
 * P19.75-04: When `history.currentId` is stale (Escape/cancel during transitions, async races),
 * `history.messages[currentId]` can be missing. Code that read `responseMessage.parentId` then threw:
 * "Cannot read properties of undefined (reading 'parentId')".
 *
 * This helper marks sibling assistant messages as done only when the graph is consistent.
 */
export type SiblingDoneMessage = {
	parentId?: string | null;
	done?: boolean;
	childrenIds?: string[];
	role?: string;
};

export function markSiblingResponseMessagesDone(
	messages: Record<string, SiblingDoneMessage | undefined>,
	currentId: string | null | undefined
): void {
	if (!currentId) return;
	const responseMessage = messages[currentId];
	if (!responseMessage?.parentId) return;
	const parent = messages[responseMessage.parentId];
	if (!parent) return;
	for (const messageId of parent.childrenIds ?? []) {
		const m = messages[messageId];
		if (m) m.done = true;
	}
}

/**
 * P19.75-06: After P19.75-04, sibling marking alone could leave the active assistant
 * without `done: true` when `taskIds` was empty (race before task_id) or when the
 * parent/childrenIds graph did not match. Always mark the current assistant done when stopping.
 */
export function finalizeAssistantStopState(
	messages: Record<string, SiblingDoneMessage | undefined>,
	currentId: string | null | undefined
): void {
	markSiblingResponseMessagesDone(messages, currentId);
	const m = currentId ? messages[currentId] : undefined;
	if (m?.role === 'assistant') {
		m.done = true;
	}
}
