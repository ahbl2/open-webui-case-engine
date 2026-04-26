/**
 * P130-01 — AI Workspace surface copy (static strings only; no logic).
 */

export const P130_AI_WORKSPACE_SURFACE_TITLE = 'AI Workspace';

/** Sidebar nav `title` (short boundary hint). */
export const P130_NAV_TITLE_AI_WORKSPACE =
	'Non-authoritative assistant only. Timeline is the official record. Nothing here is auto-saved.';

export const P130_AI_WORKSPACE_CORE_PRINCIPLE =
	'AI suggests. The user decides. The system records.';

export const P130_AI_WORKSPACE_SCOPE_LABEL = 'This Case';

export const P130_AI_WORKSPACE_ROLE_ASSISTANT =
	'AI is an assistant only. It does not apply changes to your case.';

export const P130_AI_WORKSPACE_ROLE_NO_MUTATION =
	'AI does not modify Timeline, Notes, Workflow, Files, or Entities.';

export const P130_AI_WORKSPACE_ROLE_REVIEW =
	'Every suggestion requires your review before any system action.';

export const P130_AI_WORKSPACE_ROLE_NO_TIMELINE_WRITE = 'AI cannot write to the Timeline.';

export const P130_AI_WORKSPACE_BOUNDARY_TIMELINE =
	'Timeline: the authoritative record for this case (official committed entries).';

export const P130_AI_WORKSPACE_BOUNDARY_AI =
	'AI output: non-authoritative. It is not a system record until you use a separate, explicit step.';

export const P130_AI_WORKSPACE_BOUNDARY_PROPOSALS =
	'Proposals: the governed path for new official content. You may send a draft from here only via explicit steps — nothing is created automatically.';

export const P130_AI_WORKSPACE_PROPOSAL_SELECT_FACTS_HELP =
	'Select which source-backed facts to include (verbatim). Nothing is pre-selected.';

export const P130_AI_WORKSPACE_PROPOSAL_INCLUDE_GENERATED_LABEL =
	'Include AI-generated content block (optional, verbatim; non-authoritative)';

export const P130_AI_WORKSPACE_PROPOSAL_CREATE_BUTTON = 'Create Proposal Draft';

export const P130_AI_WORKSPACE_PROPOSAL_CREATE_TITLE =
	'Build a timeline-entry proposal draft from your selection. Does not write the Timeline.';

export const P130_AI_WORKSPACE_PROPOSAL_REVIEW_HEADING = 'Proposal draft review';

export const P130_AI_WORKSPACE_PROPOSAL_NOT_TIMELINE =
	'This is not yet part of the Timeline. It becomes a staged proposal only after you confirm.';

export const P130_AI_WORKSPACE_PROPOSAL_REVIEW_OCCURRED_AT = 'occurred_at (ISO 8601, timezone)';

export const P130_AI_WORKSPACE_PROPOSAL_REVIEW_TYPE = 'type';

export const P130_AI_WORKSPACE_PROPOSAL_REVIEW_TEXT = 'Proposed text (you may edit before submit)';

export const P130_AI_WORKSPACE_PROPOSAL_SOURCE_REFS_PREVIEW = 'Source references (from selected facts)';

export const P130_AI_WORKSPACE_PROPOSAL_CONFIRM = 'Submit proposal draft';

export const P130_AI_WORKSPACE_PROPOSAL_CANCEL = 'Cancel';

export const P130_AI_WORKSPACE_PROPOSAL_SUCCESS =
	'Proposal draft created — review in the Proposals tab.';

export const P130_AI_WORKSPACE_PROPOSAL_SUBMITTING = 'Submitting proposal draft…';

export const P130_AI_WORKSPACE_PROPOSAL_ERR_CASE_CHANGED = 'Case changed before submit; try again.';

export const P130_AI_WORKSPACE_SESSION_LINE_1 =
	'New sessions start a fresh line of investigation for this case.';

export const P130_AI_WORKSPACE_SESSION_LINE_2 = 'No background processing.';

