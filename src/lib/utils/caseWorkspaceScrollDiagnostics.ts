/**
 * P71-FU4 / P71-FU5 — Dev-only runtime measurements for the case workspace scroll / height chain.
 * Enable: `?caseScrollDiag=1` or `localStorage.setItem('CE_CASE_SCROLL_DIAG','1')` (non-production only).
 * P71-FU5: once `?caseScrollDiag=1` is seen, sessionStorage persists activation across in-app tab clicks
 * (same session) so the query string is not required on every href.
 * Console: `window.__caseWorkspaceScrollDiag?.run()` to re-sample after layout.
 */
import { browser } from '$app/environment';

export type CaseWorkspaceScrollDiagRow = {
	label: string;
	selector: string;
	found: boolean;
	clientHeight: number;
	scrollHeight: number;
	offsetHeight: number;
	overflow: string;
	overflowX: string;
	overflowY: string;
	display: string;
	position: string;
	height: string;
	minHeight: string;
	flexGrow: string;
	flexShrink: string;
	flexBasis: string;
	scrollTop: number;
	scrollableY: boolean;
	note: string;
};

const LS_KEY = 'CE_CASE_SCROLL_DIAG';
const SS_KEY = 'CE_CASE_SCROLL_DIAG_SESSION';
const QS_KEY = 'caseScrollDiag';

/** Persist activation from URL so tab navigation (href without query) does not disable diagnostics. */
function persistCaseScrollDiagFromUrl(): void {
	if (!browser) return;
	try {
		const q = new URLSearchParams(window.location.search).get(QS_KEY);
		if (q === '1' || q === 'true') {
			sessionStorage.setItem(SS_KEY, '1');
		}
	} catch {
		/* ignore */
	}
}

export function shouldRunCaseWorkspaceScrollDiagnostics(): boolean {
	if (!browser) return false;
	if (import.meta.env.PROD) return false;
	persistCaseScrollDiagFromUrl();
	try {
		if (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY) === '1') {
			return true;
		}
	} catch {
		/* ignore */
	}
	try {
		if (sessionStorage.getItem(SS_KEY) === '1') {
			return true;
		}
	} catch {
		/* ignore */
	}
	try {
		const q = new URLSearchParams(window.location.search).get(QS_KEY);
		if (q === '1' || q === 'true') return true;
	} catch {
		/* ignore */
	}
	return false;
}

function measureOne(el: Element | null, label: string, selector: string): CaseWorkspaceScrollDiagRow {
	if (!(el instanceof HTMLElement)) {
		return {
			label,
			selector,
			found: false,
			clientHeight: 0,
			scrollHeight: 0,
			offsetHeight: 0,
			overflow: '',
			overflowX: '',
			overflowY: '',
			display: '',
			position: '',
			height: '',
			minHeight: '',
			flexGrow: '',
			flexShrink: '',
			flexBasis: '',
			scrollTop: 0,
			scrollableY: false,
			note: 'element not found'
		};
	}
	const cs = getComputedStyle(el);
	const oy = cs.overflowY;
	const scrollableY =
		el.scrollHeight > el.clientHeight + 1 && (oy === 'auto' || oy === 'scroll' || oy === 'overlay');
	let note = '';
	if (el.scrollHeight > el.clientHeight + 1 && !(oy === 'auto' || oy === 'scroll' || oy === 'overlay')) {
		note = 'content taller than client but overflow-y not scroll/auto';
	} else if (el.scrollHeight <= el.clientHeight + 1 && (oy === 'auto' || oy === 'scroll')) {
		note = 'overflow-y scroll/auto but no vertical overflow (bounded or empty)';
	}
	return {
		label,
		selector,
		found: true,
		clientHeight: el.clientHeight,
		scrollHeight: el.scrollHeight,
		offsetHeight: el.offsetHeight,
		overflow: cs.overflow,
		overflowX: cs.overflowX,
		overflowY: cs.overflowY,
		display: cs.display,
		position: cs.position,
		height: cs.height,
		minHeight: cs.minHeight,
		flexGrow: cs.flexGrow,
		flexShrink: cs.flexShrink,
		flexBasis: cs.flexBasis,
		scrollTop: el.scrollTop,
		scrollableY,
		note
	};
}

