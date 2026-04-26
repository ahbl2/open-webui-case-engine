/**
 * P43-05 / P43-06 — Proposals panel wiring contracts (static source checks).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelPath = join(process.cwd(), 'src/lib/components/proposals/ProposalReviewPanel.svelte');
const proposalCardPath = join(process.cwd(), 'src/lib/components/proposals/ProposalCard.svelte');
const proposalsPagePath = join(process.cwd(), 'src/routes/(app)/case/[id]/proposals/+page.svelte');
const chatPath = join(process.cwd(), 'src/routes/(app)/case/[id]/chat/+page.svelte');
const guardUtilPath = join(process.cwd(), 'src/lib/utils/proposalDocumentIngestEditGuard.ts');

describe('ProposalReviewPanel — P43-05 document-ingest unsaved guard', () => {
	it('implements dirty guard, dual load paths, SPA nav intercept, and tri-action dialog', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('export function guardBeforeHide()');
		expect(src).toContain('beforeNavigate(');
		expect(src).toContain('executeLoadProposals');
		expect(src).toContain('runWithDocEditGuard');
		expect(src).toContain('persistDocumentIngestEdit');
		expect(src).toContain('data-testid="doc-edit-unsaved-dialog"');
		expect(src).toContain('data-testid="doc-edit-unsaved-cancel"');
		expect(src).toContain('data-testid="doc-edit-unsaved-discard"');
		expect(src).toContain('data-testid="doc-edit-unsaved-save"');
		expect(src).toContain('hasDirtyDocumentIngestEdits');
		expect(src).toContain('isDocumentIngestEditDirtyForProposal');
	});

	it('keeps list refetch guarded (loadProposals) via visibility + invalidation, not raw execute', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('onProposalsListVisibilityRefetch');
		expect(src).toContain('CASE_PROPOSALS_INVALIDATE_EVENT');
		expect(src).toMatch(/void loadProposals\(\)/);
		expect(src).not.toContain('data-testid="proposals-refresh-btn"');
	});
});

describe('Case Chat — P43-05 ProposalReviewPanel hide guard', () => {
	it('binds panel ref and uses guarded tool tab / panel toggle', () => {
		const src = readFileSync(chatPath, 'utf8');
		expect(src).toContain('bind:this={proposalPanelRef}');
		expect(src).toContain('guardBeforeHide');
		expect(src).toContain('setCaseToolTab');
		expect(src).toContain('toggleCaseToolsPanel');
	});
});

describe('proposalDocumentIngestEditGuard utility', () => {
	it('exports deterministic dirty helpers for P43-05', () => {
		const src = readFileSync(guardUtilPath, 'utf8');
		expect(src).toContain('documentIngestEditFieldsFromPayload');
		expect(src).toContain('isDocumentIngestEditDirtyForProposal');
	});
});

describe('ProposalReviewPanel — P43-06 invalid-200 list (I-02)', () => {
	it('does not show empty-queue copy when loadError is set (avoids false-empty)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('!loadError && activeProposals.length === 0');
	});
});

describe('ProposalReviewPanel — P43-07 overlapping load (I-03)', () => {
	it('uses monotonic load id and context checks after paginated fetch (CaseFilesTab pattern)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('activeProposalsLoadId');
		expect(src).toContain('const loadId = activeProposalsLoadId');
		expect(src).toContain('if (loadId !== activeProposalsLoadId) return');
		expect(src).toContain('if (caseId !== loadCaseId || token !== loadToken) return');
		expect(src).toContain('if (loadId === activeProposalsLoadId) loading = false');
		expect(src).toContain('const loadTab = activeTab');
		expect(src).toContain('typeFilter !== loadType');
		expect(src).toContain('listSearchApplied !== loadSearchApplied');
	});
});

describe('ProposalReviewPanel — P43-10 proposals search', () => {
	it('exposes minimal search row, applied-query guard, and distinct empty-search copy', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="proposals-search-input"');
		expect(src).toContain('data-testid="proposals-search-submit"');
		expect(src).toContain('data-testid="proposals-search-clear"');
		expect(src).toContain('data-testid="empty-search-no-results"');
		expect(src).toContain('loadSearchApplied');
		expect(src).toContain('applyProposalSearch');
		expect(src).toContain('clearProposalSearch');
	});
});

describe('ProposalReviewPanel — P45-04 search scope copy', () => {
	it('documents tab-specific scope hint and placeholder without changing search guards', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="proposals-search-scope-hint"');
		expect(src).toContain('Search proposal text (this tab, Type applies)');
		expect(src).toContain('loadSearchApplied');
	});
});

describe('ProposalReviewPanel — P45-05 empty-state messaging', () => {
	it('keeps empty-state branches and refines queue vs search copy', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="empty-state"');
		expect(src).toContain('data-testid="empty-state-panel"');
		expect(src).toContain('data-testid="empty-search-no-results"');
		expect(src).toContain('P128_EMPTY_PANEL_TITLE_SEARCH');
		expect(src).toContain('Loading proposals for this case');
		expect(src).toContain('P128_EMPTY_PANEL_TITLE_PENDING');
		expect(src).toContain('data-testid="empty-state-create-proposal"');
	});

	it('Proposals route clarifies Case Engine gate when token missing', () => {
		const src = readFileSync(proposalsPagePath, 'utf8');
		expect(src).toContain('Case Engine connection required to load proposals for this case');
	});
});

describe('ProposalReviewPanel — P43-10-FU1 status-tab scroll and first page', () => {
	it('uses selectProposalStatusTab for tab buttons, scroll helper, and first-page load scroll', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('selectProposalStatusTab');
		expect(src).toContain('scrollProposalListPortToTop');
		expect(src).toContain('proposalListViewportEl');
		expect(src).toContain('bind:this={proposalListViewportEl}');
		expect(src).toMatch(/on:click=\{\(\)\s*=>\s*void\s+selectProposalStatusTab\('pending'\)\}/);
		expect(src).toMatch(/on:click=\{\(\)\s*=>\s*void\s+selectProposalStatusTab\('approved'\)\}/);
		expect(src).toMatch(/on:click=\{\(\)\s*=>\s*void\s+selectProposalStatusTab\('rejected'\)\}/);
		expect(src).toMatch(/on:click=\{\(\)\s*=>\s*void\s+selectProposalStatusTab\('committed'\)\}/);
		expect(src).toContain("if (next === 'rejected' || next === 'committed')");
		expect(src).toContain('await tick()');
		expect(src).toContain('await loadProposals()');
	});

	it('status tab switch defers activeTab until document-ingest guard passes (P44-05), then uses guarded loadProposals', () => {
		const src = readFileSync(panelPath, 'utf8');
		const idx = src.indexOf('async function selectProposalStatusTab');
		expect(idx).toBeGreaterThan(-1);
		const fn = src.slice(idx, idx + 900);
		expect(fn).toContain('runWithDocEditGuard');
		expect(fn).toContain('await loadProposals()');
		expect(fn).not.toContain('void loadProposals()');
	});
});

describe('ProposalReviewPanel — P43-08 server pagination contract', () => {
	it('loads via listProposalsPaginated with initial + load-more chunk sizes', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('listProposalsPaginated');
		expect(src).toContain('PROPOSALS_TAB_PAGE_SIZE');
		expect(src).toContain('PROPOSALS_LOAD_MORE_CHUNK');
		expect(src).toContain('offset: 0');
		expect(src).toContain('totalsByStatus');
		expect(src).not.toContain('data-testid="proposals-page-prev"');
	});
});

describe('ProposalReviewPanel — P45-02 workflow vs outcome tab grouping', () => {
	it('wraps workflow tabs, divider, and outcome tab in grouped containers', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="proposal-tabs-workflow-group"');
		expect(src).toContain('data-testid="proposal-tabs-outcome-group"');
		expect(src).toContain('data-testid="proposal-tabs-workflow-outcome-divider"');
		expect(src).toMatch(/proposal-tabs-workflow-group[\s\S]*tab-pending[\s\S]*proposal-tabs-workflow-outcome-divider[\s\S]*proposal-tabs-outcome-group[\s\S]*tab-committed/);
	});
});

describe('ProposalReviewPanel — P45-08 control order', () => {
	it('renders status cards, authority banner, tabs, then type+search in toolbar', () => {
		const src = readFileSync(panelPath, 'utf8');
		const statusSummary = src.indexOf('data-testid="proposals-status-summary"');
		const auth = src.indexOf('data-testid="proposals-authority-banner"');
		const tabPending = src.indexOf('data-testid="tab-pending"');
		const typeFilter = src.indexOf('data-testid="proposal-type-filter"');
		const searchRow = src.indexOf('data-testid="proposals-search-row"');
		expect(statusSummary).toBeGreaterThan(-1);
		expect(auth).toBeGreaterThan(statusSummary);
		expect(tabPending).toBeGreaterThan(auth);
		expect(typeFilter).toBeGreaterThan(tabPending);
		expect(searchRow).toBeGreaterThan(-1);
		expect(typeFilter).toBeGreaterThan(searchRow);
	});
});

describe('ProposalReviewPanel — P45-10 search-row layout stability', () => {
	it('wraps search in always-present filter toolbar with tab-off placeholder', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="proposals-search-region"');
		expect(src).toContain('data-testid="proposals-search-placeholder"');
		expect(src).toContain('DS_PROPOSALS_CLASSES.filterToolbar');
		const region = src.indexOf('data-testid="proposals-search-region"');
		const row = src.indexOf('data-testid="proposals-search-row"');
		const ph = src.indexOf('data-testid="proposals-search-placeholder"');
		expect(region).toBeGreaterThan(-1);
		expect(row).toBeGreaterThan(region);
		expect(ph).toBeGreaterThan(region);
	});
});

describe('ProposalReviewPanel — P45-11 tooltips (native title)', () => {
	it('carries intentional titles on workflow tabs, filters, search actions, bulk reject, expand, AI revise, reject, load-more, and thread lineage', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Pending — proposals awaiting review/);
		expect(src).toMatch(/Approved — human-reviewed staging only/);
		expect(src).toMatch(/Rejected — removed from the review workflow/);
		expect(src).toContain('Committed — outcome already saved to the case record');
		expect(src).toMatch(/Limit the list to all proposal types/);
		expect(src).toMatch(/Apply search: server-side case-insensitive substring/);
		expect(src).toMatch(/Clear applied search and reload the full list/);
		expect(src).toMatch(/Reject selected pending proposals \(requires reason/);
		const cardSrcP45 = readFileSync(proposalCardPath, 'utf8');
		expect(
			(src + cardSrcP45).match(
				/Show or hide full payload, editors, and technical details|Open full content and details for review/
			)
		).toBeTruthy();
		expect(src).toMatch(/Model-assisted revision for this chat-intake proposal/);
		const cardSrcReject = readFileSync(proposalCardPath, 'utf8');
		expect(
			(src + '\n' + cardSrcReject).match(
				/Reject this pending proposal with a required reason|Reject this candidate \(workflow only/
			)
		).toBeTruthy();
		expect(src).toMatch(/Load the next page of proposals/);
		expect(src).toMatch(/Sourced from a personal\/desktop thread linked to this case/);
		expect(src).toMatch(/Sourced from this case’s scoped chat thread/);
		expect(src).toMatch(
			/Submit bulk rejection with the reason above \(workflow only; not on the official case record\)/
		);
		expect(src).toMatch(
			/Submit rejection with the reason above \(workflow only; not committed to the official record\)/
		);
	});
});

describe('ProposalReviewPanel — P45-01 approved vs committed terminology', () => {
	it('exposes single authority banner and preserves Approved/Accepted + committed-to-timeline tab', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="proposals-authority-banner"');
		expect(src).toContain('P128_PROPOSALS_AUTHORITY_BANNER');
		expect(src).toContain('data-testid="tab-approved"');
		expect(src).toMatch(/\{!p128Presentation \? 'Approved' : 'Accepted'\}\{approvedCount/);
		expect(src).toContain('Committed to');
	});

	it('Proposals route mounts P128 intake framing and proposal review panel', () => {
		const src = readFileSync(proposalsPagePath, 'utf8');
		expect(src).toContain('CaseProposalFraming');
		expect(src).toContain('ProposalReviewPanel');
		expect(src).toContain('getRouteCaseIdString');
	});
});

describe('ProposalReviewPanel — P45-09 doctrine de-duplication', () => {
	it('uses single authority banner in panel and P128 list toolbar label in compact header', () => {
		const panel = readFileSync(panelPath, 'utf8');
		const page = readFileSync(proposalsPagePath, 'utf8');
		expect(panel).toMatch(/Review queue/);
		expect(panel).toContain('P128_LIST_TOOLBAR_LABEL');
		expect(panel).not.toContain('Review queue — staging until commit');
		expect(panel).toContain('P128_PROPOSALS_AUTHORITY_BANNER');
		expect(panel).not.toMatch(/review queues only\./);
		expect(page).not.toContain('Governed intake from chat and other sources');
	});
});

describe('ProposalReviewPanel — P43-10-FU2 Timeline-style incremental loading', () => {
	it('implements append load-more, sentinel, stale guard import, and guarded replace vs unguarded append', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('executeLoadMoreProposals');
		expect(src).toContain('isStaleProposalsLoadMoreAppend');
		expect(src).toContain('proposalsLoadMoreEpoch');
		expect(src).toContain('IntersectionObserver');
		expect(src).toContain('data-testid="proposals-scroll-sentinel"');
		expect(src).toContain('data-testid="proposals-load-more-btn"');
		expect(src).toContain('data-testid="proposals-load-more-error"');
		expect(src).toContain('data-testid="proposals-list-progress"');
		expect(src).toContain('hasMore');
		expect(src).toContain('appendBaseLen');
		expect(src).toContain('page.offset !== appendBaseLen');
	});
});
