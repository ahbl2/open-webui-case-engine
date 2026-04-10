/**
 * P74-10 — Adoption boundary (repo root): `docs/phases/phase_74/P74-10_PRIMITIVE_LAYER_MIGRATION_BOUNDARY.md`
 *
 * P74-03 — Typography + semantic status.
 * P74-04 — Buttons, badges, chips (see detectiveButtons.css, detectiveBadgesChips.css).
 * P74-05 — Surfaces + bounded scroll (see detectiveSurfaces.css); Tier L `ce-l-content-region` unchanged for case routes.
 * P74-06 — Empty / loading / skeleton (see detectiveEmptyLoadingSkeleton.css); `CaseEmptyState` / `CaseLoadingState` use these classes.
 * P74-07 — Error / banner / toast (see detectiveErrorBannerToast.css); `CaseErrorState` + `NotificationToast` aligned; compose banners with `DS_STATUS_SURFACE_*`.
 * P74-08 — Modal / drawer / confirm (see detectiveModalDrawerConfirm.css); `Modal` / `Drawer` / `ConfirmDialog` aligned — same portal + focus-trap engines.
 * P74-09 — Ask integrity / degraded banner (see detectiveAskIntegrity.css); `CaseEngineAskIntegrityBanner` + `askIntegrityUi` meta.
 */
export const DS_TYPE_CLASSES = {
	display: 'ds-type-display',
	section: 'ds-type-section',
	panel: 'ds-type-panel',
	body: 'ds-type-body',
	meta: 'ds-type-meta',
	label: 'ds-type-label',
	mono: 'ds-type-mono'
} as const;

export const DS_STATUS_SURFACE_CLASSES = {
	success: 'ds-status-surface-success',
	warning: 'ds-status-surface-warning',
	danger: 'ds-status-surface-danger',
	info: 'ds-status-surface-info',
	error: 'ds-status-surface-error',
	neutral: 'ds-status-surface-neutral'
} as const;

export const DS_STATUS_TEXT_CLASSES = {
	success: 'ds-status-text-success',
	warning: 'ds-status-text-warning',
	danger: 'ds-status-text-danger',
	info: 'ds-status-text-info',
	error: 'ds-status-text-error'
} as const;

/** P74-04 — Button variants */
export const DS_BTN_CLASSES = {
	primary: 'ds-btn ds-btn-primary',
	secondary: 'ds-btn ds-btn-secondary',
	ghost: 'ds-btn ds-btn-ghost',
	danger: 'ds-btn ds-btn-danger'
} as const;

/** P74-04 — Compact status/metadata badges */
export const DS_BADGE_CLASSES = {
	base: 'ds-badge',
	neutral: 'ds-badge ds-badge-neutral',
	success: 'ds-badge ds-badge-success',
	warning: 'ds-badge ds-badge-warning',
	danger: 'ds-badge ds-badge-danger',
	info: 'ds-badge ds-badge-info'
} as const;

/** P74-04 — Filter/tag chips */
export const DS_CHIP_CLASSES = {
	base: 'ds-chip',
	active: 'ds-chip ds-chip-active'
} as const;

/** P74-05 — Structural surfaces (see detectiveSurfaces.css) */
export const DS_SURFACE_CLASSES = {
	base: 'ds-surface'
} as const;

export const DS_PANEL_CLASSES = {
	primary: 'ds-panel',
	primaryDense: 'ds-panel ds-panel-dense',
	muted: 'ds-panel-muted'
} as const;

export const DS_CARD_CLASSES = {
	card: 'ds-card'
} as const;

export const DS_SECTION_HEADER_CLASSES = {
	header: 'ds-section-header'
} as const;

/** P74-05 — Bounded scroll (unlayered CSS; pair root + body) */
export const DS_SCROLL_CLASSES = {
	root: 'ds-scroll-root',
	body: 'ds-scroll-body'
} as const;

export const DS_STACK_CLASSES = {
	stack: 'ds-stack',
	tight: 'ds-stack ds-stack-tight'
} as const;

/** P74-06 — Empty state (generic; pair root + framed | compact) */
export const DS_EMPTY_CLASSES = {
	root: 'ds-empty',
	framed: 'ds-empty-framed',
	compact: 'ds-empty-compact',
	title: 'ds-empty-title',
	description: 'ds-empty-description'
} as const;

/** P74-06 — Loading (panel); use `compact` compound for dense blocks */
export const DS_LOADING_CLASSES = {
	root: 'ds-loading',
	compact: 'ds-loading ds-loading-compact',
	icon: 'ds-loading-icon',
	label: 'ds-loading-label'
} as const;

/** P74-06 — Structural skeleton placeholders (non-domain) */
export const DS_SKELETON_CLASSES = {
	base: 'ds-skeleton',
	shimmer: 'ds-skeleton ds-skeleton-shimmer',
	line: 'ds-skeleton ds-skeleton-line',
	lineWide: 'ds-skeleton ds-skeleton-line ds-skeleton-line-wide',
	block: 'ds-skeleton ds-skeleton-block',
	row: 'ds-skeleton-row',
	avatar: 'ds-skeleton ds-skeleton-avatar',
	lines: 'ds-skeleton-lines'
} as const;

/** P74-07 — Panel/surface error block */
export const DS_ERROR_CLASSES = {
	root: 'ds-error',
	title: 'ds-error-title',
	message: 'ds-error-message',
	details: 'ds-error-details',
	actions: 'ds-error-actions'
} as const;

/** P74-07 — Banner layout (pair with `DS_STATUS_SURFACE_CLASSES`) */
export const DS_BANNER_CLASSES = {
	base: 'ds-banner',
	denseModifier: 'ds-banner-dense',
	label: 'ds-banner-label',
	body: 'ds-banner-body'
} as const;

/** P74-07 — svelte-sonner custom toast shell (`NotificationToast`) */
export const DS_TOAST_CLASSES = {
	root: 'ds-toast',
	title: 'ds-toast-title',
	content: 'ds-toast-content',
	close: 'ds-toast-close'
} as const;

/** P74-08 — Overlay backdrop layout helpers */
export const DS_OVERLAY_CLASSES = {
	backdrop: 'ds-overlay-backdrop',
	backdropModal: 'ds-overlay-backdrop-modal',
	backdropDrawer: 'ds-overlay-backdrop-drawer'
} as const;

/** P74-08 — Centered modal panel shell */
export const DS_MODAL_CLASSES = {
	panel: 'ds-modal-panel'
} as const;

/** P74-08 — Bottom sheet / drawer panel */
export const DS_DRAWER_CLASSES = {
	panel: 'ds-drawer-panel'
} as const;

/** P74-08 — Confirm / destructive-confirm card */
export const DS_CONFIRM_CLASSES = {
	panel: 'ds-confirm-panel',
	title: 'ds-confirm-title',
	body: 'ds-confirm-body',
	actions: 'ds-confirm-actions',
	destructiveModifier: 'ds-confirm-destructive',
	severity: 'ds-confirm-severity'
} as const;

/** P74-09 — Case Engine Ask read-time integrity presentation (Phase 33); pair root + variant */
export const DS_ASK_INTEGRITY_CLASSES = {
	root: 'ds-ask-integrity',
	title: 'ds-ask-integrity-title',
	hint: 'ds-ask-integrity-hint',
	detail: 'ds-ask-integrity-detail',
	supported: 'ds-ask-integrity-supported',
	degraded: 'ds-ask-integrity-degraded',
	notApplicable: 'ds-ask-integrity-not-applicable'
} as const;