function findRoutePrimaryScroll(main: HTMLElement | null): HTMLElement | null {
	if (!main) return null;
	const selectors = [
		'[data-testid="case-timeline-primary-scroll"]',
		'[data-testid="case-files-primary-scroll"]',
		'[data-testid="case-activity-primary-scroll"]',
		'[data-testid="case-intelligence-primary-scroll"]',
		'[data-testid="proposal-panel-scroll"]',
		'[data-testid="case-notes-view-scroll"]',
		'[data-testid="case-notes-edit-scroll"]',
		'[data-testid="case-notes-create-scroll"]'
	];
	for (const sel of selectors) {
		const n = main.querySelector(sel);
		if (n instanceof HTMLElement) return n;
	}
	return null;
}

function findContentRegion(main: HTMLElement | null): HTMLElement | null {
	if (!main) return null;
	const byClass = main.querySelector('.ce-l-content-region');
	return byClass instanceof HTMLElement ? byClass : null;
}

/** Gather measured rows for the current DOM (browser only). */
export function measureCaseWorkspaceScrollChain(): CaseWorkspaceScrollDiagRow[] {
	if (!browser) return [];
	const html = document.documentElement;
	const body = document.body;
	const appRoot = document.querySelector('.app');
	const mainPane = document.querySelector('[data-testid="app-main-content-pane"]');
	const shell = document.querySelector('[data-testid="case-workspace-shell"]');
	const main = document.querySelector('[data-testid="case-workspace-main"]');
	const mainEl = main instanceof HTMLElement ? main : null;
	const contentRegion = findContentRegion(mainEl);
	const routeScroll = findRoutePrimaryScroll(mainEl);
	const proposalPanel = document.querySelector('[data-testid="proposal-review-panel"]');

	const rows: CaseWorkspaceScrollDiagRow[] = [
		measureOne(html, 'html', ':root / documentElement'),
		measureOne(body, 'body', 'body'),
		measureOne(appRoot, 'div.app (OWUI root)', '.app'),
		measureOne(mainPane, '(app) main content pane', '[data-testid="app-main-content-pane"]'),
		measureOne(shell, 'case-workspace-shell', '[data-testid="case-workspace-shell"]'),
		measureOne(main, 'case-workspace-main', '[data-testid="case-workspace-main"]'),
		measureOne(contentRegion, 'CaseWorkspaceContentRegion (.ce-l-content-region)', '.ce-l-content-region under main'),
		measureOne(routeScroll, 'route primary scroll (first match)', 'timeline|files|activity|intelligence|proposal-panel-scroll|notes-*'),
		measureOne(
			document.querySelector('[data-testid="proposal-panel-scroll"]'),
			'ProposalReviewPanel list viewport',
			'[data-testid="proposal-panel-scroll"]'
		),
		measureOne(
			proposalPanel,
			'ProposalReviewPanel root',
			'[data-testid="proposal-review-panel"]'
		)
	];
	return rows;
}

