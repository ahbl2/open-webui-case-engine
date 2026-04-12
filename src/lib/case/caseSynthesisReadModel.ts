/**
 * P96-01 — Case synthesis read model (read-only, non-persisted, single-case).
 *
 * Authority: `timeline_facts` are the only chronological facts; they come exclusively
 * from official Timeline (`timeline_entries`). Tasks, files, and extracted text appear
 * only under `supporting_context` and must not be treated as Timeline facts.
 *
 * Mutations: this module performs no writes to Case Engine. Callers must use existing
 * read-only GET-style APIs (or injected test doubles) — never intake/proposal/task/timeline
 * mutation endpoints from this path.
 *
 * Persistence: `CaseSynthesisReadModel` is an in-memory contract only. Nothing here is
 * stored to localStorage, IndexedDB, or the server unless a future phase explicitly adds that.
 *
 * AI: no model calls; aggregation is deterministic string normalization only.
 */
import type { CaseFile, TimelineEntry } from '$lib/apis/caseEngine';
import { getCaseFileText, listCaseFiles, listCaseTimelineEntries } from '$lib/apis/caseEngine';
import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';
import { listCaseTasks } from '$lib/apis/caseEngine/caseTasksApi';
import { sortTimelineEntriesOfficialOrder } from '$lib/caseTimeline/timelineEntriesOfficialSort';

/** Maximum characters for extracted_text reference_text (deterministic cap; no semantic truncation). */
const EXTRACTED_TEXT_REFERENCE_MAX_CHARS = 4000;

export interface CaseSynthesisTimelineFact {
	entry_id: string;
	occurred_at: string;
	summary_text: string;
	source_type: 'timeline';
}

export type CaseSynthesisSupportingSourceType = 'task' | 'file' | 'extracted_text';

export interface CaseSynthesisSupportingContextItem {
	source_type: CaseSynthesisSupportingSourceType;
	source_id: string;
	reference_text: string;
	/** Factual cross-reference only — no inferred narrative. */
	relation_hint?: string;
}

export interface CaseSynthesisGapOrUnknown {
	description: string;
	related_source_ids: string[];
}

export interface CaseSynthesisTrace {
	timeline_entry_ids: string[];
	task_ids: string[];
	file_ids: string[];
}

/**
 * Structured read-only synthesis envelope for “what we know so far”.
 * All sections are always present (use empty arrays when unused).
 */
export interface CaseSynthesisReadModel {
	case_id: string;
	/** Runtime-only timestamp for inspection; excluded from determinism checks. */
	generated_at: string;
	timeline_facts: CaseSynthesisTimelineFact[];
	supporting_context: CaseSynthesisSupportingContextItem[];
	gaps_and_unknowns: CaseSynthesisGapOrUnknown[];
	trace: CaseSynthesisTrace;
}

export interface CaseSynthesisSnapshotInput {
	caseId: string;
	timelineEntries: TimelineEntry[];
	tasks: CaseEngineCaseTask[];
	files: CaseFile[];
	/**
	 * Optional map of file id → extracted text from read-only GET /files/:id/text.
	 * Values are included as `extracted_text` supporting rows (deterministic trim/cap only).
	 */
	fileExtractedTextByFileId?: Readonly<Record<string, string>>;
	/** ISO 8601 instant for `generated_at` (tests pass fixed value for reproducibility). */
	generatedAtIso: string;
}

/** Light normalization: trim and collapse internal whitespace (no paraphrase). */
export function normalizeSynthesisReferenceText(raw: string): string {
	return raw.replace(/\s+/g, ' ').trim();
}

function isActiveTimelineEntry(e: TimelineEntry): boolean {
	return e.deleted_at == null || e.deleted_at === '';
}

function isActiveTask(t: CaseEngineCaseTask): boolean {
	return t.deleted_at == null || t.deleted_at === '';
}

function isActiveCaseFile(f: CaseFile): boolean {
	const d = (f as Record<string, unknown>).deleted_at;
	return d == null || d === '';
}

function taskReferenceText(task: CaseEngineCaseTask): string {
	const title = normalizeSynthesisReferenceText(task.title);
	const desc = task.description ? normalizeSynthesisReferenceText(task.description) : '';
	if (title && desc) return `${title} — ${desc}`;
	return title || desc || task.id;
}

/**
 * Pure builder: maps already-fetched read data into {@link CaseSynthesisReadModel}.
 * Timeline rows are sorted by official order (occurred_at ASC, id ASC); entries are not merged.
 */
