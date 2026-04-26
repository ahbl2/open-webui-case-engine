<!--
	P130-01 — AI Workspace identity + framing (non-authoritative assistant layer).
	P130-02 — Read-only case retrieval on explicit user action (GET-only bundle; no LLM).
	P130-03 — Structured model output via Open WebUI chat completions (no Case Engine writes).
	P130-04 — Explicit AI → proposal draft (selection + review; POST case-proposals only on confirm).
	P130-05 — Central guardrails: mutation denial, output integrity, traceability, proposal rate limit, case-change session reset.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { activeCaseMeta, caseEngineToken, models } from '$lib/stores';
	import { generateOpenAIChatCompletion } from '$lib/apis/openai';
	import { createCaseProposalManual as submitManualCaseProposal } from '$lib/case/aiWorkspaceCaseProposalClient';
	import { WEBUI_BASE_URL } from '$lib/constants';
	import { buildCaseRetrievalBundle } from '$lib/case/caseDataIngestion';
	import type { CaseRetrievalBundle } from '$lib/case/caseRetrievalBundleTypes';
	import {
		AI_WORKSPACE_GUARDRAIL_VIOLATION_MESSAGE,
		assertNoMutationAllowed,
		assertProposalSubmissionContext,
		assertProposalSubmitRateAllowed,
		markProposalSubmitCompleted,
		validateAiWorkspaceOutputIntegrity,
		validateTraceabilityForProposalDraft
	} from '$lib/case/aiWorkspaceGuardrails';
	import {
		assembleProposalTextOriginal,
		buildCaseProposalCreateBody,
		buildSourceRefsFromSelectedFacts
	} from '$lib/case/aiWorkspaceToProposalMapper';
	import { buildAiWorkspacePromptPayload } from '$lib/case/aiWorkspacePromptBuilder';
	import { parseAiWorkspaceLlmJsonWithBundle } from '$lib/case/aiWorkspaceResponseParser';
	import type { AiWorkspaceLlmJsonV1 } from '$lib/case/aiWorkspaceResponseTypes';
	import {
		DS_BANNER_CLASSES,
		DS_BTN_CLASSES,
		DS_PANEL_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import SparklesSolid from '$lib/components/icons/SparklesSolid.svelte';
	import {
		P130_AI_WORKSPACE_BOUNDARY_AI,
		P130_AI_WORKSPACE_BOUNDARY_PROPOSALS,
		P130_AI_WORKSPACE_BOUNDARY_TIMELINE,
		P130_AI_WORKSPACE_CASE_CONTEXT_HEADING,
		P130_AI_WORKSPACE_CORE_PRINCIPLE,
		P130_AI_WORKSPACE_DATA_USED_ENTITIES,
		P130_AI_WORKSPACE_DATA_USED_FILES,
		P130_AI_WORKSPACE_DATA_USED_NOTES,
		P130_AI_WORKSPACE_DATA_USED_SECTION_INTRO,
		P130_AI_WORKSPACE_DATA_USED_SECTION_TITLE,
		P130_AI_WORKSPACE_DATA_USED_TIMELINE,
		P130_AI_WORKSPACE_DATA_USED_WORKFLOW,
		P130_AI_WORKSPACE_INGESTING_LABEL,
		P130_AI_WORKSPACE_INGESTION_SUCCESS,
		P130_AI_WORKSPACE_INPUT_LABEL,
		P130_AI_WORKSPACE_INPUT_PLACEHOLDER,
		P130_AI_WORKSPACE_OUTPUT_EMPTY,
		P130_AI_WORKSPACE_OUTPUT_REGION_LABEL,
		P130_AI_WORKSPACE_ROLE_ASSISTANT,
		P130_AI_WORKSPACE_ROLE_NO_MUTATION,
		P130_AI_WORKSPACE_ROLE_NO_TIMELINE_WRITE,
		P130_AI_WORKSPACE_ROLE_REVIEW,
		P130_AI_WORKSPACE_SCOPE_LABEL,
		P130_AI_WORKSPACE_SEND_DISABLED_TITLE,
		P130_AI_WORKSPACE_SEND_RETRIEVE_BUTTON,
		P130_AI_WORKSPACE_SEND_RETRIEVE_TITLE,
		P130_AI_WORKSPACE_SESSION_LINE_1,
		P130_AI_WORKSPACE_SESSION_LINE_2,
		P130_AI_WORKSPACE_SESSION_LINE_3,
		P130_AI_WORKSPACE_SOURCES_TRACE_BODY,
		P130_AI_WORKSPACE_SOURCES_TRACE_TITLE,
		P130_AI_WORKSPACE_AI_SEND_BUTTON,
		P130_AI_WORKSPACE_AI_SEND_TITLE,
		P130_AI_WORKSPACE_AI_BUSY,
		P130_AI_WORKSPACE_NEED_BUNDLE_FIRST,
		P130_AI_WORKSPACE_NO_MODEL,
		P130_AI_WORKSPACE_NO_OWUI_TOKEN,
		P130_AI_WORKSPACE_SECTION_SOURCE_FACTS,
		P130_AI_WORKSPACE_SECTION_AI_CONTENT,
		P130_AI_WORKSPACE_SECTION_SOURCES_USED,
		P130_AI_WORKSPACE_PARSE_ERROR,
		P130_AI_WORKSPACE_PROPOSAL_CANCEL,
		P130_AI_WORKSPACE_PROPOSAL_CONFIRM,
		P130_AI_WORKSPACE_PROPOSAL_CREATE_BUTTON,
		P130_AI_WORKSPACE_PROPOSAL_CREATE_TITLE,
		P130_AI_WORKSPACE_PROPOSAL_ERR_CASE_CHANGED,
		P130_AI_WORKSPACE_PROPOSAL_INCLUDE_GENERATED_LABEL,
		P130_AI_WORKSPACE_PROPOSAL_NOT_TIMELINE,
		P130_AI_WORKSPACE_PROPOSAL_REVIEW_HEADING,
		P130_AI_WORKSPACE_PROPOSAL_REVIEW_OCCURRED_AT,
		P130_AI_WORKSPACE_PROPOSAL_REVIEW_TEXT,
		P130_AI_WORKSPACE_PROPOSAL_REVIEW_TYPE,
		P130_AI_WORKSPACE_PROPOSAL_SELECT_FACTS_HELP,
		P130_AI_WORKSPACE_PROPOSAL_SOURCE_REFS_PREVIEW,
		P130_AI_WORKSPACE_PROPOSAL_SUBMITTING,
		P130_AI_WORKSPACE_PROPOSAL_SUCCESS,
		P130_AI_WORKSPACE_TRACEABILITY_BLOCK,
		P130_AI_WORKSPACE_TRACEABILITY_WARNINGS
	} from '$lib/caseContext/p130AIWorkspaceCopy';

	/** Route case id from `/case/:id/ai-workspace` (display fallback if meta not loaded). */
	export let caseId: string;

	/** P130+ UI: assistant primary navigation (not quick actions). */
	type AssistantViewTab = 'chat' | 'sessions' | 'sources' | 'drafts' | 'help';
	type AiWorkspaceChatMessage = { id: string; role: 'user' | 'assistant'; content: string; at: string };
	type AiSessionRecord = {
		id: string;
		createdAt: number;
		title: string;
		messages: AiWorkspaceChatMessage[];
		preview: string;
	};

	const AI_HEADER_TITLE = 'AI Assistant Workspace';
	const AI_HEADER_HELPER = 'AI suggestions are not official. Review before using.';
	/** Chat composer: visible fine print (not a substitute for case records). */
	const AI_COMPOSER_FINE_PRINT =
		'AI-generated content may be incomplete or incorrect. Verify before use. Nothing here becomes part of the official case record.';
	/** Shown in the start panel when the thread is empty. */
	const AI_START_PANEL_BODY =
		'Ask questions about this case, find gaps, summarize sources, or draft reviewable content.';

	function formatMessageTime(iso: string): string {
		if (!iso) return '—';
		return iso.length >= 19 ? `${iso.slice(0, 10)} ${iso.slice(11, 19)}` : iso;
	}

	/** Read-only: quick action cards set prompt text only; they are not routes or tabs. */
	const QUICK_ACTIONS: { id: string; label: string; sub: string; prompt: string }[] = [
		{
			id: 'q1',
			label: 'Summarize case',
			sub: 'Overview of the file so far',
			prompt: 'Summarize the key points of this case from the available context.'
		},
		{
			id: 'q2',
			label: 'Find gaps',
			sub: 'Follow-ups the case may still need',
			prompt: 'What follow-ups or gaps should an investigator consider for this case?'
		},
		{
			id: 'q3',
			label: 'Timeline insights',
			sub: 'Chronology, order, and date questions',
			prompt: 'Summarize how timeline entries are ordered and what gaps or date conflicts to notice.'
		},
		{
			id: 'q4',
			label: 'Subject connections',
			sub: 'Who and what tie together here',
			prompt: 'What subject, entity, or contact connections appear in this case data?'
		},
		{
			id: 'q5',
			label: 'Draft timeline entry',
			sub: 'Wording to review, not a filed entry',
			prompt:
				'Draft a concise timeline entry description from the case context for my review. Do not present it as already filed or official.'
		}
	];

	const RIGHT_RAIL_SUGGESTED_ACTIONS: { id: string; label: string; prompt: string }[] = [
		...QUICK_ACTIONS.map(({ id, label, prompt }) => ({ id, label, prompt })),
		{
			id: 'r1',
			label: 'List next investigative steps',
			prompt: 'Based on this case context, list the next practical investigative steps to consider.'
		},
		{
			id: 'r2',
			label: 'Identify contradictions',
			prompt: 'Identify any contradictions, unclear facts, or points that may need verification in this case.'
		},
		{
			id: 'r3',
			label: 'Summarize key people',
			prompt: 'Summarize the key people, subjects, contacts, and entities mentioned in this case context.'
		},
		{
			id: 'r4',
			label: 'Prepare review questions',
			prompt: 'Prepare concise review questions an investigator should ask before relying on the current case narrative.'
		}
	];


	/** Per-card color tokens for quick action cards. */
	const QUICK_ACTION_COLORS: Record<string, { border: string; bg: string; iconColor: string; hover: string; ring: string; labelColor: string }> = {
		q1: { border: 'border-sky-500/40',     bg: 'bg-sky-950/30',     iconColor: 'text-sky-300/90',     hover: 'hover:border-sky-400/80 hover:bg-sky-950/50',     ring: 'focus:ring-sky-500/50',     labelColor: 'text-sky-100' },
		q2: { border: 'border-amber-500/40',   bg: 'bg-amber-950/30',   iconColor: 'text-amber-300/90',   hover: 'hover:border-amber-400/80 hover:bg-amber-950/50',   ring: 'focus:ring-amber-500/50',   labelColor: 'text-amber-100' },
		q3: { border: 'border-violet-500/40',  bg: 'bg-violet-950/30',  iconColor: 'text-violet-300/90',  hover: 'hover:border-violet-400/80 hover:bg-violet-950/50',  ring: 'focus:ring-violet-500/50',  labelColor: 'text-violet-100' },
		q4: { border: 'border-teal-500/40',    bg: 'bg-teal-950/30',    iconColor: 'text-teal-300/90',    hover: 'hover:border-teal-400/80 hover:bg-teal-950/50',    ring: 'focus:ring-teal-500/50',    labelColor: 'text-teal-100' },
		q5: { border: 'border-emerald-500/40', bg: 'bg-emerald-950/30', iconColor: 'text-emerald-300/90', hover: 'hover:border-emerald-400/80 hover:bg-emerald-950/50', ring: 'focus:ring-emerald-500/50', labelColor: 'text-emerald-100' }
	};
	function genMsgId(): string {
		return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
	}

	let previousRouteCaseId = '';
	let assistantViewTab: AssistantViewTab = 'chat';
	/** Browser-session only; survives refresh without creating backend persistence. */
	let sessions: AiSessionRecord[] = [];
	let activeSessionId = '';
	let sessionsHydratedForCase = '';
	let aboutAssistantExpanded = false;
	let suggestedActionsExpanded = false;
	let assistantHelpExpanded = false;

	let bundle: CaseRetrievalBundle | null = null;
	let ingestionError: string | null = null;
	let ingesting = false;

	let promptText = '';
	let submittedPromptText = '';
	let parsedAi: AiWorkspaceLlmJsonV1 | null = null;
	let aiWarnings: string[] = [];
	let llmError: string | null = null;
	let parseError: string | null = null;
	let guardrailError: string | null = null;
	let aiBusy = false;

	/** Raw model message text (for P101 trace excerpt); set only on successful structured parse. */
	let rawModelResponse = '';
	let lastModelIdUsed: string | undefined = undefined;
	let factSelected: boolean[] = [];
	let includeGenerated = false;

	let proposalReviewOpen = false;
	let reviewOccurredAt = '';
	let reviewType = 'note';
	let reviewText = '';
	let proposalSubmitting = false;
	let proposalSubmitError: string | null = null;
	let proposalSuccess = false;

	function resetProposalDraftUi(): void {
		rawModelResponse = '';
		lastModelIdUsed = undefined;
		factSelected = [];
		includeGenerated = false;
		proposalReviewOpen = false;
		reviewOccurredAt = '';
		reviewType = 'note';
		reviewText = '';
		proposalSubmitting = false;
		proposalSubmitError = null;
		proposalSuccess = false;
		guardrailError = null;
	}

	function seedFirstSession(): void {
		if (sessions.length > 0) return;
		const id = `ses_${Date.now()}_init`;
		sessions = [{ id, createdAt: Date.now(), title: 'Session 1', messages: [], preview: 'No messages yet' }];
		activeSessionId = id;
	}

	function sessionStorageKeyForCase(cid: string): string {
		return `case_ai_workspace_sessions_v1:${cid}`;
	}

	function normalizeStoredSessions(value: unknown): AiSessionRecord[] {
		if (!Array.isArray(value)) return [];
		return value
			.map((raw, index) => {
				const r = raw as Partial<AiSessionRecord>;
				const messages = Array.isArray(r.messages)
					? r.messages
							.filter((m): m is AiWorkspaceChatMessage => {
								const msg = m as Partial<AiWorkspaceChatMessage>;
								return (
									(msg.role === 'user' || msg.role === 'assistant') &&
									typeof msg.content === 'string' &&
									typeof msg.at === 'string'
								);
							})
							.map((m) => ({
								id: typeof m.id === 'string' && m.id ? m.id : genMsgId(),
								role: m.role,
								content: m.content,
								at: m.at
							}))
					: [];
				const id = typeof r.id === 'string' && r.id ? r.id : `ses_${Date.now()}_${index}`;
				return {
					id,
					createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
					title: typeof r.title === 'string' && r.title ? r.title : `Session ${index + 1}`,
					messages,
					preview:
						typeof r.preview === 'string' && r.preview
							? r.preview
							: messages.length > 0
								? messages[messages.length - 1].content.replace(/\s+/g, ' ').trim().slice(0, 140)
								: 'No messages yet'
				};
			})
			.slice(0, 20);
	}

	function restoreCaseSessions(cid: string): boolean {
		if (!browser || typeof sessionStorage === 'undefined') return false;
		try {
			const raw = sessionStorage.getItem(sessionStorageKeyForCase(cid));
			if (!raw) return false;
			const parsed = JSON.parse(raw) as { sessions?: unknown; activeSessionId?: unknown };
			const restoredSessions = normalizeStoredSessions(parsed.sessions);
			if (restoredSessions.length === 0) return false;
			sessions = restoredSessions;
			const restoredActive =
				typeof parsed.activeSessionId === 'string' &&
				restoredSessions.some((s) => s.id === parsed.activeSessionId)
					? parsed.activeSessionId
					: restoredSessions[0].id;
			activeSessionId = restoredActive;
			return true;
		} catch {
			return false;
		}
	}

	function persistCaseSessions(cid: string): void {
		if (!browser || typeof sessionStorage === 'undefined' || sessionsHydratedForCase !== cid) return;
		try {
			sessionStorage.setItem(
				sessionStorageKeyForCase(cid),
				JSON.stringify({
					activeSessionId,
					sessions: sessions.slice(-20).map((s) => ({
						...s,
						messages: s.messages.slice(-80)
					}))
				})
			);
		} catch {
			// Ignore storage quota / private mode.
		}
	}

	function newAssistantSession(): void {
		const id = `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const title = `Session ${sessions.length + 1}`;
		sessions = [...sessions, { id, createdAt: Date.now(), title, messages: [], preview: 'No messages yet' }];
		activeSessionId = id;
		promptText = '';
		submittedPromptText = '';
		parsedAi = null;
		aiWarnings = [];
		llmError = null;
		parseError = null;
		guardrailError = null;
		rawModelResponse = '';
		lastModelIdUsed = undefined;
		factSelected = [];
		includeGenerated = false;
		proposalReviewOpen = false;
		proposalSuccess = false;
		proposalSubmitError = null;
		resetProposalDraftUi();
		assistantViewTab = 'chat';
	}

	function resetCurrentChatSession(): void {
		if (!activeSessionId) return;
		promptText = '';
		submittedPromptText = '';
		parsedAi = null;
		aiWarnings = [];
		llmError = null;
		parseError = null;
		guardrailError = null;
		rawModelResponse = '';
		lastModelIdUsed = undefined;
		factSelected = [];
		includeGenerated = false;
		proposalReviewOpen = false;
		proposalSuccess = false;
		proposalSubmitError = null;
		resetProposalDraftUi();
		sessions = sessions.map((s) =>
			s.id === activeSessionId ? { ...s, messages: [], preview: 'Reset' } : s
		);
	}

	function openAssistantSession(sid: string): void {
		activeSessionId = sid;
		promptText = '';
		submittedPromptText = '';
		parsedAi = null;
		aiWarnings = [];
		llmError = null;
		parseError = null;
		guardrailError = null;
		rawModelResponse = '';
		lastModelIdUsed = undefined;
		factSelected = [];
		includeGenerated = false;
		proposalReviewOpen = false;
		proposalSuccess = false;
		proposalSubmitError = null;
		resetProposalDraftUi();
		assistantViewTab = 'chat';
	}

	function pushActiveMessage(role: AiWorkspaceChatMessage['role'], content: string): void {
		const sid = activeSessionId;
		if (!sid) return;
		const msg: AiWorkspaceChatMessage = {
			id: genMsgId(),
			role,
			content,
			at: new Date().toISOString()
		};
		const flat = content.replace(/\s+/g, ' ').trim();
		sessions = sessions.map((s) => {
			if (s.id !== sid) return s;
			const nextMessages = [...s.messages, msg];
			const preview = flat.length > 0 ? flat.slice(0, 140) : s.preview;
			return { ...s, messages: nextMessages, preview };
		});
	}

	function applyQuickAction(prompt: string): void {
		assistantViewTab = 'chat';
		promptText = prompt;
	}

	$: {
		const cid = String(caseId ?? '').trim();
		if (previousRouteCaseId !== '' && cid !== previousRouteCaseId) {
			bundle = null;
			ingestionError = null;
			ingesting = false;
			parsedAi = null;
			aiWarnings = [];
			llmError = null;
			parseError = null;
			guardrailError = null;
			resetProposalDraftUi();
			sessions = [];
			activeSessionId = '';
			sessionsHydratedForCase = '';
			submittedPromptText = '';
			assistantViewTab = 'chat';
		}
		previousRouteCaseId = cid;
		if (cid && sessionsHydratedForCase !== cid) {
			const restored = restoreCaseSessions(cid);
			sessionsHydratedForCase = cid;
			if (!restored) seedFirstSession();
		}
	}

	$: {
		const cid = String(caseId ?? '').trim();
		sessions;
		activeSessionId;
		if (cid && sessionsHydratedForCase === cid) {
			persistCaseSessions(cid);
		}
	}

	$: activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
	$: recentSessionsForSidebar = [...sessions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);

	$: selectedFactIndices = factSelected
		.map((on, i) => (on ? i : -1))
		.filter((i) => i >= 0);

	$: hasProposalSelection = Boolean(
		parsedAi &&
			(selectedFactIndices.length > 0 ||
				(includeGenerated && String(parsedAi.ai_generated_content ?? '').trim().length > 0))
	);

	$: traceabilityCheck =
		parsedAi && hasProposalSelection && String($caseEngineToken ?? '').trim()
			? validateTraceabilityForProposalDraft({
					parsed: parsedAi,
					rawModelResponse,
					userPrompt: submittedPromptText || promptText,
					selectedFactIndices,
					includeGenerated,
					bundle
				})
			: null;

	$: readyForProposalReview =
		Boolean(parsedAi) &&
		hasProposalSelection &&
		Boolean(String($caseEngineToken ?? '').trim()) &&
		traceabilityCheck !== null &&
		traceabilityCheck.ok === true;

	$: traceabilityBlockMessage =
		parsedAi && hasProposalSelection && traceabilityCheck && !traceabilityCheck.ok
			? traceabilityCheck.message
			: null;

	$: mergedTraceabilityWarnings =
		traceabilityCheck && traceabilityCheck.ok ? traceabilityCheck.warnings : [];

	$: displayWarnings = [...aiWarnings, ...mergedTraceabilityWarnings];

	$: reviewSourceRefsPreview =
		parsedAi && proposalReviewOpen
			? JSON.stringify(
					buildSourceRefsFromSelectedFacts(parsedAi, selectedFactIndices),
					null,
					2
				)
			: '';

	function toggleFact(i: number): void {
		factSelected = factSelected.map((v, j) => (j === i ? !v : v));
	}

	function openProposalReview(): void {
		if (!parsedAi || !hasProposalSelection || !readyForProposalReview) return;
		proposalSubmitError = null;
		proposalSuccess = false;
		reviewOccurredAt = new Date().toISOString();
		reviewType = 'note';
		reviewText = assembleProposalTextOriginal({
			parsed: parsedAi,
			selectedFactIndices,
			includeGenerated
		});
		proposalReviewOpen = true;
	}

	function cancelProposalReview(): void {
		proposalReviewOpen = false;
		proposalSubmitError = null;
	}

	async function confirmProposalSubmit(): Promise<void> {
		const capturedCaseId = String(caseId ?? '').trim();
		const token = String($caseEngineToken ?? '').trim();
		if (!capturedCaseId || !token || !parsedAi || proposalSubmitting) return;

		try {
			assertNoMutationAllowed({ phase: 'proposal_create', caseEngineWriteIntent: 'proposal_only' });
			assertProposalSubmissionContext(proposalReviewOpen);
			assertProposalSubmitRateAllowed();
			const tr = validateTraceabilityForProposalDraft({
				parsed: parsedAi,
				rawModelResponse,
				userPrompt: submittedPromptText || promptText,
				selectedFactIndices,
				includeGenerated,
				bundle
			});
			if (!tr.ok) {
				proposalSubmitError = tr.message;
				return;
			}
		} catch (e: unknown) {
			proposalSubmitError = e instanceof Error ? e.message : String(e);
			return;
		}

		proposalSubmitting = true;
		proposalSubmitError = null;
		try {
			const { payload, source_refs } = buildCaseProposalCreateBody({
				reviewOccurredAt,
				reviewType,
				reviewTextOriginal: reviewText,
				traceContext: {
					userPrompt: submittedPromptText || promptText,
					modelId: lastModelIdUsed,
					rawModelResponse,
					parsed: parsedAi,
					selectedFactIndices,
					includeGenerated
				}
			});
			await submitManualCaseProposal(capturedCaseId, token, {
				creation_mode: 'manual',
				proposal_type: 'timeline_entry',
				payload,
				source_refs
			});
			if (capturedCaseId !== String(caseId ?? '').trim()) {
				proposalSubmitError = P130_AI_WORKSPACE_PROPOSAL_ERR_CASE_CHANGED;
				return;
			}
			proposalReviewOpen = false;
			proposalSuccess = true;
			markProposalSubmitCompleted();
		} catch (e: unknown) {
			if (capturedCaseId !== String(caseId ?? '').trim()) {
				proposalSubmitError = P130_AI_WORKSPACE_PROPOSAL_ERR_CASE_CHANGED;
				return;
			}
			proposalSubmitError = e instanceof Error ? e.message : String(e);
		} finally {
			proposalSubmitting = false;
		}
	}

	function owuiToken(): string {
		if (!browser) return '';
		return typeof localStorage !== 'undefined' ? String(localStorage.token ?? '') : '';
	}

	$: modelId =
		($models.find((m) => (m as { owned_by?: string }).owned_by === 'ollama') ?? $models[0])?.id ??
		undefined;
	$: modelAvailable = $models.length > 0;

	function preventSubmit(e: Event) {
		e.preventDefault();
	}

	async function runRetrieval() {
		const cid = String(caseId ?? '').trim();
		const token = $caseEngineToken;
		if (!cid || !token) {
			ingestionError = 'case_id or token missing — retrieval blocked.';
			bundle = null;
			return;
		}
		try {
			assertNoMutationAllowed({ phase: 'ingestion_read', caseEngineWriteIntent: false });
		} catch (e: unknown) {
			ingestionError = e instanceof Error ? e.message : String(e);
			return;
		}
		ingestionError = null;
		ingesting = true;
		bundle = null;
		parsedAi = null;
		aiWarnings = [];
		llmError = null;
		parseError = null;
		guardrailError = null;
		resetProposalDraftUi();
		try {
			bundle = await buildCaseRetrievalBundle(cid, token);
		} catch (e: unknown) {
			ingestionError = e instanceof Error ? e.message : String(e);
			bundle = null;
		} finally {
			ingesting = false;
		}
	}

	async function runAiSend() {
		const cid = String(caseId ?? '').trim();
		const token = $caseEngineToken;
		llmError = null;
		parseError = null;
		parsedAi = null;
		aiWarnings = [];
		resetProposalDraftUi();

		if (!promptText.trim()) {
			llmError = 'Enter a message before sending.';
			return;
		}
		if (!token) {
			llmError = P130_AI_WORKSPACE_NEED_BUNDLE_FIRST;
			return;
		}
		if (!modelAvailable || !modelId) {
			llmError = P130_AI_WORKSPACE_NO_MODEL;
			return;
		}
		const tok = owuiToken();
		if (!tok) {
			llmError = P130_AI_WORKSPACE_NO_OWUI_TOKEN;
			return;
		}

		try {
			assertNoMutationAllowed({ phase: 'ai_execution', caseEngineWriteIntent: false });
		} catch (e: unknown) {
			llmError = e instanceof Error ? e.message : String(e);
			return;
		}

		/* Auto-load case context if not yet retrieved for this case. */
		if (!bundle || bundle.case_id !== cid) {
			await runRetrieval();
			if (!bundle) {
				llmError = ingestionError ?? P130_AI_WORKSPACE_NEED_BUNDLE_FIRST;
				return;
			}
		}

		const userLine = promptText.trim();
		submittedPromptText = userLine;
		promptText = '';
		pushActiveMessage('user', userLine);

		aiBusy = true;
		try {
			const { system, user } = buildAiWorkspacePromptPayload({
				caseId: cid,
				userPrompt: userLine,
				bundle
			});
			const res = await generateOpenAIChatCompletion(
				tok,
				{
					model: modelId,
					temperature: 0,
					stream: false,
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: user }
					]
				},
				`${WEBUI_BASE_URL}/api`
			);
			const content: string =
				(res as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? '';
			const parsed = parseAiWorkspaceLlmJsonWithBundle(content, bundle);
			if (!parsed.ok) {
				parseError = `${P130_AI_WORKSPACE_PARSE_ERROR}: ${parsed.message}`;
				return;
			}
			const integrity = validateAiWorkspaceOutputIntegrity(parsed.data, content);
			if (!integrity.ok) {
				guardrailError = AI_WORKSPACE_GUARDRAIL_VIOLATION_MESSAGE;
				return;
			}
			guardrailError = null;
			parsedAi = parsed.data;
			aiWarnings = parsed.warnings;
			rawModelResponse = content;
			lastModelIdUsed = modelId;
			factSelected = Array(parsed.data.source_backed_facts.length).fill(false);
			includeGenerated = false;
			proposalReviewOpen = false;
			proposalSuccess = false;
			proposalSubmitError = null;
			const replyText = String(parsed.data.ai_generated_content ?? '').trim() || 'Structured response ready — review facts below.';
			pushActiveMessage('assistant', replyText);
		} catch (e: unknown) {
			llmError = e instanceof Error ? e.message : String(e);
		} finally {
			aiBusy = false;
		}
	}

	$: caseNumberLabel = ($activeCaseMeta?.case_number ?? '').trim() || caseId || '—';
	$: caseTitleLabel = ($activeCaseMeta?.title ?? '').trim() || '—';
	$: canRetrieve = Boolean(String(caseId ?? '').trim() && $caseEngineToken);
	$: canSendAi =
		canRetrieve &&
		!ingesting &&
		!aiBusy &&
		Boolean(promptText.trim()) &&
		modelAvailable &&
		Boolean(modelId) &&
		Boolean(owuiToken());
</script>

<div
	class="ce-l-ai-workspace flex min-h-0 flex-1 flex-col overflow-hidden bg-[color:var(--ce-l-surface-raised)]"
	data-testid="case-ai-workspace-panel"
	data-p130-ai-workspace="true"
	data-route-case-id={caseId || undefined}
>
	<header
		class="shrink-0 space-y-2 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] px-3 py-3 sm:px-4"
	>
				<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0">
						<h2
							class="m-0 flex items-center gap-2 text-base font-semibold tracking-tight text-[color:var(--ce-l-text-primary)] sm:text-lg"
						>
							<span
								class="case-ai-title-icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/40 bg-violet-950/35 text-violet-100 shadow-sm"
								aria-hidden="true"
							>
								<SparklesSolid className="h-4 w-4" />
							</span>
							{AI_HEADER_TITLE}
						</h2>
						<p class="m-0 mt-1 max-w-2xl text-xs text-[color:var(--ce-l-text-muted)] sm:text-sm">
							{AI_HEADER_HELPER}
						</p>
					</div>
					<button
						type="button"
						class="shrink-0 rounded-md border border-sky-500/45 bg-sky-950/30 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-900/35"
						on:click={newAssistantSession}
					>
						+ New Session
					</button>
		</div>
	</header>

	<div class="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
	<div
		class="ce-l-ai-workspace-primary-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 pb-4 sm:px-4"
		data-testid="case-ai-workspace-primary-scroll"
		data-region="case-ai-workspace-primary-scroll"
	>
		<div
			class="flex items-center justify-between gap-2 px-1 py-0.5"
			data-testid="case-ai-workspace-session-framing"
			aria-label="Assistant session"
		>
			<span class="text-xs text-[color:var(--ce-l-text-muted)]">
				{#if activeSession}
					Session: <span class="font-medium text-[color:var(--ce-l-text-secondary)]">{activeSession.title}</span>
				{:else}
					<span class="text-amber-300/70">No active session</span>
				{/if}
			</span>
			{#if !activeSession}
				<button
					type="button"
					class="rounded border border-sky-500/40 bg-sky-950/25 px-2 py-0.5 text-[11px] font-medium text-sky-100"
					on:click={newAssistantSession}
				>
					+ New Session
				</button>
			{/if}
		</div>

		<div
			class="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
			data-testid="case-ai-workspace-quick-actions"
			aria-label="Suggested prompts"
		>
			{#each QUICK_ACTIONS as qa (qa.id)}
				{@const qc = QUICK_ACTION_COLORS[qa.id] ?? QUICK_ACTION_COLORS['q1']}
				<button
					type="button"
					class="group flex min-h-[4.5rem] flex-col gap-1.5 rounded-lg border px-2.5 py-2.5 text-left text-[11px] text-[color:var(--ce-l-text-primary)] shadow-sm transition focus:outline-none focus:ring-2 {qc.border} {qc.bg} {qc.hover} {qc.ring}"
					on:click={() => applyQuickAction(qa.prompt)}
				>
					<span class="flex min-w-0 items-center gap-2">
						<span
							class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/20 {qc.iconColor}"
							aria-hidden="true"
						>
							{#if qa.id === 'q1'}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
									><path d="M4 6h16M4 12h10M4 18h16" stroke-linecap="round" /></svg
								>
							{:else if qa.id === 'q2'}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
									><circle cx="11" cy="11" r="7" /><path d="m21 21-3.5-3.5M11 8v4l2.5 1.5" stroke-linecap="round" /></svg
								>
							{:else if qa.id === 'q3'}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
									><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" stroke-linecap="round" /></svg
								>
							{:else if qa.id === 'q4'}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
									><circle cx="9" cy="8" r="3" /><circle cx="16" cy="10" r="2.5" /><path d="M3 20c1.5-3 4.5-5 9-5s7.5 2 9 5" stroke-linecap="round" /></svg
								>
							{:else}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
									><path d="M4 20h4l9.5-9.5a2 2 0 0 0-3-3L5 16v4z" stroke-linejoin="round" /><path d="M13 5l6 6" stroke-linecap="round" /></svg
								>
							{/if}
						</span>
						<span class="min-w-0 font-semibold leading-tight {qc.labelColor}">{qa.label}</span>
					</span>
					<span class="leading-snug {DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
						>{qa.sub}</span
					>
				</button>
			{/each}
		</div>

		<section
			class="{DS_PANEL_CLASSES.muted} border border-[color:var(--ce-l-border-default)] px-3 py-2"
			aria-label={P130_AI_WORKSPACE_CASE_CONTEXT_HEADING}
			data-testid="case-ai-workspace-case-context"
		>
			<p class="{DS_TYPE_CLASSES.meta} m-0 flex flex-wrap items-center gap-x-1.5 text-[color:var(--ce-l-text-muted)]">
				<span class="font-medium text-[color:var(--ce-l-text-primary)]">{P130_AI_WORKSPACE_SCOPE_LABEL}</span>
				<span aria-hidden="true">·</span>
				<span class="tabular-nums" data-testid="case-ai-workspace-case-number">{caseNumberLabel}</span>
				<span aria-hidden="true">·</span>
				<span class="font-medium text-[color:var(--ce-l-text-primary)]" data-testid="case-ai-workspace-case-title">{caseTitleLabel}</span>
			</p>
		</section>

		<div
			class="flex min-h-[12rem] max-h-[min(52vh,30rem)] flex-col gap-2 overflow-y-auto rounded-lg border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-base)]/35 p-2"
			aria-label="Assistant conversation"
		>
			{#if activeSession && activeSession.messages.length === 0}
				<div
					class="flex min-h-[11rem] flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center"
					data-testid="case-ai-workspace-chat-empty"
				>
					<div>
						<p class="m-0 text-base font-semibold text-[color:var(--ce-l-text-primary)]">
							Start a new assistant session
						</p>
						<p class="m-0 mt-2 max-w-md text-sm leading-relaxed text-[color:var(--ce-l-text-muted)]">
							{AI_START_PANEL_BODY}
						</p>
					</div>
					<div class="flex flex-wrap items-center justify-center gap-2">
						<button
							type="button"
							class="rounded-md border border-sky-500/45 bg-sky-950/35 px-3 py-2 text-xs font-medium text-sky-100 transition hover:bg-sky-900/40"
							on:click={() => applyQuickAction(QUICK_ACTIONS[0].prompt)}
						>
							Summarize case
						</button>
						<button
							type="button"
							class="rounded-md border border-sky-500/45 bg-sky-950/35 px-3 py-2 text-xs font-medium text-sky-100 transition hover:bg-sky-900/40"
							on:click={() => applyQuickAction(QUICK_ACTIONS[1].prompt)}
						>
							Find gaps
						</button>
						<button
							type="button"
							class="rounded-md border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-3 py-2 text-xs font-medium text-[color:var(--ce-l-text-primary)]"
							on:click={newAssistantSession}
						>
							+ New Session
						</button>
					</div>
				</div>
			{:else if activeSession}
				{#each activeSession.messages as m (m.id)}
					<div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div
							class="max-w-[min(100%,32rem)] rounded-lg border border-[color:var(--ce-l-border-subtle)] px-3 py-2 {m
								.role === 'user'
								? 'bg-sky-950/35'
								: 'bg-[color:var(--ce-l-surface-raised)]'}"
						>
							<div
								class="text-[10px] font-semibold uppercase {DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]"
							>
								{m.role === 'user' ? 'You' : 'AI Assistant'} · {formatMessageTime(m.at)}
							</div>
							<p class="m-0 mt-1 whitespace-pre-wrap text-sm text-[color:var(--ce-l-text-primary)]">
								{m.content}
							</p>
						</div>
					</div>
				{/each}
			{:else}
				<div class="flex min-h-[10rem] flex-col items-center justify-center gap-3 px-4 py-8 text-center">
					<p class="m-0 text-sm text-[color:var(--ce-l-text-muted)]">No active session</p>
					<button
						type="button"
						class="{DS_BTN_CLASSES.primary} text-xs"
						on:click={newAssistantSession}
					>
						+ New Session
					</button>
				</div>
			{/if}
		</div>

		<form data-testid="case-ai-workspace-stub-form" on:submit={preventSubmit} class="space-y-2">
			<textarea
				id="case-ai-workspace-prompt-input"
				class="min-h-[4.5rem] w-full resize-none rounded-lg border border-sky-500/20 bg-[color:var(--ce-l-surface-raised)] px-3 py-2.5 text-sm text-[color:var(--ce-l-text-primary)] shadow-inner placeholder:text-[color:var(--ce-l-text-muted)] focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
				placeholder={P130_AI_WORKSPACE_INPUT_PLACEHOLDER}
				aria-label={P130_AI_WORKSPACE_INPUT_LABEL}
				data-testid="case-ai-workspace-prompt-input"
				autocomplete="off"
				rows="3"
				bind:value={promptText}
			></textarea>
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="rounded-lg border border-sky-500/60 bg-sky-600/25 px-5 py-2 text-sm font-semibold text-sky-50 shadow-sm hover:bg-sky-600/35 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!canSendAi}
					data-testid="case-ai-workspace-ai-send-button"
					title={P130_AI_WORKSPACE_AI_SEND_TITLE}
					on:click={runAiSend}
				>
					{P130_AI_WORKSPACE_AI_SEND_BUTTON}
				</button>
				<button
					type="button"
					class="rounded-lg border border-[color:var(--ce-l-border-default)] bg-transparent px-3 py-2 text-xs font-medium text-[color:var(--ce-l-text-primary)] hover:border-sky-500/30"
					on:click={newAssistantSession}
				>
					+ New
				</button>
				{#if ingesting || aiBusy}
					<span
						class="text-[11px] text-sky-300/80 {aiBusy ? 'case-ai-busy-pill' : ''}"
						data-testid="case-ai-workspace-ingesting-label"
					>
						{#if aiBusy}
							<span class="case-ai-busy-orb" aria-hidden="true"></span>
							<span>{P130_AI_WORKSPACE_AI_BUSY}</span>
							<span class="case-ai-busy-dots" aria-hidden="true"><span></span><span></span><span></span></span>
						{:else}
							{P130_AI_WORKSPACE_INGESTING_LABEL}
						{/if}
					</span>
				{/if}
				{#if aiBusy}
					<span class="hidden" data-testid="case-ai-workspace-ai-busy">{P130_AI_WORKSPACE_AI_BUSY}</span>
				{/if}
			</div>
			<p class="m-0 text-[10px] leading-relaxed text-[color:var(--ce-l-text-muted)]">{AI_COMPOSER_FINE_PRINT}</p>
			<!-- Hidden retrieve button: preserves data-testid contract; auto-triggered by Send when needed -->
			<button
				type="button"
				class="hidden"
				aria-hidden="true"
				tabindex="-1"
				data-testid="case-ai-workspace-retrieve-button"
				on:click={runRetrieval}
			>{P130_AI_WORKSPACE_SEND_RETRIEVE_BUTTON}</button>
		</form>

		{#if ingestionError}
			<div
				class="rounded border border-red-300/80 bg-red-50/80 p-3 dark:border-red-800 dark:bg-red-950/40"
				role="alert"
				data-testid="case-ai-workspace-ingestion-error"
			>
				<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200">
					{ingestionError}
				</p>
			</div>
		{/if}

		<section
			class="space-y-3"
			aria-label="AI Assistant"
			data-testid="case-ai-workspace-output-placeholder"
		>
			<div class="px-0 py-0">
				<!-- Retrieval status: shown only as an inline note when bundle loaded -->
				<div data-testid="case-ai-workspace-retrieval-status" class="hidden">
					{#if bundle}
						<span data-testid="case-ai-workspace-ingestion-success">{P130_AI_WORKSPACE_INGESTION_SUCCESS}</span>
					{:else}
						<span>{P130_AI_WORKSPACE_OUTPUT_EMPTY}</span>
					{/if}
				</div>

				{#if llmError}
					<div
						class="rounded border border-amber-600/50 bg-amber-50/80 p-2 dark:bg-amber-950/30"
						role="alert"
						data-testid="case-ai-workspace-llm-error"
					>
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-amber-900 dark:text-amber-100">
							{llmError}
						</p>
					</div>
				{/if}

				{#if parseError}
					<div
						class="rounded border border-red-300/80 bg-red-50/80 p-2 dark:border-red-800 dark:bg-red-950/40"
						role="alert"
						data-testid="case-ai-workspace-parse-error"
					>
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200">
							{parseError}
						</p>
					</div>
				{/if}

				{#if guardrailError}
					<div
						class="rounded border border-red-300/80 bg-red-50/80 p-2 dark:border-red-800 dark:bg-red-950/40"
						role="alert"
						data-testid="case-ai-workspace-guardrail-error"
					>
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200">
							{guardrailError}
						</p>
					</div>
				{/if}

				{#if parsedAi}
					<div class="space-y-3 border-t border-[color:var(--ce-l-border-default)] pt-3" data-testid="case-ai-workspace-ai-structured">
						<section data-testid="case-ai-workspace-source-backed-facts">
							<h4 class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]">
								{P130_AI_WORKSPACE_SECTION_SOURCE_FACTS}
							</h4>
							<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[color:var(--ce-l-text-muted)]">
								{P130_AI_WORKSPACE_PROPOSAL_SELECT_FACTS_HELP}
							</p>
							<ul class="m-0 mt-2 list-none space-y-3 p-0 text-sm text-[color:var(--ce-l-text-primary)]">
								{#each parsedAi.source_backed_facts as fact, i (i)}
									<li class="rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-2">
										<label class="flex cursor-pointer items-start gap-2">
											<input
												type="checkbox"
												class="mt-0.5 shrink-0"
												checked={factSelected[i] === true}
												data-testid={`case-ai-workspace-proposal-fact-${i}`}
												on:change={() => toggleFact(i)}
											/>
											<span>
												<span class="m-0 block">{fact.statement}</span>
												<span class="{DS_TYPE_CLASSES.meta} mt-0.5 block text-[color:var(--ce-l-text-muted)]">
													From case: timeline {fact.refs.timeline_entry_ids?.length ?? 0}, notes {fact.refs
														.note_ids?.length ?? 0}, files {fact.refs.file_ids?.length ?? 0}, subjects {fact
														.refs.entity_ids?.length ?? 0}, workflow {fact.refs.workflow_item_ids?.length ??
														0}
												</span>
											</span>
										</label>
									</li>
								{/each}
							</ul>
						</section>
						<section data-testid="case-ai-workspace-ai-generated">
							<h4 class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]">
								{P130_AI_WORKSPACE_SECTION_AI_CONTENT}
							</h4>
							<label class="mt-2 flex cursor-pointer items-start gap-2 rounded border border-dashed border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] p-2">
								<input
									type="checkbox"
									class="mt-0.5 shrink-0"
									bind:checked={includeGenerated}
									data-testid="case-ai-workspace-proposal-include-generated"
								/>
								<span class="text-sm text-[color:var(--ce-l-text-primary)]"
									>{P130_AI_WORKSPACE_PROPOSAL_INCLUDE_GENERATED_LABEL}</span
								>
							</label>
							<p class="m-0 mt-2 whitespace-pre-wrap text-sm text-[color:var(--ce-l-text-primary)]">
								{parsedAi.ai_generated_content}
							</p>
						</section>
						<section data-testid="case-ai-workspace-sources-used-declared">
							<h4 class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]">
								{P130_AI_WORKSPACE_SECTION_SOURCES_USED}
							</h4>
							<ul class="m-0 mt-1 list-none space-y-1 text-sm text-[color:var(--ce-l-text-primary)]">
								<li>Timeline: {parsedAi.sources_used.timeline_entry_ids.join(', ') || '—'}</li>
								<li>Notes: {parsedAi.sources_used.note_ids.join(', ') || '—'}</li>
								<li>
									Files:
									{#if parsedAi.sources_used.file_ids.length === 0}
										—
									{:else}
										<ul class="m-0 mt-1 list-disc pl-5">
											{#each parsedAi.sources_used.file_ids as f (f.id)}
												<li>{f.id} · text in use: {f.extracted_text_used ? 'yes' : 'no'}</li>
											{/each}
										</ul>
									{/if}
								</li>
								<li>Subjects: {parsedAi.sources_used.entity_ids.join(', ') || '—'}</li>
								<li>Workflow: {parsedAi.sources_used.workflow_item_ids.join(', ') || '—'}</li>
							</ul>
						</section>

						{#if proposalSuccess}
							<div
								class="rounded border border-emerald-600/50 bg-emerald-50/90 p-3 dark:bg-emerald-950/40"
								role="status"
								data-testid="case-ai-workspace-proposal-success"
							>
								<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-emerald-950 dark:text-emerald-100">
									{P130_AI_WORKSPACE_PROPOSAL_SUCCESS}
								</p>
							</div>
						{/if}

						<div class="space-y-2 border-t border-[color:var(--ce-l-border-default)] pt-3">
							<p class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
								{P130_AI_WORKSPACE_PROPOSAL_CREATE_TITLE}
							</p>
							{#if traceabilityBlockMessage}
								<div
									class="rounded border border-amber-600/50 bg-amber-50/80 p-2 dark:bg-amber-950/30"
									role="alert"
									data-testid="case-ai-workspace-traceability-block"
								>
									<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-amber-950 dark:text-amber-100">
										{traceabilityBlockMessage}
									</p>
									<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
										{P130_AI_WORKSPACE_TRACEABILITY_BLOCK}
									</p>
								</div>
							{/if}
							<button
								type="button"
								class="rounded border border-violet-500/80 bg-violet-950/15 px-3 py-1.5 text-xs font-medium text-[color:var(--ce-l-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
								disabled={!readyForProposalReview || proposalSubmitting}
								data-testid="case-ai-workspace-proposal-create-button"
								title={P130_AI_WORKSPACE_PROPOSAL_CREATE_TITLE}
								on:click={openProposalReview}
							>
								{P130_AI_WORKSPACE_PROPOSAL_CREATE_BUTTON}
							</button>
						</div>

						{#if proposalReviewOpen}
							<div
								class="space-y-3 rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)] p-3"
								data-testid="case-ai-workspace-proposal-review-panel"
							>
								<p class="{DS_TYPE_CLASSES.label} m-0 text-[color:var(--ce-l-text-secondary)]">
									{P130_AI_WORKSPACE_PROPOSAL_REVIEW_HEADING}
								</p>
								<p
									class="{DS_TYPE_CLASSES.body} m-0 rounded border border-amber-600/40 bg-amber-50/80 p-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
								>
									{P130_AI_WORKSPACE_PROPOSAL_NOT_TIMELINE}
								</p>
								<label class="flex flex-col gap-1">
									<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]"
										>{P130_AI_WORKSPACE_PROPOSAL_REVIEW_OCCURRED_AT}</span
									>
									<input
										class="rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-2 py-1 font-mono text-xs text-[color:var(--ce-l-text-primary)]"
										bind:value={reviewOccurredAt}
										data-testid="case-ai-workspace-proposal-review-occurred-at"
										autocomplete="off"
									/>
								</label>
								<label class="flex flex-col gap-1">
									<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]"
										>{P130_AI_WORKSPACE_PROPOSAL_REVIEW_TYPE}</span
									>
									<input
										class="rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-2 py-1 text-xs text-[color:var(--ce-l-text-primary)]"
										bind:value={reviewType}
										data-testid="case-ai-workspace-proposal-review-type"
										autocomplete="off"
									/>
								</label>
								<label class="flex flex-col gap-1">
									<span class="{DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]"
										>{P130_AI_WORKSPACE_PROPOSAL_REVIEW_TEXT}</span
									>
									<textarea
										class="min-h-[8rem] w-full resize-y rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
										bind:value={reviewText}
										data-testid="case-ai-workspace-proposal-review-text"
										rows="6"
									></textarea>
								</label>
								<div>
									<p class="{DS_TYPE_CLASSES.meta} m-0 text-[color:var(--ce-l-text-muted)]">
										{P130_AI_WORKSPACE_PROPOSAL_SOURCE_REFS_PREVIEW}
									</p>
									<pre
										class="mt-1 max-h-40 overflow-auto rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-2 font-mono text-[10px] text-[color:var(--ce-l-text-primary)]"
										data-testid="case-ai-workspace-proposal-review-source-refs">{reviewSourceRefsPreview}</pre>
								</div>
								{#if proposalSubmitError}
									<div
										class="rounded border border-red-300/80 bg-red-50/80 p-2 dark:border-red-800 dark:bg-red-950/40"
										role="alert"
										data-testid="case-ai-workspace-proposal-submit-error"
									>
										<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-red-800 dark:text-red-200">
											{proposalSubmitError}
										</p>
									</div>
								{/if}
								<div class="flex flex-wrap gap-2">
									<button
										type="button"
										class="rounded border border-violet-500/80 bg-violet-950/20 px-3 py-1.5 text-xs font-medium text-[color:var(--ce-l-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
										disabled={proposalSubmitting}
										data-testid="case-ai-workspace-proposal-confirm"
										on:click={confirmProposalSubmit}
									>
										{proposalSubmitting
											? P130_AI_WORKSPACE_PROPOSAL_SUBMITTING
											: P130_AI_WORKSPACE_PROPOSAL_CONFIRM}
									</button>
									<button
										type="button"
										class="rounded border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-3 py-1.5 text-xs font-medium text-[color:var(--ce-l-text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
										disabled={proposalSubmitting}
										data-testid="case-ai-workspace-proposal-cancel"
										on:click={cancelProposalReview}
									>
										{P130_AI_WORKSPACE_PROPOSAL_CANCEL}
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				{#if displayWarnings.length > 0}
					<div
						class="rounded border border-amber-600/50 bg-amber-50/80 p-2 dark:bg-amber-950/30"
						data-testid="case-ai-workspace-warnings"
					>
						<p class="{DS_TYPE_CLASSES.label} m-0 text-amber-950 dark:text-amber-100">
							{P130_AI_WORKSPACE_TRACEABILITY_WARNINGS}
						</p>
						<ul class="m-0 mt-1 list-disc pl-5 text-sm text-amber-900 dark:text-amber-50">
							{#each displayWarnings as w (w)}
								<li>{w}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</section>
	</div>
		</div>

		<aside
			class="flex w-full min-w-0 shrink-0 flex-col gap-3 overflow-y-auto border-t border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-muted)]/50 px-3 py-3 lg:w-[19rem] lg:border-l lg:border-t-0 lg:px-3"
			aria-label="Assistant support"
		>
			<section
				class="rounded-lg border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
				aria-labelledby="case-ai-workspace-p130-title"
				data-testid="case-ai-workspace-framing"
			>
				<button
					type="button"
					id="case-ai-workspace-p130-title"
					class="flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-secondary)]"
					aria-expanded={aboutAssistantExpanded}
					on:click={() => (aboutAssistantExpanded = !aboutAssistantExpanded)}
				>
					<span>About AI Assistant</span>
					<span class="text-[10px] normal-case tracking-normal text-[color:var(--ce-l-text-muted)]" aria-hidden="true">
						{aboutAssistantExpanded ? 'Hide' : 'Show'}
					</span>
				</button>
				{#if aboutAssistantExpanded}
					<ul
						class="m-0 mt-2 list-none space-y-1.5 p-0 text-[11px] leading-snug text-[color:var(--ce-l-text-muted)]"
					>
						<li class="flex gap-1.5">
							<span class="text-sky-400/90" aria-hidden="true">·</span>
							<span>AI is assistant-only</span>
						</li>
						<li class="flex gap-1.5">
							<span class="text-sky-400/90" aria-hidden="true">·</span>
							<span>You decide what to use</span>
						</li>
						<li class="flex gap-1.5">
							<span class="text-sky-400/90" aria-hidden="true">·</span>
							<span>Nothing is official until accepted</span>
						</li>
						<li class="flex gap-1.5">
							<span class="text-sky-400/90" aria-hidden="true">·</span>
							<span>AI cannot write directly to the Timeline</span>
						</li>
					</ul>
					<p class="{DS_BANNER_CLASSES.body} m-0 mt-2 text-[10px] leading-snug text-[color:var(--ce-l-text-muted)]">
						{P130_AI_WORKSPACE_CORE_PRINCIPLE}
					</p>
				{/if}
			</section>

			<section
				class="rounded-lg border border-dashed border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3"
				aria-labelledby="case-ai-workspace-data-used-heading"
				data-testid="case-ai-workspace-data-used"
			>
				<h3
					id="case-ai-workspace-data-used-heading"
					class="{DS_TYPE_CLASSES.label} m-0 text-[11px] text-[color:var(--ce-l-text-secondary)]"
				>
					{P130_AI_WORKSPACE_DATA_USED_SECTION_TITLE}
				</h3>
				<p class="{DS_TYPE_CLASSES.meta} m-0 mt-1 text-[10px] text-[color:var(--ce-l-text-muted)]">
					{P130_AI_WORKSPACE_DATA_USED_SECTION_INTRO}
				</p>
				{#if bundle}
					<ul
						class="m-0 mt-2 list-none space-y-0.5 p-0 text-[11px] text-[color:var(--ce-l-text-primary)]"
						data-testid="case-ai-workspace-data-used-counts"
					>
						<li data-testid="case-ai-workspace-count-timeline">
							{P130_AI_WORKSPACE_DATA_USED_TIMELINE}:
							<span class="tabular-nums">{bundle.sources.timeline.length}</span>
						</li>
						<li data-testid="case-ai-workspace-count-notes">
							{P130_AI_WORKSPACE_DATA_USED_NOTES}:
							<span class="tabular-nums">{bundle.sources.notes.length}</span>
						</li>
						<li data-testid="case-ai-workspace-count-files">
							{P130_AI_WORKSPACE_DATA_USED_FILES}:
							<span class="tabular-nums">{bundle.sources.files.length}</span>
						</li>
						<li data-testid="case-ai-workspace-count-entities">
							{P130_AI_WORKSPACE_DATA_USED_ENTITIES}:
							<span class="tabular-nums">{bundle.sources.entities.length}</span>
						</li>
						<li data-testid="case-ai-workspace-count-workflow">
							{P130_AI_WORKSPACE_DATA_USED_WORKFLOW}:
							<span class="tabular-nums">{bundle.sources.workflow.length}</span>
						</li>
						<li class="text-[color:var(--ce-l-text-muted)]">
							Activity:
							<span class="tabular-nums">—</span>
							<span class="block text-[9px] leading-tight text-[color:var(--ce-l-text-muted)]/80"
								>Not included in assistant context</span
							>
						</li>
					</ul>
				{:else}
					<p class="{DS_TYPE_CLASSES.meta} m-0 mt-2 text-[color:var(--ce-l-text-muted)]">—</p>
				{/if}
			</section>

			<section class="rounded-lg border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3">
				<div class="flex items-center justify-between gap-2">
					<h3 class="m-0 text-[11px] font-semibold text-[color:var(--ce-l-text-primary)]">Sessions</h3>
					<button
						type="button"
						class="rounded border border-sky-500/40 bg-sky-950/20 px-2 py-0.5 text-[10px] font-medium text-sky-100 hover:bg-sky-900/30"
						on:click={newAssistantSession}
					>
						+ New Session
					</button>
				</div>
				{#if sessions.length === 0}
					<p class="m-0 mt-1.5 text-[10px] {DS_TYPE_CLASSES.meta} text-[color:var(--ce-l-text-muted)]">No sessions yet — start one above.</p>
				{:else}
					<ul class="m-0 mt-1.5 list-none space-y-1 p-0">
						{#each sessions as s (s.id)}
							<li class="flex items-center gap-1">
								<button
									type="button"
									class="min-w-0 flex-1 truncate rounded border border-transparent px-1.5 py-1 text-left text-[10px] {s.id === activeSessionId ? 'border-sky-500/40 bg-sky-950/20 text-sky-100' : 'text-[color:var(--ce-l-text-secondary)] hover:border-sky-500/25 hover:text-sky-100/90'}"
									on:click={() => openAssistantSession(s.id)}
								>
									<span class="block truncate font-medium">{s.title}</span>
									<span class="block text-[9px] text-[color:var(--ce-l-text-muted)]">{s.preview.slice(0,36)}{s.preview.length > 36 ? '…' : ''}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="rounded-lg border border-sky-500/20 bg-sky-950/15 p-3" aria-label="Suggested actions">
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold text-sky-100/90"
					aria-expanded={suggestedActionsExpanded}
					on:click={() => (suggestedActionsExpanded = !suggestedActionsExpanded)}
				>
					<span>Suggested actions</span>
					<span class="text-[10px] text-sky-200/70" aria-hidden="true">
						{suggestedActionsExpanded ? 'Hide' : 'Show'}
					</span>
				</button>
				{#if suggestedActionsExpanded}
					<p class="m-0 mt-1 text-[9px] text-[color:var(--ce-l-text-muted)]">Tap to add to your message.</p>
					<div class="mt-2 flex flex-col gap-1.5">
						{#each RIGHT_RAIL_SUGGESTED_ACTIONS as sa (sa.id)}
							{@const sc = QUICK_ACTION_COLORS[sa.id] ?? QUICK_ACTION_COLORS['q1']}
							<button
								type="button"
								class="rounded border px-2 py-1.5 text-left text-[10px] transition {sc.border} {sc.bg} {sc.labelColor} hover:opacity-90"
								on:click={() => applyQuickAction(sa.prompt)}
							>
								{sa.label}
							</button>
						{/each}
					</div>
				{/if}
			</section>

			<section class="rounded-lg border border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] p-3 text-[11px]">
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 text-left font-semibold text-[color:var(--ce-l-text-secondary)]"
					aria-expanded={assistantHelpExpanded}
					on:click={() => (assistantHelpExpanded = !assistantHelpExpanded)}
				>
					<span>What the assistant can do</span>
					<span class="text-[10px] font-semibold text-[color:var(--ce-l-text-muted)]" aria-hidden="true">
						{assistantHelpExpanded ? 'Hide' : 'Show'}
					</span>
				</button>
				{#if assistantHelpExpanded}
					<ul class="m-0 mt-1.5 list-none space-y-1 p-0 text-[color:var(--ce-l-text-muted)]">
						<li class="flex gap-1.5"><span class="text-emerald-400/80" aria-hidden="true">✓</span> Analyze and summarize case sources</li>
						<li class="flex gap-1.5"><span class="text-emerald-400/80" aria-hidden="true">✓</span> Suggest follow-ups and identify gaps</li>
						<li class="flex gap-1.5"><span class="text-emerald-400/80" aria-hidden="true">✓</span> Draft content for your review only</li>
						<li class="flex gap-1.5"><span class="text-emerald-400/80" aria-hidden="true">✓</span> Explain what's in the loaded context</li>
					</ul>
					<p class="m-0 mt-2 font-semibold text-[color:var(--ce-l-text-secondary)]">What it cannot do</p>
					<ul class="m-0 mt-1.5 list-none space-y-1 p-0 text-[color:var(--ce-l-text-muted)]">
						<li class="flex gap-1.5"><span class="text-amber-400/80" aria-hidden="true">✗</span> Change the official Timeline</li>
						<li class="flex gap-1.5"><span class="text-amber-400/80" aria-hidden="true">✗</span> Create records without your review</li>
						<li class="flex gap-1.5"><span class="text-amber-400/80" aria-hidden="true">✗</span> Use data outside this case</li>
						<li class="flex gap-1.5"><span class="text-amber-400/80" aria-hidden="true">✗</span> Bypass the proposal review path</li>
					</ul>
				{/if}
			</section>
		</aside>
	</div>
</div>

<style>
	.case-ai-title-icon {
		position: relative;
		overflow: hidden;
		background-image:
			radial-gradient(circle at 28% 18%, rgba(255, 255, 255, 0.42), transparent 24%),
			linear-gradient(145deg, rgba(76, 29, 149, 0.92), rgba(30, 41, 98, 0.68) 52%, rgba(14, 165, 233, 0.32));
		box-shadow:
			0 0 0 1px rgba(168, 85, 247, 0.16),
			0 0 18px rgba(124, 58, 237, 0.22);
	}

	.case-ai-title-icon::before {
		content: '';
		position: absolute;
		inset: -42%;
		background: linear-gradient(
			115deg,
			transparent 28%,
			rgba(192, 132, 252, 0.18) 42%,
			rgba(255, 255, 255, 0.46) 50%,
			rgba(125, 211, 252, 0.2) 58%,
			transparent 72%
		);
		transform: translateX(-72%) rotate(10deg);
		animation: case-ai-title-icon-roll 3.8s ease-in-out infinite;
		pointer-events: none;
	}

	.case-ai-title-icon :global(svg) {
		position: relative;
		z-index: 1;
		filter: drop-shadow(0 0 5px rgba(216, 180, 254, 0.5));
	}

	@keyframes case-ai-title-icon-roll {
		0%,
		36% {
			transform: translateX(-72%) rotate(10deg);
			opacity: 0;
		}
		48% {
			opacity: 0.95;
		}
		68% {
			transform: translateX(72%) rotate(10deg);
			opacity: 0;
		}
		100% {
			transform: translateX(72%) rotate(10deg);
			opacity: 0;
		}
	}

	.case-ai-busy-pill {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		overflow: hidden;
		border-radius: 999px;
		border: 1px solid rgba(168, 85, 247, 0.35);
		background:
			linear-gradient(135deg, rgba(88, 28, 135, 0.34), rgba(14, 116, 144, 0.18)),
			rgba(2, 6, 23, 0.22);
		padding: 0.25rem 0.55rem;
		color: rgb(224, 242, 254);
		box-shadow:
			0 0 0 1px rgba(14, 165, 233, 0.08),
			0 0 18px rgba(124, 58, 237, 0.18);
	}

	.case-ai-busy-pill::before {
		content: '';
		position: absolute;
		inset: -45%;
		background: linear-gradient(
			110deg,
			transparent 30%,
			rgba(192, 132, 252, 0.16) 43%,
			rgba(255, 255, 255, 0.42) 50%,
			rgba(125, 211, 252, 0.18) 57%,
			transparent 70%
		);
		transform: translateX(-70%) rotate(8deg);
		animation: case-ai-busy-sheen 2.2s ease-in-out infinite;
		pointer-events: none;
	}

	.case-ai-busy-pill > span {
		position: relative;
		z-index: 1;
	}

	.case-ai-busy-orb {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 999px;
		background: rgb(216, 180, 254);
		box-shadow: 0 0 10px rgba(192, 132, 252, 0.8);
		animation: case-ai-busy-pulse 1.2s ease-in-out infinite;
	}

	.case-ai-busy-dots {
		display: inline-flex;
		gap: 0.16rem;
		align-items: center;
	}

	.case-ai-busy-dots span {
		width: 0.2rem;
		height: 0.2rem;
		border-radius: 999px;
		background: currentColor;
		opacity: 0.45;
		animation: case-ai-busy-dot 1.05s ease-in-out infinite;
	}

	.case-ai-busy-dots span:nth-child(2) {
		animation-delay: 0.14s;
	}

	.case-ai-busy-dots span:nth-child(3) {
		animation-delay: 0.28s;
	}

	@keyframes case-ai-busy-sheen {
		0%,
		22% {
			transform: translateX(-70%) rotate(8deg);
			opacity: 0;
		}
		42% {
			opacity: 0.95;
		}
		70%,
		100% {
			transform: translateX(70%) rotate(8deg);
			opacity: 0;
		}
	}

	@keyframes case-ai-busy-pulse {
		0%,
		100% {
			transform: scale(0.82);
			opacity: 0.62;
		}
		50% {
			transform: scale(1.18);
			opacity: 1;
		}
	}

	@keyframes case-ai-busy-dot {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		50% {
			transform: translateY(-0.12rem);
			opacity: 1;
		}
	}
</style>