function diagnose(rows: CaseWorkspaceScrollDiagRow[]): string[] {
	const out: string[] = [];
	const html = rows.find((r) => r.label === 'html');
	const body = rows.find((r) => r.label === 'body');
	const mainPane = rows.find((r) => r.label === '(app) main content pane');
	const shell = rows.find((r) => r.label === 'case-workspace-shell');
	const cwMain = rows.find((r) => r.label === 'case-workspace-main');
	const content = rows.find((r) => r.label === 'CaseWorkspaceContentRegion (.ce-l-content-region)');
	const route = rows.find((r) => r.label === 'route primary scroll (first match)');
	const propScroll = rows.find((r) => r.label === 'ProposalReviewPanel list viewport');

	if (html?.found && html.scrollHeight > html.clientHeight + 1) {
		out.push(
			`html: scrollHeight (${html.scrollHeight}) > clientHeight (${html.clientHeight}) — document may want to scroll.`
		);
	}
	if (body?.found && (body.overflow === 'hidden' || body.overflowY === 'hidden')) {
		out.push('body: overflow hidden — page-level scrolling typically suppressed.');
	}
	const pageScrollCandidate = html?.found && html.scrollHeight > html.clientHeight + 1;
	if (pageScrollCandidate && body?.found && (body.overflowY === 'hidden' || body.overflow === 'hidden')) {
		out.push('Likely: page has overflow but body/html chain suppresses window scroll (check app shell overflow-hidden).');
	}

	const actualScrollOwners = rows.filter((r) => r.found && r.scrollableY).map((r) => r.label);
	if (actualScrollOwners.length) {
		out.push(`Measured scrollable Y (overflow + content): ${actualScrollOwners.join(', ')}`);
	} else {
		out.push('No element in the sampled chain reports scrollableY=true (overflow-y auto/scroll AND scrollHeight > clientHeight).');
	}

	if (route?.found && !route.scrollableY && route.scrollHeight > route.clientHeight + 1) {
		out.push(
			`First broken contract candidate: route primary scroll — content overflows clientHeight but overflow-y is "${route.overflowY}" (expected auto/scroll for intended owner).`
		);
	}
	if (cwMain?.found && cwMain.clientHeight < 80 && shell?.found && shell.clientHeight > 200) {
		out.push(
			`case-workspace-main clientHeight (${cwMain.clientHeight}) very small vs shell (${shell.clientHeight}) — flex/height chain may be collapsed.`
		);
	}
	if (content?.found && content.clientHeight < 80 && cwMain?.found && cwMain.clientHeight > 200) {
		out.push(
			`content region clientHeight (${content.clientHeight}) vs main (${cwMain.clientHeight}) — check min-h-0 / flex-1 on .ce-l-content-region.`
		);
	}
	if (propScroll?.found && !propScroll.scrollableY && propScroll.scrollHeight > propScroll.clientHeight + 1) {
		out.push(
			`Proposals: proposal-panel-scroll has overflow content but is not scrollableY — check overflow-y and parent flex height.`
		);
	}

	if (out.length === 0) {
		out.push('No automatic diagnosis lines; compare scrollHeight vs clientHeight and overflow-y in the table.');
	}
	return out;
}

export function runCaseWorkspaceScrollDiagnostics(): void {
	if (!browser) return;
	if (import.meta.env.PROD) return;
	// eslint-disable-next-line no-console
	console.log(
		'%c[P71-FU4] Diagnostics enabled — running measurements',
		'font-weight:bold;color:#0b84ff'
	);
	const rows = measureCaseWorkspaceScrollChain();
	// eslint-disable-next-line no-console
	console.group('[P71-FU4] case workspace scroll chain (measured)');
	// eslint-disable-next-line no-console
	console.table(
		rows.map((r) => ({
			label: r.label,
			found: r.found,
			clientHeight: r.clientHeight,
			scrollHeight: r.scrollHeight,
			delta: r.scrollHeight - r.clientHeight,
			overflowY: r.overflowY,
			height: r.height,
			minHeight: r.minHeight,
			flex: `${r.flexGrow} ${r.flexShrink} ${r.flexBasis}`,
			scrollableY: r.scrollableY,
			note: r.note
		}))
	);
	for (const line of diagnose(rows)) {
		// eslint-disable-next-line no-console
		console.info('[P71-FU4 diagnosis]', line);
	}
	// eslint-disable-next-line no-console
	console.info(
		'[P71-FU4] Re-run: window.__caseWorkspaceScrollDiag.run() | disable: localStorage.removeItem("CE_CASE_SCROLL_DIAG"); sessionStorage.removeItem("CE_CASE_SCROLL_DIAG_SESSION")'
	);
	// eslint-disable-next-line no-console
	console.groupEnd();

	(window as unknown as { __caseWorkspaceScrollDiag?: { rows: CaseWorkspaceScrollDiagRow[]; run: () => void } }).__caseWorkspaceScrollDiag = {
		rows,
		run: runCaseWorkspaceScrollDiagnostics
	};
}
