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
	'Proposals: the only governed path for new official content later; not wired on this screen yet.';

export const P130_AI_WORKSPACE_SESSION_LINE_1 = 'AI actions are session-based.';

export const P130_AI_WORKSPACE_SESSION_LINE_2 = 'No background processing.';

export const P130_AI_WORKSPACE_SESSION_LINE_3 =
	'Nothing is saved here unless you take action elsewhere in the product.';

export const P130_AI_WORKSPACE_CASE_CONTEXT_HEADING = 'Active case';

export const P130_AI_WORKSPACE_INPUT_LABEL = 'Prompt (sent only when you click Send to model)';

export const P130_AI_WORKSPACE_INPUT_PLACEHOLDER =
	'Describe what you want the model to do with the retrieved case data. You must retrieve case data first.';

export const P130_AI_WORKSPACE_SEND_RETRIEVE_BUTTON = 'Retrieve case data (read-only)';

export const P130_AI_WORKSPACE_SEND_RETRIEVE_TITLE =
	'Load Timeline, Notes, Files, Entities, and Workflow for this case (GET only). No model call.';

export const P130_AI_WORKSPACE_INGESTING_LABEL = 'Retrieving read-only case data…';

export const P130_AI_WORKSPACE_SEND_DISABLED_TITLE = 'Connect to Case Engine and open a case to retrieve data.';

export const P130_AI_WORKSPACE_SEND_DISABLED_BUTTON = 'Retrieve case data (read-only)';

export const P130_AI_WORKSPACE_OUTPUT_REGION_LABEL = 'AI Output (Non-Authoritative)';

export const P130_AI_WORKSPACE_AI_SEND_BUTTON = 'Send to model';

export const P130_AI_WORKSPACE_AI_SEND_TITLE =
	'Run the local model on the prompt and the in-memory retrieval bundle. No Case Engine writes.';

export const P130_AI_WORKSPACE_AI_BUSY = 'Model running…';

export const P130_AI_WORKSPACE_NEED_BUNDLE_FIRST = 'Retrieve case data first.';

export const P130_AI_WORKSPACE_NO_MODEL = 'No chat model available. Select an Ollama model in the workspace.';

export const P130_AI_WORKSPACE_NO_OWUI_TOKEN = 'Open WebUI session token missing.';

export const P130_AI_WORKSPACE_INGESTION_SUCCESS =
	'Case data retrieved for AI (read-only). No model ran; nothing was saved beyond this session.';

export const P130_AI_WORKSPACE_OUTPUT_EMPTY =
	'No retrieval yet. Use “Retrieve case data” to load read-only case sources for this session.';

export const P130_AI_WORKSPACE_SECTION_SOURCE_FACTS = 'Source-Backed Facts';

export const P130_AI_WORKSPACE_SECTION_AI_CONTENT = 'AI-Generated Content (Non-Authoritative)';

export const P130_AI_WORKSPACE_SECTION_SOURCES_USED = 'Sources Used';

export const P130_AI_WORKSPACE_PARSE_ERROR = 'Unstructured response';

export const P130_AI_WORKSPACE_TRACEABILITY_WARNINGS = 'Traceability warnings';

export const P130_AI_WORKSPACE_DATA_USED_SECTION_TITLE = 'Data Used (This Session)';

export const P130_AI_WORKSPACE_DATA_USED_SECTION_INTRO =
	'Sources read for this session (counts only; full rows stay in memory for a later AI step).';

export const P130_AI_WORKSPACE_DATA_USED_TIMELINE = 'Timeline (authoritative entries)';

export const P130_AI_WORKSPACE_DATA_USED_NOTES = 'Notes (working drafts)';

export const P130_AI_WORKSPACE_DATA_USED_FILES = 'Files (metadata; optional extracted text)';

export const P130_AI_WORKSPACE_DATA_USED_ENTITIES = 'Entities';

export const P130_AI_WORKSPACE_DATA_USED_WORKFLOW = 'Workflow (operational items)';

export const P130_AI_WORKSPACE_SOURCES_TRACE_TITLE =
	'Source coverage (Timeline, Notes, Files, Entities, Workflow)';

export const P130_AI_WORKSPACE_SOURCES_TRACE_BODY =
	'Retrieval uses the same five surfaces; Activity is not included here.';
