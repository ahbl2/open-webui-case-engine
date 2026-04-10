/**
 * Phase 71 (P71-02) — Tier L semantic CSS custom property names for the case workspace.
 * Values are defined in `src/lib/styles/caseWorkspaceTierL.css` (P70-03, P70-07).
 * Tier P / Entities (P69-03) is out of scope here — do not use these for premium surfaces.
 */
export const CE_L_VARS = {
	canvas: '--ce-l-canvas',
	canvasFg: '--ce-l-canvas-fg',
	chrome: '--ce-l-chrome',
	chromeFg: '--ce-l-chrome-fg',
	chromeBorder: '--ce-l-chrome-border',
	surface: '--ce-l-surface',
	surfaceMuted: '--ce-l-surface-muted',
	surfaceElevated: '--ce-l-surface-elevated',
	borderSubtle: '--ce-l-border-subtle',
	borderDefault: '--ce-l-border-default',
	borderStrong: '--ce-l-border-strong',
	textPrimary: '--ce-l-text-primary',
	textSecondary: '--ce-l-text-secondary',
	textMuted: '--ce-l-text-muted',
	textOnCanvas: '--ce-l-text-on-canvas',
	radiusSm: '--ce-l-radius-sm',
	radiusMd: '--ce-l-radius-md',
	emptyBorder: '--ce-l-empty-border',
	emptySurface: '--ce-l-empty-surface',
	loadingFg: '--ce-l-loading-fg',
	errorBg: '--ce-l-error-bg',
	errorBorder: '--ce-l-error-border',
	errorTitle: '--ce-l-error-title',
	errorText: '--ce-l-error-text',
	errorLink: '--ce-l-error-link',
	/** Primary case tab strip (P71-04) */
	tabStripBg: '--ce-l-tab-strip-bg',
	tabActiveBorder: '--ce-l-tab-active-border',
	tabActiveFg: '--ce-l-tab-active-fg'
} as const;

export type CeLTierLVarName = (typeof CE_L_VARS)[keyof typeof CE_L_VARS];
