/**
 * Regression: case-scoped chat must call `createNewChat` with top-level `{ id }` (4th argument)
 * so OWUI persists the same thread id Case Engine bound. Otherwise proposals fail with
 * "Thread is not an active association for case".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	getCreateNewChatIdOption,
	shouldRewriteBrowserUrlToStandaloneChatPath
} from '$lib/utils/chatThreadCreateOptions';

vi.mock('$lib/apis/chats', async (importOriginal) => {
	const mod = await importOriginal<typeof import('$lib/apis/chats')>();
	return {
		...mod,
		createNewChat: vi.fn().mockResolvedValue({
			id: '550e8400-e29b-41d4-a716-446655440000'
		})
	};
});

import { createNewChat } from '$lib/apis/chats';

const CASE_THREAD_ID = '550e8400-e29b-41d4-a716-446655440000';

/** Mirrors Chat.svelte `initChatHandler` → `createNewChat` call shape (non-temp path). */
async function invokeCreateNewChatLikeInitHandler(
	chatIdProp: string,
	storeChatId: string | undefined | null,
	temporaryChatEnabled: boolean
): Promise<void> {
	const createIdOption = getCreateNewChatIdOption({
		chatIdProp,
		storeChatId,
		temporaryChatEnabled
	});
	await createNewChat(
		'test-token',
		{ title: 'New Chat', history: { messages: {}, currentId: null } },
		null,
		createIdOption
	);
}

beforeEach(() => {
	vi.mocked(createNewChat).mockClear();
});

describe('getCreateNewChatIdOption (initChatHandler contract)', () => {
	it('case-scoped chat passes stable thread id as 4th argument', async () => {
		await invokeCreateNewChatLikeInitHandler(CASE_THREAD_ID, undefined, false);

		expect(createNewChat).toHaveBeenCalledTimes(1);
		const args = vi.mocked(createNewChat).mock.calls[0];
		expect(args[3]).toEqual({ id: CASE_THREAD_ID });
	});

	it('prefers chatIdProp when store chat id differs', async () => {
		await invokeCreateNewChatLikeInitHandler(CASE_THREAD_ID, 'wrong-id', false);
		expect(vi.mocked(createNewChat).mock.calls[0][3]).toEqual({ id: CASE_THREAD_ID });
	});

	it('temporary chat does not pass id option', async () => {
		await invokeCreateNewChatLikeInitHandler(CASE_THREAD_ID, CASE_THREAD_ID, true);
		expect(vi.mocked(createNewChat).mock.calls[0][3]).toBeUndefined();
	});

	it('local: store id does not pass id option (temp-style id)', async () => {
		await invokeCreateNewChatLikeInitHandler('', 'local:socket-1', false);
		expect(vi.mocked(createNewChat).mock.calls[0][3]).toBeUndefined();
	});

	it('no chatIdProp and no store id does not pass id option', async () => {
		await invokeCreateNewChatLikeInitHandler('', undefined, false);
		expect(vi.mocked(createNewChat).mock.calls[0][3]).toBeUndefined();
	});

	it('direct: case context returns { id }', () => {
		expect(
			getCreateNewChatIdOption({
				chatIdProp: CASE_THREAD_ID,
				storeChatId: undefined,
				temporaryChatEnabled: false
			})
		).toEqual({ id: CASE_THREAD_ID });
	});
});

describe('shouldRewriteBrowserUrlToStandaloneChatPath (replaceState guard)', () => {
	it('when chatIdProp is set, do not rewrite URL to /c/...', () => {
		expect(shouldRewriteBrowserUrlToStandaloneChatPath(CASE_THREAD_ID)).toBe(false);
	});

	it('when chatIdProp is empty, standalone flow may rewrite to /c/...', () => {
		expect(shouldRewriteBrowserUrlToStandaloneChatPath('')).toBe(true);
	});
});
