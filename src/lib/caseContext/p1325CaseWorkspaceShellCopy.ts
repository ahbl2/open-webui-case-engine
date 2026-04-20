/**
 * P132.5-01 — Structural labels only for the workspace layout shell placeholders (no investigative copy).
 * P132.5-02 — Timeline route uses `CaseWorkspaceShellPanel` without a shell title (page heading is authoritative).
 * P132.5-03 — Right panel stack title + tab labels (aligned with existing nav short names).
 * P132.5-04 — Left support rail title + compact meta labels (no investigative copy).
 */

export const P1325_SHELL_TIMELINE_PANEL_TITLE = 'Timeline';

/** P132.5-04 — Left rail: context + entities + workflow + demoted nav. */
export const P1325_LEFT_STACK_PANEL_TITLE = 'Case context & support';

/** @deprecated Use P1325_LEFT_STACK_PANEL_TITLE */
export const P1325_SHELL_LEFT_ZONE_TITLE = P1325_LEFT_STACK_PANEL_TITLE;

/** P132.5-04 — Compact case meta block heading. */
export const P1325_LEFT_STACK_SECTION_CASE_CONTEXT = 'Case context';

export const P1325_LEFT_STACK_META_LABEL_NUMBER = 'Number';
export const P1325_LEFT_STACK_META_LABEL_TITLE = 'Title';
export const P1325_LEFT_STACK_META_LABEL_UNIT = 'Unit';
export const P1325_LEFT_STACK_META_LABEL_STATUS = 'Status';

/** Right rail: Activity + AI Workspace + Proposals (internal tabs; no route navigation). */
export const P1325_RIGHT_STACK_PANEL_TITLE = 'Case Activity & Tools';

export const P1325_RIGHT_STACK_TABLIST_LABEL = 'Case workspace right panel';

export const P1325_RIGHT_STACK_TAB_ACTIVITY = 'Activity';
export const P1325_RIGHT_STACK_TAB_AI = 'AI Workspace';
export const P1325_RIGHT_STACK_TAB_PROPOSALS = 'Proposals';
