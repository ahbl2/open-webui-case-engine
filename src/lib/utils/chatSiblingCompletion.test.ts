import { describe, it, expect } from 'vitest';
import { markSiblingResponseMessagesDone, finalizeAssistantStopState } from './chatSiblingCompletion';

describe('markSiblingResponseMessagesDone (P19.75-04)', () => {
	it('does not throw when currentId is absent from messages (stale currentId)', () => {
		const messages = {
			u1: { parentId: null, childrenIds: ['a1'] },
			a1: { parentId: 'u1', childrenIds: [], done: false }
		};
		expect(() => markSiblingResponseMessagesDone(messages, 'missing-id')).not.toThrow();
		expect(messages.a1?.done).toBe(false);
	});

	it('does not throw when response message exists but parent is missing', () => {
		const messages = {
			orphan: { parentId: 'gone', childrenIds: [], done: false }
		};
		expect(() => markSiblingResponseMessagesDone(messages, 'orphan')).not.toThrow();
	});

	it('marks sibling assistant messages done when parent and childrenIds are valid', () => {
		const messages = {
			u1: { parentId: null, childrenIds: ['a1', 'a2'] },
			a1: { parentId: 'u1', childrenIds: [], done: false },
			a2: { parentId: 'u1', childrenIds: [], done: false }
		};
		markSiblingResponseMessagesDone(messages, 'a1');
		expect(messages.a1?.done).toBe(true);
		expect(messages.a2?.done).toBe(true);
	});
});

describe('finalizeAssistantStopState (P19.75-06)', () => {
	it('marks assistant done even when parent chain is missing (sibling step no-ops)', () => {
		const messages = {
			a1: { parentId: 'missing', role: 'assistant' as const, childrenIds: [], done: false }
		};
		finalizeAssistantStopState(messages, 'a1');
		expect(messages.a1?.done).toBe(true);
	});

	it('marks assistant done when taskIds would be empty but stream is active', () => {
		const messages = {
			u1: { parentId: null, childrenIds: ['a1'], role: 'user' as const },
			a1: { parentId: 'u1', role: 'assistant' as const, childrenIds: [], done: false }
		};
		finalizeAssistantStopState(messages, 'a1');
		expect(messages.a1?.done).toBe(true);
	});
});