export function buildCaseSynthesisReadModelFromSnapshot(input: CaseSynthesisSnapshotInput): CaseSynthesisReadModel {
	const activeEntries = sortTimelineEntriesOfficialOrder(
		input.timelineEntries.filter(isActiveTimelineEntry)
	);

	const timeline_facts: CaseSynthesisTimelineFact[] = activeEntries.map((e) => ({
		entry_id: e.id,
		occurred_at: e.occurred_at,
		summary_text: normalizeSynthesisReferenceText(
			(e.text_cleaned != null && e.text_cleaned !== '' ? e.text_cleaned : e.text_original) ?? ''
		),
		source_type: 'timeline' as const
	}));

	const activeTasks = input.tasks.filter(isActiveTask).sort((a, b) => a.id.localeCompare(b.id));
	const activeFiles = input.files.filter(isActiveCaseFile).sort((a, b) => a.id.localeCompare(b.id));

	const supporting_context: CaseSynthesisSupportingContextItem[] = [];

	for (const task of activeTasks) {
		supporting_context.push({
			source_type: 'task',
			source_id: task.id,
			reference_text: taskReferenceText(task),
			relation_hint:
				task.timeline_entry_id != null && task.timeline_entry_id !== ''
					? `timeline_entry_ref:${task.timeline_entry_id}`
					: undefined
		});
	}

	for (const file of activeFiles) {
		supporting_context.push({
			source_type: 'file',
			source_id: file.id,
			reference_text: normalizeSynthesisReferenceText(file.original_filename || file.id)
		});
	}

	const extractedMap = input.fileExtractedTextByFileId ?? {};
	for (const file of activeFiles) {
		const full = extractedMap[file.id];
		if (full == null || full === '') continue;
		const capped =
			full.length > EXTRACTED_TEXT_REFERENCE_MAX_CHARS
				? full.slice(0, EXTRACTED_TEXT_REFERENCE_MAX_CHARS)
				: full;
		supporting_context.push({
			source_type: 'extracted_text',
			source_id: file.id,
			reference_text: normalizeSynthesisReferenceText(capped),
			relation_hint: 'source_case_file'
		});
	}

	const gaps_and_unknowns: CaseSynthesisGapOrUnknown[] = [];
	if (timeline_facts.length === 0) {
		gaps_and_unknowns.push({
			description: 'No active timeline entries in this case scope.',
			related_source_ids: []
		});
	}

	const timeline_entry_ids = timeline_facts.map((f) => f.entry_id);
	const task_ids = activeTasks.map((t) => t.id).sort((a, b) => a.localeCompare(b));
	const fileIdSet = new Set<string>();
	for (const f of activeFiles) {
		fileIdSet.add(f.id);
	}
	const file_ids = [...fileIdSet].sort((a, b) => a.localeCompare(b));

	return {
		case_id: input.caseId,
		generated_at: input.generatedAtIso,
		timeline_facts,
		supporting_context,
		gaps_and_unknowns,
		trace: {
			timeline_entry_ids,
			task_ids,
			file_ids
		}
	};
}

export interface CaseSynthesisReadModelDeps {
	listTimeline: (
		caseId: string,
		token: string,
		opts?: { signal?: AbortSignal }
	) => Promise<TimelineEntry[]>;
	listTasks: (caseId: string, token: string) => Promise<CaseEngineCaseTask[]>;
	listFiles: (caseId: string, token: string) => Promise<CaseFile[]>;
	getFileText: (fileId: string, token: string) => Promise<{ extracted_text: string }>;
}

const defaultDeps: CaseSynthesisReadModelDeps = {
	listTimeline: (caseId, token, opts) => listCaseTimelineEntries(caseId, token, { signal: opts?.signal }),
	listTasks: (caseId, token) => listCaseTasks(caseId, token),
	listFiles: (caseId, token) => listCaseFiles(caseId, token),
	getFileText: async (fileId, token) => getCaseFileText(fileId, token)
};

/**
 * Read-only aggregator: fetches Timeline, Tasks, and Files via existing contracts,
 * optionally attaches extracted text (GET only), and returns a {@link CaseSynthesisReadModel}.
 */
export async function buildCaseSynthesisReadModel(
	caseId: string,
	token: string,
	options?: {
		signal?: AbortSignal;
		includeFileExtractedText?: boolean;
		/** Fixed clock for tests (defaults to `new Date().toISOString()`). */
		generatedAtIso?: string;
		deps?: Partial<CaseSynthesisReadModelDeps>;
	}
): Promise<CaseSynthesisReadModel> {
	const deps: CaseSynthesisReadModelDeps = { ...defaultDeps, ...options?.deps };
	const generatedAtIso = options?.generatedAtIso ?? new Date().toISOString();

	const [timelineEntries, tasks, files] = await Promise.all([
		deps.listTimeline(caseId, token, { signal: options?.signal }),
		deps.listTasks(caseId, token),
		deps.listFiles(caseId, token)
	]);

	let fileExtractedTextByFileId: Record<string, string> | undefined;
	if (options?.includeFileExtractedText) {
		fileExtractedTextByFileId = {};
		const activeFiles = files.filter(isActiveCaseFile);
		for (const f of activeFiles) {
			try {
				const body = await deps.getFileText(f.id, token);
				if (body.extracted_text != null && body.extracted_text !== '') {
					fileExtractedTextByFileId[f.id] = body.extracted_text;
				}
			} catch {
				/* Read-only: absence of text is omitted; optional gaps may be added in later tickets. */
			}
		}
	}

	return buildCaseSynthesisReadModelFromSnapshot({
		caseId,
		timelineEntries,
		tasks,
		files,
		fileExtractedTextByFileId,
		generatedAtIso
	});
}

/** For tests: compare deterministic fields without `generated_at`. */
export function caseSynthesisReadModelWithoutGeneratedAt(
	model: CaseSynthesisReadModel
): Omit<CaseSynthesisReadModel, 'generated_at'> {
	return {
		case_id: model.case_id,
		timeline_facts: model.timeline_facts,
		supporting_context: model.supporting_context,
		gaps_and_unknowns: model.gaps_and_unknowns,
		trace: model.trace
	};
}

/** Dev-only: log label for console inspection (`?p96_synthesis=1` on case workspace). */
export const CASE_SYNTHESIS_READ_MODEL_DEV_LOG_LABEL = '[P96-01] CaseSynthesisReadModel';
