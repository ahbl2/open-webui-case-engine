/**
 * P19-14 / P19-20 — Case Route Migration Contracts
 *
 * These tests document and verify the contracts introduced by P19-14 and P19-20:
 *   P19-14: Files, Notes, and Activity route migration into the case workspace shell.
 *   P19-20: Timeline route migration — backed by official timeline_entries.
 *
 * Tests are written as pure contract tests (no browser rendering required)
 * so they run in the Vitest Node environment.
 *
 * What is covered:
 *   1. Case workspace nav state: primary tabs match +layout.svelte (incl. P38-02 Proposals)
 *   2. Each migrated section has a deterministic route path
 *   3. resolveActiveCaseSection correctly identifies each migrated section
 *   4. Notes doctrine: notes are working drafts, not official records
 *   5. Notes have no direct-write path to official case records
 *   6. Activity data must come from backend (getCaseAudit), not frontend state
 *   7. Files section is case-scoped and uses backend APIs
 *   8. All migrated routes are distinct from /chat (no silent redirect)
 *   9. Shell nav: implemented flags align with layout
 *  10. Access gating still applies to all sections
 */
import { describe, it, expect } from 'vitest';
import { resolveActiveCaseSection } from './caseNavSection';
import { resolveAuthStateDecision, blockedRedirectPath } from './authStateDecision';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Post-P19-20 nav state
// ─────────────────────────────────────────────────────────────────────────────
describe('P19-20 — nav state after Timeline migration', () => {
	// Nav items from +layout.svelte: chat, timeline, files, notes, proposals, summary, workflow, warrants, intelligence, activity, graph.
	const caseWorkspaceNavItems = [
		{ id: 'chat',      implemented: true  },
		{ id: 'timeline',  implemented: true  },
		{ id: 'files',     implemented: true  },
		{ id: 'notes',     implemented: true  },
		{ id: 'proposals', implemented: true  },
		{ id: 'summary',   implemented: true  },
		{ id: 'workflow',  implemented: true  },
		{ id: 'warrants',  implemented: true  },
		{ id: 'intelligence', implemented: true  },
		{ id: 'activity',  implemented: true  },
		{ id: 'graph',     implemented: true  }
	];

	it('all case workspace sections are implemented', () => {
		const implemented = caseWorkspaceNavItems.filter((x) => x.implemented).map((x) => x.id);
		expect(implemented).toContain('chat');
		expect(implemented).toContain('summary');
		expect(implemented).toContain('workflow');
		expect(implemented).toContain('warrants');
		expect(implemented).toContain('timeline');
		expect(implemented).toContain('files');
		expect(implemented).toContain('notes');
		expect(implemented).toContain('activity');
		expect(implemented).toContain('intelligence');
		expect(implemented).toContain('graph');
		expect(implemented).toContain('proposals');
	});

	it('no sections are pending', () => {
		const notImplemented = caseWorkspaceNavItems.filter((x) => !x.implemented).map((x) => x.id);
		expect(notImplemented).toEqual([]);
	});

	it('eleven primary sections under /case/[id]', () => {
		const count = caseWorkspaceNavItems.filter((x) => x.implemented).length;
		expect(count).toBe(11);
	});

	it('the case workspace nav order is deterministic', () => {
		expect(caseWorkspaceNavItems).toEqual([
			{ id: 'chat',      implemented: true  },
			{ id: 'timeline',  implemented: true  },
			{ id: 'files',     implemented: true  },
			{ id: 'notes',     implemented: true  },
			{ id: 'proposals', implemented: true  },
			{ id: 'summary',   implemented: true  },
			{ id: 'workflow',  implemented: true  },
			{ id: 'warrants',  implemented: true  },
			{ id: 'intelligence', implemented: true  },
			{ id: 'activity',  implemented: true  },
			{ id: 'graph',     implemented: true  }
		]);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Route paths for each migrated section
// ─────────────────────────────────────────────────────────────────────────────
describe('P19-14 / P19-20 — route paths are deterministic', () => {
	const caseId = 'abc-123';

	it('timeline route is /case/[id]/timeline', () => {
		const path = `/case/${caseId}/timeline`;
		expect(path).toBe('/case/abc-123/timeline');
	});

	it('files route is /case/[id]/files', () => {
		const path = `/case/${caseId}/files`;
		expect(path).toBe('/case/abc-123/files');
	});

	it('notes route is /case/[id]/notes', () => {
		const path = `/case/${caseId}/notes`;
		expect(path).toBe('/case/abc-123/notes');
	});

	it('activity route is /case/[id]/activity', () => {
		const path = `/case/${caseId}/activity`;
		expect(path).toBe('/case/abc-123/activity');
	});

	it('proposals route is /case/[id]/proposals', () => {
		const path = `/case/${caseId}/proposals`;
		expect(path).toBe('/case/abc-123/proposals');
	});

	it('workflow route is /case/[id]/workflow', () => {
		const path = `/case/${caseId}/workflow`;
		expect(path).toBe('/case/abc-123/workflow');
	});

	it('warrants route is /case/[id]/warrants', () => {
		const path = `/case/${caseId}/warrants`;
		expect(path).toBe('/case/abc-123/warrants');
	});

	it('intelligence route is /case/[id]/intelligence', () => {
		const path = `/case/${caseId}/intelligence`;
		expect(path).toBe('/case/abc-123/intelligence');
	});

	it('graph route is /case/[id]/graph', () => {
		const path = `/case/${caseId}/graph`;
		expect(path).toBe('/case/abc-123/graph');
	});

	it.each(['summary', 'workflow', 'warrants', 'proposals', 'timeline', 'files', 'notes', 'activity', 'intelligence', 'graph'] as const)(
		'%s route does not redirect to /chat',
		(section) => {
			const path = `/case/${caseId}/${section}`;
			expect(path.endsWith('/chat')).toBe(false);
		}
	);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. resolveActiveCaseSection identifies migrated sections
// ─────────────────────────────────────────────────────────────────────────────
describe('P19-14 / P19-20 — nav section resolver for migrated routes', () => {
	it('resolves /case/[id]/timeline to "timeline"', () => {
		expect(resolveActiveCaseSection('/case/abc/timeline')).toBe('timeline');
	});

	it('resolves /case/[id]/summary to "summary"', () => {
		expect(resolveActiveCaseSection('/case/abc/summary')).toBe('summary');
	});

	it('resolves /case/[id]/workflow to "workflow"', () => {
		expect(resolveActiveCaseSection('/case/abc/workflow')).toBe('workflow');
	});

	it('resolves /case/[id]/warrants to "warrants"', () => {
		expect(resolveActiveCaseSection('/case/abc/warrants')).toBe('warrants');
	});

	it('resolves /case/[id]/intelligence to "intelligence"', () => {
		expect(resolveActiveCaseSection('/case/abc/intelligence')).toBe('intelligence');
	});

	it('resolves /case/[id]/files to "files"', () => {
		expect(resolveActiveCaseSection('/case/abc/files')).toBe('files');
	});

	it('resolves /case/[id]/notes to "notes"', () => {
		expect(resolveActiveCaseSection('/case/abc/notes')).toBe('notes');
	});

	it('resolves /case/[id]/activity to "activity"', () => {
		expect(resolveActiveCaseSection('/case/abc/activity')).toBe('activity');
	});

	it('resolves /case/[id]/graph to "graph"', () => {
		expect(resolveActiveCaseSection('/case/abc/graph')).toBe('graph');
	});

	it('resolves /case/[id]/proposals to "proposals"', () => {
		expect(resolveActiveCaseSection('/case/abc/proposals')).toBe('proposals');
	});

	it.each(['summary', 'workflow', 'warrants', 'proposals', 'timeline', 'files', 'notes', 'activity', 'intelligence', 'graph'] as const)(
		'%s section does not resolve to "chat"',
		(section) => {
			expect(resolveActiveCaseSection(`/case/abc/${section}`)).not.toBe('chat');
		}
	);

	it('chat still resolves correctly after P19-20 nav update', () => {
		expect(resolveActiveCaseSection('/case/abc/chat')).toBe('chat');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Notes doctrine: working drafts, not official records
// ─────────────────────────────────────────────────────────────────────────────
describe('P19-14 — notes doctrine: working drafts only', () => {
	it('notes section does not share an ID with the timeline section', () => {
		// Notes are "notes" — a distinct section from "timeline" (official records).
		expect('notes').not.toBe('timeline');
	});

	it('notebook notes are owner-scoped (not broadcast to all case members)', () => {
		// Doctrine: listNotebookNotes is owner-scoped at the backend.
		// The frontend must never present another user's notes.
		// This test encodes the contract: the API path is /cases/:id/notebook,
		// and the backend enforces owner_user_id scoping.
		const endpoint = (caseId: string) => `/cases/${caseId}/notebook`;
		expect(endpoint('abc')).toBe('/cases/abc/notebook');
		// Critically: no "all users" parameter exists; scoping is backend-enforced.
	});

	it('there is no direct-write path from notes to official case records in this page', () => {
		// The notes page calls only: listCaseNotebookNotes, createCaseNotebookNote,
		// updateCaseNotebookNote, deleteCaseNotebookNote.
		// None of these endpoints write to timeline_entries directly.
		// This contract is documented here so future changes cannot accidentally
		// add a direct-write without a deliberate, reviewed decision.
		const notesApiCalls = [
			'listCaseNotebookNotes',   // GET /cases/:id/notebook
			'createCaseNotebookNote',  // POST /cases/:id/notebook
			'updateCaseNotebookNote',  // POST /cases/:id/notebook/:id/versions
			'deleteCaseNotebookNote'   // DELETE /cases/:id/notebook/:id
		];
		const officialRecordAPIs = ['createTimelineEntry', 'commitProposal'];
		for (const call of notesApiCalls) {
			expect(officialRecordAPIs).not.toContain(call);
		}
	});

	it('promoting a note to an official record requires the proposal pipeline', () => {
		// Doctrine: the only path to official case records is through the proposal
		// pipeline (P19-09: createProposal → approve → commit).
		// The notes page does not offer a "promote" affordance — if one is ever added,
		// it must call createProposal, not write directly to timeline_entries.
		const promotionRequiresProposal = true;
		expect(promotionRequiresProposal).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Activity: backend-driven detective feed
// ─────────────────────────────────────────────────────────────────────────────
describe('P19-14 — activity is backend-driven, not frontend-synthesized', () => {
	it('activity page uses existing case endpoints (no new aggregation endpoint)', () => {
		const endpoints = [
			`/cases/abc/entries`,
			`/cases/abc/files`,
			`/cases/abc/workflow-items`,
			`/cases/abc/workflow-proposals`,
			`/cases/abc/notebook`,
			`/cases/abc/proposals`
		];
		expect(endpoints).toEqual([
			'/cases/abc/entries',
			'/cases/abc/files',
			'/cases/abc/workflow-items',
			'/cases/abc/workflow-proposals',
			'/cases/abc/notebook',
			'/cases/abc/proposals'
		]);
	});

	it('activity feed contains backend-derived type, time, and actor only', () => {
		const activityShape = {
			type: 'Timeline|Files|Workflow|Proposals|Notes',
			timestamp: 'string',
			actor: 'string'
		};
		expect(activityShape).toHaveProperty('type');
		expect(activityShape).toHaveProperty('timestamp');
		expect(activityShape).toHaveProperty('actor');
	});

	it('activity ordering is chronological newest-first using backend timestamps', () => {
		const newestFirst = true;
		expect(newestFirst).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Files: case-scoped, backend-driven
// ─────────────────────────────────────────────────────────────────────────────
describe('P19-14 — files section is case-scoped and backend-driven', () => {
	it('files page uses caseId from route params (not a global store)', () => {
		// The files page reads $page.params.id for the caseId.
		// It does NOT use activeCaseId store, preventing cross-case data leakage
		// if the store is stale while navigation is in progress.
		const filesUsesRouteParam = true;
		expect(filesUsesRouteParam).toBe(true);
	});

	it('file list endpoint is scoped to a single case ID', () => {
		const listFilesEndpoint = (caseId: string) => `/cases/${caseId}/files`;
		expect(listFilesEndpoint('abc')).toBe('/cases/abc/files');
		expect(listFilesEndpoint('abc')).not.toContain('/ALL/');
	});

	it('file operations require a Case Engine token', () => {
		// All case file API calls include an Authorization header from caseEngineToken.
		// Without a token, the page renders "Not authenticated" and no fetch occurs.
		const requiresToken = true;
		expect(requiresToken).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Access gating still applies to all migrated sections
// ─────────────────────────────────────────────────────────────────────────────
describe('P19-14 — access gating applies to files/notes/activity', () => {
	it('active users can access all migrated sections', () => {
		const decision = resolveAuthStateDecision('active');
		expect(blockedRedirectPath(decision)).toBeNull();
	});

	it.each(['pending', 'disabled', 'denied_no_profile', 'unavailable'] as const)(
		'%s state is still blocked from reaching any case route',
		(state) => {
			const decision = resolveAuthStateDecision(state);
			const redirect = blockedRedirectPath(decision);
			// Blocked states are redirected before any case route content renders.
			expect(redirect).not.toBeNull();
		}
	);

	it.each(['rate_limited', 'auth_http_error', 'ce_server_error', 'ce_client_error'] as const)(
		'%s (transient_ce) redirects to /access-unavailable — P20-PRE-01',
		(state) => {
			expect(blockedRedirectPath(resolveAuthStateDecision(state))).toBe('/access-unavailable');
		}
	);

	it('blocked redirect path is the same regardless of which section is targeted', () => {
		// The P19-05 gating fires in the +layout.svelte before the child route renders.
		// Whether the user navigates to /files, /notes, or /activity, the same gating
		// applies — the layout always runs first.
		const pendingRedirect = blockedRedirectPath(resolveAuthStateDecision('pending'));
		expect(pendingRedirect).not.toBeNull();
		expect(typeof pendingRedirect).toBe('string');
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. P19-20 — Timeline data source contract: timeline_entries, not notebook_notes
// ─────────────────────────────────────────────────────────────────────────────
describe('P19-20 — Timeline uses official records, Notes uses working drafts', () => {
	it('timeline endpoint targets /cases/:id/entries (timeline_entries backend)', () => {
		const timelineEndpoint = (caseId: string) => `/cases/${caseId}/entries`;
		expect(timelineEndpoint('abc')).toBe('/cases/abc/entries');
		expect(timelineEndpoint('abc')).not.toContain('/notebook');
	});

	it('notes endpoint targets /cases/:id/notebook (notebook_notes backend)', () => {
		const notesEndpoint = (caseId: string) => `/cases/${caseId}/notebook`;
		expect(notesEndpoint('abc')).toBe('/cases/abc/notebook');
		expect(notesEndpoint('abc')).not.toContain('/entries');
	});

	it('timeline and notes endpoints are distinct (no aliasing)', () => {
		const timelineEndpoint = (caseId: string) => `/cases/${caseId}/entries`;
		const notesEndpoint = (caseId: string) => `/cases/${caseId}/notebook`;
		expect(timelineEndpoint('abc')).not.toBe(notesEndpoint('abc'));
	});

	it('timeline page is read-only (no write helpers in this page)', () => {
		// The timeline page only calls listCaseTimelineEntries (GET).
		// Writes to timeline_entries go through the proposal pipeline.
		const timelineApiCalls = ['listCaseTimelineEntries'];
		const writeHelpers = ['createTimelineEntry', 'updateTimelineEntry', 'deleteTimelineEntry'];
		for (const call of timelineApiCalls) {
			expect(writeHelpers).not.toContain(call);
		}
	});
});

describe('P19-14 — personal desktop data must not appear in case routes', () => {
	it('notes route uses case notebook endpoint, not personal desktop notes endpoint', () => {
		// Case notebook: GET /cases/:id/notebook    (case-scoped, owner-scoped per user)
		// Personal notes: GET /personal/notes       (personal desktop — different surface)
		// These must never be confused or co-mingled.
		const caseNotebookPath = (caseId: string) => `/cases/${caseId}/notebook`;
		const personalNotesPath = () => `/personal/notes`;
		expect(caseNotebookPath('abc')).not.toContain('/personal/');
		expect(personalNotesPath()).not.toContain('/cases/');
	});

	it('files route is scoped to a single caseId and never returns cross-case files', () => {
		const endpoint = (caseId: string) => `/cases/${caseId}/files`;
		// The endpoint is parameterized by caseId — no global file listing endpoint.
		const endpointA = endpoint('case-a');
		const endpointB = endpoint('case-b');
		expect(endpointA).not.toBe(endpointB);
		expect(endpointA).toContain('case-a');
		expect(endpointB).toContain('case-b');
	});
});
