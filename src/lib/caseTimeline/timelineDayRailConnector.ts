/**
 * Vertical blue connector for the same operational day: segments **between** emblems (not through
 * circles), plus a tail from the last emblem to the **bottom of the last row** (see mockup).
 */
import type { Action } from 'svelte/action';

/** Space between line end and emblem edge (px). */
const EMBLEM_GAP_PX = 6;

const SEGMENT_CLASS = 'ce-timeline-day-rail-line-segment';

function clearSegments(wrapper: HTMLElement): void {
	wrapper.replaceChildren();
}

/** `yStartVp` / `yEndVp` are viewport Y coordinates; segment fills [yStart, yEnd). */
function addSegment(
	wrapper: HTMLElement,
	cx: number,
	yStartVp: number,
	yEndVp: number,
	rootTopVp: number
): void {
	const t = yStartVp - rootTopVp;
	const h = yEndVp - yStartVp;
	if (h <= 0.5) return;
	const seg = document.createElement('div');
	seg.className = SEGMENT_CLASS;
	seg.style.top = `${t}px`;
	seg.style.height = `${h}px`;
	seg.style.left = `${cx}px`;
	wrapper.appendChild(seg);
}

function updateLines(container: HTMLElement, wrapper: HTMLElement): void {
	const emblems = container.querySelectorAll<HTMLElement>('[data-testid="timeline-entry-rail-emblem"]');
	clearSegments(wrapper);

	if (emblems.length === 0) {
		wrapper.style.display = 'none';
		return;
	}
	wrapper.style.display = 'block';

	const root = container.getBoundingClientRect();
	const firstEl = emblems[0];
	const cx = firstEl.getBoundingClientRect().left + firstEl.getBoundingClientRect().width / 2 - root.left;

	const firstLi = firstEl.closest('li');
	const dateEl = firstLi?.querySelector<HTMLElement>('[data-testid="timeline-entry-rail-date"]');
	const lastEm = emblems[emblems.length - 1];
	const lastLi = lastEm.closest('li');
	if (!lastLi) {
		wrapper.style.display = 'none';
		return;
	}

	/** Y coordinates in viewport space */
	const y = (el: Element) => el.getBoundingClientRect();

	// ── Segment from below date / top of row to just above first emblem ─────────
	const firstEm = y(firstEl);
	const startTop = dateEl
		? y(dateEl).bottom
		: firstLi
			? y(firstLi).top
			: firstEm.top;
	const endAboveFirst = firstEm.top - EMBLEM_GAP_PX;
	if (endAboveFirst > startTop + 0.5) {
		addSegment(wrapper, cx, startTop, endAboveFirst, root.top);
	}

	// ── Gaps between consecutive emblems (line does not pass through circles) ────
	for (let i = 0; i < emblems.length - 1; i++) {
		const a = y(emblems[i]);
		const b = y(emblems[i + 1]);
		const segTop = a.bottom + EMBLEM_GAP_PX;
		const segEnd = b.top - EMBLEM_GAP_PX;
		if (segEnd > segTop + 0.5) {
			addSegment(wrapper, cx, segTop, segEnd, root.top);
		}
	}

	// ── Tail: from just below last emblem to bottom of that entry row ───────────
	const lastEmBox = y(lastEm);
	const lastLiBox = y(lastLi);
	const tailTop = lastEmBox.bottom + EMBLEM_GAP_PX;
	const tailEnd = lastLiBox.bottom;
	if (tailEnd > tailTop + 0.5) {
		addSegment(wrapper, cx, tailTop, tailEnd, root.top);
	}
}

export const timelineDayRailConnector: Action<HTMLElement> = (container) => {
	let wrapper = container.querySelector<HTMLElement>('.ce-timeline-day-rail-line');
	if (!wrapper) {
		wrapper = document.createElement('div');
		wrapper.className = 'ce-timeline-day-rail-line';
		wrapper.setAttribute('aria-hidden', 'true');
		container.prepend(wrapper);
	}

	const run = (): void => {
		requestAnimationFrame(() => updateLines(container, wrapper!));
	};

	run();

	const ro = new ResizeObserver(run);
	ro.observe(container);

	const mo = new MutationObserver(run);
	mo.observe(container, { childList: true });

	return {
		destroy() {
			ro.disconnect();
			mo.disconnect();
			wrapper.remove();
		}
	};
};
