/**
 * P100-04 — Load Case Engine reads for Case Understanding aggregation (read-only GETs).
 */

import {
	listCaseFiles,
	listCaseNotebookNotes,
	listCaseTimelineEntries
} from '$lib/apis/caseEngine';
import { listCaseTasks } from '$lib/apis/caseEngine/caseTasksApi';
import {
	buildCaseUnderstandingSourceRecordsFromReads,
	type CaseUnderstandingReadPayloads
} from '$lib/case/caseUnderstandingSourceRecords';

export async function loadCaseUnderstandingReadPayloads(
	caseId: string,
	token: string,
	options?: { signal?: AbortSignal }
): Promise<CaseUnderstandingReadPayloads> {
	const cid = caseId.trim();
	if (!cid) {
		return { timeline: [], tasks: [], files: [], notes: [] };
	}

	const [timeline, tasks, files, notes] = await Promise.all([
		listCaseTimelineEntries(cid, token, { signal: options?.signal }),
		listCaseTasks(cid, token),
		listCaseFiles(cid, token),
		listCaseNotebookNotes(cid, token)
	]);

	return {
		timeline,
		tasks,
		files,
		notes
	};
}

export async function loadCaseUnderstandingSourceRecords(
	caseId: string,
	token: string,
	options?: { signal?: AbortSignal }
) {
	const payloads = await loadCaseUnderstandingReadPayloads(caseId, token, options);
	return buildCaseUnderstandingSourceRecordsFromReads(caseId.trim(), payloads);
}
