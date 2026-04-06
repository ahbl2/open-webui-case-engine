/**
 * P41-44-FU1 — Unit tests for timeline load-more stale-append detection + epoch/finally pattern.
 */
import { describe, it, expect } from 'vitest';
import { isStaleTimelineLoadMoreAppend } from './timelineLoadMoreStaleGuard';

describe('isStaleTimelineLoadMoreAppend (P41-44-FU1)', () => {
	it('returns false when generation and case id are unchanged', () => {
		expect(isStaleTimelineLoadMoreAppend(3, 3, 'case-a', 'case-a')).toBe(false);
	});

	it('returns true when activeEntriesLoadId advanced (superseding loadEntries)', () => {
		expect(isStaleTimelineLoadMoreAppend(2, 5, 'case-a', 'case-a')).toBe(true);
	});

	it('returns true when case id changed (case switch)', () => {
		expect(isStaleTimelineLoadMoreAppend(4, 4, 'case-old', 'case-new')).toBe(true);
	});

	it('returns true when both generation and case differ', () => {
		expect(isStaleTimelineLoadMoreAppend(1, 9, 'a', 'b')).toBe(true);
	});
});

describe('timelineLoadMoreEpoch finally pattern (P41-44-FU1)', () => {
	it('superseded op does not clear isLoadingMore when epoch advanced after start', () => {
		let timelineLoadMoreEpoch = 0;
		let isLoadingMore = false;

		function startLoadMore(): number {
			const myLoadMoreOp = ++timelineLoadMoreEpoch;
			isLoadingMore = true;
			return myLoadMoreOp;
		}

		function finishLoadMore(myLoadMoreOp: number): void {
			if (myLoadMoreOp === timelineLoadMoreEpoch) {
				isLoadingMore = false;
			}
		}

		const op1 = startLoadMore();
		expect(isLoadingMore).toBe(true);
		timelineLoadMoreEpoch += 1;
		finishLoadMore(op1);
		expect(isLoadingMore).toBe(true);
	});

	it('current op clears isLoadingMore when epoch matches at finish', () => {
		let timelineLoadMoreEpoch = 0;
		let isLoadingMore = false;

		function startLoadMore(): number {
			const myLoadMoreOp = ++timelineLoadMoreEpoch;
			isLoadingMore = true;
			return myLoadMoreOp;
		}

		function finishLoadMore(myLoadMoreOp: number): void {
			if (myLoadMoreOp === timelineLoadMoreEpoch) {
				isLoadingMore = false;
			}
		}

		const op = startLoadMore();
		finishLoadMore(op);
		expect(isLoadingMore).toBe(false);
	});

	it('sequential load-more ops each clear when they are the latest', () => {
		let timelineLoadMoreEpoch = 0;
		let isLoadingMore = false;

		function startLoadMore(): number {
			const myLoadMoreOp = ++timelineLoadMoreEpoch;
			isLoadingMore = true;
			return myLoadMoreOp;
		}

		function finishLoadMore(myLoadMoreOp: number): void {
			if (myLoadMoreOp === timelineLoadMoreEpoch) {
				isLoadingMore = false;
			}
		}

		const first = startLoadMore();
		finishLoadMore(first);
		expect(isLoadingMore).toBe(false);

		const second = startLoadMore();
		expect(isLoadingMore).toBe(true);
		finishLoadMore(second);
		expect(isLoadingMore).toBe(false);
	});
});
