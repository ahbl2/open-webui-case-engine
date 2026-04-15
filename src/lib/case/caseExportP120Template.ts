/**
 * P120-04 — Closed template id set aligned with Case Engine `P120_TEMPLATE_TYPES` (no speculative values).
 */
export const CASE_EXPORT_P120_TEMPLATE_IDS = ['RAW_EXPORT', 'CHRONOLOGICAL_REPORT', 'TIMELINE_WITH_NOTES'] as const;

export type CaseExportP120TemplateId = (typeof CASE_EXPORT_P120_TEMPLATE_IDS)[number];

/** `p119` = legacy P119 plain-text render (omit `template` in request body). */
export type CaseExportPhase120Mode = 'p119' | CaseExportP120TemplateId;
