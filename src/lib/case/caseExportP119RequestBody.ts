/**
 * P119-04 / P120-04 — Build POST /cases/:id/export/p119 JSON body (matches Case Engine P119-01 inclusion semantics).
 */
import type { CaseExportP120TemplateId, CaseExportPhase120Mode } from '$lib/case/caseExportP120Template';

export type P119ExportFormat = 'json' | 'plain_text';

export function buildP119ExportRequestBody(opts: {
	includeNotes: boolean;
	includeWorkflow: boolean;
	includeRelationships: boolean;
	format: P119ExportFormat;
	/**
	 * Plain text only: `p119` omits `template` (P119 render). Any Phase 120 id sends `template` for P120 assembly + render.
	 */
	phase120Mode?: CaseExportPhase120Mode;
}): { inclusion: Record<string, boolean>; format: P119ExportFormat; template?: CaseExportP120TemplateId } {
	const inclusion: Record<string, boolean> = {};
	if (opts.includeNotes) inclusion.notes = true;
	if (opts.includeWorkflow) inclusion.workflow = true;
	if (opts.includeRelationships) inclusion.relationships = true;
	const base = { inclusion, format: opts.format } as {
		inclusion: Record<string, boolean>;
		format: P119ExportFormat;
		template?: CaseExportP120TemplateId;
	};
	const mode = opts.phase120Mode ?? 'p119';
	if (opts.format === 'plain_text' && mode !== 'p119') {
		base.template = mode;
	}
	return base;
}