export const P130_AI_WORKSPACE_SESSION_LINE_3 =
	'Session content stays in this browser until you leave or start over.';

export const P130_AI_WORKSPACE_CASE_CONTEXT_HEADING = 'This case';

export const P130_AI_WORKSPACE_INPUT_LABEL = 'Your message to the assistant';

export const P130_AI_WORKSPACE_INPUT_PLACEHOLDER =
	'Ask the AI Assistant about this case...';

export const P130_AI_WORKSPACE_SEND_RETRIEVE_BUTTON = 'Load case context';

export const P130_AI_WORKSPACE_SEND_RETRIEVE_TITLE =
	'Load this case’s timeline, notes, files, people and things, and workflow for the assistant. Read-only; does not run the assistant.';

export const P130_AI_WORKSPACE_INGESTING_LABEL = 'Loading case context…';

export const P130_AI_WORKSPACE_SEND_DISABLED_TITLE = 'Connect to Case Engine and open a case to retrieve data.';

export const P130_AI_WORKSPACE_SEND_DISABLED_BUTTON = 'Retrieve case data (read-only)';

export const P130_AI_WORKSPACE_OUTPUT_REGION_LABEL = 'Assistant reply (not official)';

export const P130_AI_WORKSPACE_AI_SEND_BUTTON = 'Send';

export const P130_AI_WORKSPACE_AI_SEND_TITLE =
	'Send your message using the case context you already loaded. Nothing is written to the case from here.';

export const P130_AI_WORKSPACE_AI_BUSY = 'Assistant is working…';

export const P130_AI_WORKSPACE_NEED_BUNDLE_FIRST = 'Load case context for this case before you send a message.';

export const P130_AI_WORKSPACE_NO_MODEL = 'No chat model available. Select an Ollama model in the workspace.';

export const P130_AI_WORKSPACE_NO_OWUI_TOKEN = 'Open WebUI session token missing.';

export const P130_AI_WORKSPACE_INGESTION_SUCCESS =
	'Case sources are available for assistant context.';

export const P130_AI_WORKSPACE_OUTPUT_EMPTY =
	'No case context loaded yet. Use “Load case context” on this case, then ask the assistant.';

export const P130_AI_WORKSPACE_SECTION_SOURCE_FACTS = 'Facts from your case';

export const P130_AI_WORKSPACE_SECTION_AI_CONTENT = 'Draft text (for your review only)';

export const P130_AI_WORKSPACE_SECTION_SOURCES_USED = 'Case information this reply drew on';

export const P130_AI_WORKSPACE_PARSE_ERROR = 'The reply could not be read as structured output';

export const P130_AI_WORKSPACE_TRACEABILITY_WARNINGS = 'Traceability warnings';

/** Shown when proposal draft is blocked by traceability validation (in addition to server message). */
export const P130_AI_WORKSPACE_TRACEABILITY_BLOCK =
	'Proposal draft requires a full trace (prompt, model response, and valid source refs).';

export const P130_AI_WORKSPACE_DATA_USED_SECTION_TITLE = 'Sources the assistant can use';

export const P130_AI_WORKSPACE_DATA_USED_SECTION_INTRO =
	'Case sources available for assistant context. Counts update after you load context.';

export const P130_AI_WORKSPACE_DATA_USED_TIMELINE = 'Timeline';

export const P130_AI_WORKSPACE_DATA_USED_NOTES = 'Notes';

export const P130_AI_WORKSPACE_DATA_USED_FILES = 'Files';

export const P130_AI_WORKSPACE_DATA_USED_ENTITIES = 'Subjects and assets';

export const P130_AI_WORKSPACE_DATA_USED_WORKFLOW = 'Workflow';

export const P130_AI_WORKSPACE_SOURCES_TRACE_TITLE = 'What loading case context includes';

export const P130_AI_WORKSPACE_SOURCES_TRACE_BODY =
	'By default, timeline, notes, files, subjects and assets, and workflow. Activity is not included in this list.';
