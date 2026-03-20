/**
 * Logic shared with Chat.svelte `initChatHandler`.
 *
 * OWUI POST /chats/new only applies a client-chosen thread id via top-level `body.id`
 * (see ChatForm.id). Case Engine stores the same value as `external_thread_id`; if we
 * omit it here, the server mints a new UUID and case-scoped proposals fail validation.
 */

export function stableThreadIdForNewChat(
	chatIdProp: string,
	storeChatId: string | undefined | null
): string {
	return `${chatIdProp || storeChatId || ''}`.trim();
}

export type CreateNewChatIdOptionInput = {
	chatIdProp: string;
	storeChatId: string | undefined | null;
	temporaryChatEnabled: boolean;
};

/** Fourth argument to `createNewChat(..., folderId, options)` when persisting a chat. */
export function getCreateNewChatIdOption(
	input: CreateNewChatIdOptionInput
): { id: string } | undefined {
	if (input.temporaryChatEnabled) {
		return undefined;
	}
	const stableThreadId = stableThreadIdForNewChat(input.chatIdProp, input.storeChatId);
	if (!stableThreadId || stableThreadId.startsWith('local:')) {
		return undefined;
	}
	return { id: stableThreadId };
}

/** When false, `initChatHandler` must not rewrite the URL to `/c/:id` (case-embedded chat). */
export function shouldRewriteBrowserUrlToStandaloneChatPath(chatIdProp: string): boolean {
	return !chatIdProp;
}
