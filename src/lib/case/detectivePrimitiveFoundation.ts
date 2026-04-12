/**
 * P74-10 — Adoption boundary (repo root): `docs/phases/phase_74/P74-10_PRIMITIVE_LAYER_MIGRATION_BOUNDARY.md`
 *
 * P74-03 — Typography + semantic status.
 * P74-04 — Buttons, badges, chips (see detectiveButtons.css, detectiveBadgesChips.css).
 * P74-05 — Surfaces + bounded scroll (see detectiveSurfaces.css); Tier L `ce-l-content-region` unchanged for case routes.
 * P76-02 — `DS_CASE_SHELL_*` case workspace shell root/body/canvas (Wave 3; `case/[id]/+layout.svelte`).
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
	info: 'ds-badge ds-badge-info',
	/** P77 — Stable unit keys for case browse / command surfaces */
	unitCid: 'ds-badge ds-badge-unit-cid',
	unitSiu: 'ds-badge ds-badge-unit-siu'
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

/** P75-02 / P75-05 — App shell frame (sidebar is separate; top strip content in `DetectiveAppShellTopBar`) */
export const DS_APP_SHELL_CLASSES = {
	root: 'ds-app-shell',
	top: 'ds-app-shell__top',
	topRow: 'ds-app-shell__top-row',
	main: 'ds-app-shell__main',
	topContext: 'ds-app-shell-top-context',
	topSearchTrigger: 'ds-app-shell-top-search-trigger',
	topActions: 'ds-app-shell-top-actions'
} as const;

/** P77-03 / P77-04 — Case Workspace Timeline (`/case/:id/timeline`); feed + `TimelineEntryCard` + composer / inline edit */
export const DS_TIMELINE_CLASSES = {
	mainSection: 'ds-timeline-main-section',
	feed: 'ds-timeline-feed',
	entryRow: 'ds-timeline-entry-row',
	entrySpine: 'ds-timeline-entry-row__spine',
	entryMarker: 'ds-timeline-entry-row__marker',
	entryBody: 'ds-timeline-entry-row__body',
	filterToolbar: 'ds-timeline-filter-toolbar',
	searchMark: 'ds-timeline-search-mark',
	/** P77-04 — Bottom “Log entry” sheet */
	composerSheet: 'ds-timeline-composer-sheet',
	composerHeader: 'ds-timeline-composer-sheet__header',
	composerBody: 'ds-timeline-composer-sheet__body',
	composerBleed: 'ds-timeline-composer-sheet__bleed',
	/** P77-04 — Shared input / select / textarea */
	formControl: 'ds-timeline-form-control',
	/** P77-04 — Inline governed edit block (list item) */
	inlineEditSurface: 'ds-timeline-inline-edit'
} as const;

/** P77-05 — Case Notes workspace (`/case/:id/notes`); browser rail + editor — drafting posture (not Timeline) */
export const DS_NOTES_CLASSES = {
	workspaceRoot: 'ds-notes-workspace-root',
	pageIdentity: 'ds-notes-page-identity',
	pageIdentityHeading: 'ds-notes-page-identity__heading',
	pageIdentityMeta: 'ds-notes-page-identity__meta',
	browserRail: 'ds-notes-browser-rail',
	browserHeader: 'ds-notes-browser-header',
	browserSearchRow: 'ds-notes-browser-search-row',
	listScroller: 'ds-notes-list-scroller',
	listRow: 'ds-notes-list-row',
	listRowSelected: 'ds-notes-list-row--selected',
	listRowIdle: 'ds-notes-list-row--idle',
	workspaceColumn: 'ds-notes-workspace-column',
	workspaceHeader: 'ds-notes-workspace-header',
	workspaceBody: 'ds-notes-workspace-body',
	workspaceFooter: 'ds-notes-workspace-footer',
	workspaceCard: 'ds-notes-workspace-card',
	/** Same control chrome as Timeline composer (P77-04) */
	formControl: 'ds-timeline-form-control',
	sectionDivider: 'ds-notes-section-divider',
	dropOverlay: 'ds-notes-drop-overlay',
	dictationPanel: 'ds-notes-dictation-panel',
	dictationPre: 'ds-notes-dictation-pre',
	attachmentPipelineCard: 'ds-notes-attachment-pipeline-card',
	/** P77-13 — Dense subflows (browser rail, menus, dictation, attachment pipeline, version history) */
	matchBadgeBoth: 'ds-notes-match-badge ds-notes-match-badge--both',
	matchBadgeTitle: 'ds-notes-match-badge ds-notes-match-badge--title',
	matchBadgeContent: 'ds-notes-match-badge ds-notes-match-badge--content',
	browserSnippet: 'ds-notes-browser-snippet',
	browserMetaLine: 'ds-notes-browser-meta-line',
	browserMetaFaint: 'ds-notes-browser-meta-line ds-notes-browser-meta-line--faint',
	listOverflowTrigger: 'ds-notes-list-overflow-trigger',
	dropdownContent: 'ds-notes-dropdown-content',
	dropdownItem: 'ds-notes-dropdown-item',
	dropdownItemDanger: 'ds-notes-dropdown-item ds-notes-dropdown-item--danger',
	dropdownSeparator: 'ds-notes-dropdown-separator',
	dictationRecordingRow: 'ds-notes-dictation-recording-row',
	dictationRecordingDot: 'ds-notes-dictation-recording-dot',
	dictationMuted: 'ds-notes-dictation-muted',
	dictationError: 'ds-notes-dictation-error',
	dictationLink: 'ds-notes-dictation-link',
	dictationSectionHeader: 'ds-notes-dictation-section-header',
	dictationEyebrow: 'ds-notes-dictation-eyebrow',
	dictationFooterBar: 'ds-notes-dictation-footer-bar',
	dictationAiWarn: 'ds-notes-dictation-ai-warn',
	dictationAiChoiceBtn: 'ds-notes-dictation-ai-choice-btn',
	attachmentSectionLabel: 'ds-notes-attachment-section-label',
	attachmentHint: 'ds-notes-attachment-hint',
	attachmentMuted: 'ds-notes-attachment-muted',
	attachmentCardDivider: 'ds-notes-attachment-card-divider',
	attachmentFileTitle: 'ds-notes-attachment-file-title',
	attachmentFileSize: 'ds-notes-attachment-file-size',
	attachmentRemoveBtn: 'ds-notes-attachment-remove-btn',
	attachmentProcessingItalic: 'ds-notes-attachment-processing-italic',
	pipelineBtnPrimary: 'ds-notes-pipeline-btn ds-notes-pipeline-btn--primary',
	pipelineBtnSuccess: 'ds-notes-pipeline-btn ds-notes-pipeline-btn--success',
	pipelineGhostBtn: 'ds-notes-pipeline-btn ds-notes-pipeline-btn--ghost',
	pipelineProposalHint: 'ds-notes-pipeline-proposal-hint',
	pipelineRetryLink: 'ds-notes-pipeline-retry-link',
	pipelineErrorText: 'ds-notes-pipeline-error-text',
	pipelineWarnText: 'ds-notes-pipeline-warn-text',
	extractedPanel: 'ds-notes-extracted-panel',
	extractedPanelEyebrow: 'ds-notes-extracted-panel-eyebrow',
	extractedPre: 'ds-notes-attachment-extracted-pre',
	ocrPanel: 'ds-notes-ocr-panel',
	ocrPanelLabel: 'ds-notes-ocr-panel-label',
	ocrPre: 'ds-notes-ocr-pre',
	versionHistoryShell: 'ds-notes-version-history-shell',
	versionHistoryHeader: 'ds-notes-version-history-header',
	versionHistoryTitle: 'ds-notes-version-history-title',
	versionHistoryCloseLink: 'ds-notes-version-history-close-link',
	versionRowSelected: 'ds-notes-version-row ds-notes-version-row--selected',
	versionRowIdle: 'ds-notes-version-row ds-notes-version-row--idle',
	versionRowMeta: 'ds-notes-version-row-meta',
	versionSnapshotShell: 'ds-notes-version-snapshot-shell',
	versionSnapshotHeader: 'ds-notes-version-snapshot-header',
	versionSnapshotTitle: 'ds-notes-version-snapshot-title',
	versionSnapshotNote: 'ds-notes-version-snapshot-note',
	versionSnapshotBody: 'ds-notes-version-snapshot-body',
	noteMenuTrigger: 'ds-notes-note-menu-trigger',
	attachmentDownloadBtn: 'ds-notes-attachment-download-btn'
} as const;

/** P77-13 — Attachment pipeline status chips (token-backed) */
export const DS_NOTES_ATTACHMENT_STATUS_BADGE_CLASSES = {
	processing:
		'ds-notes-attachment-status-badge ds-notes-attachment-status-badge--processing',
	extracted: 'ds-notes-attachment-status-badge ds-notes-attachment-status-badge--extracted',
	extractedOcr: 'ds-notes-attachment-status-badge ds-notes-attachment-status-badge--extracted',
	ocrLow: 'ds-notes-attachment-status-badge ds-notes-attachment-status-badge--warning-strong',
	ocrComplete: 'ds-notes-attachment-status-badge ds-notes-attachment-status-badge--warning-soft',
	failed: 'ds-notes-attachment-status-badge ds-notes-attachment-status-badge--danger',
	neutral: 'ds-notes-attachment-status-badge ds-notes-attachment-status-badge--neutral'
} as const;

/** P77-06 — Proposals governance workspace (`/case/:id/proposals`); review queue + ProposalReviewPanel */
export const DS_PROPOSALS_CLASSES = {
	pageIdentity: 'ds-proposals-page-identity',
	pageIdentityHeading: 'ds-proposals-page-identity__heading',
	pageIdentityMeta: 'ds-proposals-page-identity__meta',
	toolbar: 'ds-proposals-toolbar',
	tabStrip: 'ds-proposals-tab-strip',
	tabDivider: 'ds-proposals-tab-divider',
	doctrineBand: 'ds-proposals-doctrine-band',
	filterRow: 'ds-proposals-filter-row',
	searchControls: 'ds-proposals-search-controls',
	listViewport: 'ds-proposals-list-viewport',
	card: 'ds-proposals-card',
	cardAttention: 'ds-proposals-card--attention',
	formControl: 'ds-timeline-form-control'
} as const;

/** P86-01 — Operational tasks / leads (`/case/:id/tasks`); non-authoritative shell only */
export const DS_CASE_TASKS_CLASSES = {
	pageIdentity: 'ds-case-tasks-page-identity',
	pageIdentityHeading: 'ds-case-tasks-page-identity__heading',
	pageIdentityMeta: 'ds-case-tasks-page-identity__meta',
	emptyShell: 'ds-case-tasks-empty-shell'
} as const;

/** P77-07 — Files & Evidence workspace (`/case/:id/files`); `CaseFilesTab` + route hero */
export const DS_FILES_CLASSES = {
	pageIdentity: 'ds-files-page-identity',
	pageIdentityHeading: 'ds-files-page-identity__heading',
	pageIdentityMeta: 'ds-files-page-identity__meta',
	workspace: 'ds-files-workspace',
	sectionLabel: 'ds-files-section-label',
	dropzone: 'ds-files-dropzone',
	dropzoneActive: 'ds-files-dropzone--active',
	dropzoneHint: 'ds-files-dropzone__hint',
	doctrineHelp: 'ds-files-doctrine-help',
	listControls: 'ds-files-list-controls',
	loadedCount: 'ds-files-loaded-count',
	formControl: 'ds-timeline-form-control',
	nativeFileInput: 'ds-files-native-file-input',
	fileCard: 'ds-files-file-card',
	actionLink: 'ds-files-action-link',
	actionLinkDanger: 'ds-files-action-link--danger',
	actionLinkPropose: 'ds-files-action-link--propose',
	actionsDivider: 'ds-files-actions-divider',
	extBadge: 'ds-files-ext-badge',
	extBadgeExtractable: 'ds-files-ext-badge--extractable',
	extBadgeNeutral: 'ds-files-ext-badge--neutral',
	tagRow: 'ds-files-tag-row',
	tagChip: 'ds-files-tag-chip',
	tagChipRemove: 'ds-files-tag-chip__remove',
	modalOverlay: 'ds-files-modal-overlay',
	extractedPanel: 'ds-files-extracted-panel',
	extractedHeader: 'ds-files-extracted-panel__header',
	extractedBody: 'ds-files-extracted-panel__body',
	extractedPre: 'ds-files-extracted-pre'
} as const;

/** P77-08 — Workflow & Leads (`/case/:id/workflow`); `CaseWorkflowTab` + route hero */
export const DS_WORKFLOW_CLASSES = {
	pageIdentity: 'ds-workflow-page-identity',
	pageIdentityHeading: 'ds-workflow-page-identity__heading',
	pageIdentityMeta: 'ds-workflow-page-identity__meta',
	primaryScroll: 'ds-workflow-primary-scroll',
	workspace: 'ds-workflow-workspace',
	workspaceFull: 'ds-workflow-workspace--full',
	workspaceEmbedded: 'ds-workflow-workspace--embedded',
	shellPanel: 'ds-workflow-shell-panel',
	shellPanelMuted: 'ds-workflow-shell-panel--muted',
	attentionRegion: 'ds-workflow-attention-region',
	attentionChip: 'ds-workflow-attention-chip',
	attentionChipError: 'ds-workflow-attention-chip--error',
	attentionChipLoading: 'ds-workflow-attention-chip--loading',
	sectionEyebrow: 'ds-workflow-section-eyebrow',
	narrativeToggle: 'ds-workflow-narrative-toggle',
	doctrineBlock: 'ds-workflow-doctrine-block',
	filterCluster: 'ds-workflow-filter-cluster',
	filterTab: 'ds-workflow-filter-tab',
	filterTabActive: 'ds-workflow-filter-tab--active',
	createToolbarBtn: 'ds-workflow-create-toolbar-btn',
	resultBanner: 'ds-workflow-result-banner',
	resultBannerOk: 'ds-workflow-result-banner--ok',
	resultBannerErr: 'ds-workflow-result-banner--err',
	resultBannerWarn: 'ds-workflow-result-banner--warn',
	listStateShell: 'ds-workflow-list-state-shell',
	listStateShellDashed: 'ds-workflow-list-state-shell--dashed',
	tableScroll: 'ds-workflow-table-scroll',
	table: 'ds-workflow-table',
	thead: 'ds-workflow-table__thead',
	th: 'ds-workflow-table__th',
	tbodyRow: 'ds-workflow-table__tbody-row',
	tbodyRowHighlight: 'ds-workflow-table__tbody-row--highlight',
	tbodyRowDeleted: 'ds-workflow-table__tbody-row--deleted',
	proposalsPanel: 'ds-workflow-proposals-panel',
	proposalsListScroll: 'ds-workflow-proposals-scroll',
	guidanceSection: 'ds-workflow-guidance-section',
	/** P77-14 — Guidance footer shell (replaces gray border/bg utilities) */
	guidanceZoneOpenFull: 'ds-workflow-guidance-zone ds-workflow-guidance-zone--open',
	guidanceZoneOpenEmbed: 'ds-workflow-guidance-zone ds-workflow-guidance-zone--open ds-workflow-guidance-zone--embed',
	guidanceZoneCollapsedFull: 'ds-workflow-guidance-zone ds-workflow-guidance-zone--collapsed',
	guidanceZoneCollapsedEmbed: 'ds-workflow-guidance-zone ds-workflow-guidance-zone--collapsed ds-workflow-guidance-zone--embed',
	guidanceToggle: 'ds-workflow-guidance-toggle',
	inlineAction: 'ds-workflow-inline-action',
	inlineActionDanger: 'ds-workflow-inline-action--danger',
	inlineActionSuccess: 'ds-workflow-inline-action--success',
	embedNavLink: 'ds-workflow-embed-nav-link',
	embedNavLinkCompact: 'ds-workflow-embed-nav-link--compact',
	supportRowChip: 'ds-workflow-support-row-chip'
} as const;

/** P77-14 — Workflow doctrine / helper / modal label typography (token-backed; use with DS_WORKFLOW_CLASSES) */
export const DS_WORKFLOW_TEXT_CLASSES = {
	doctrineProse: 'ds-workflow-text-doctrine',
	doctrineEmphasis: 'ds-workflow-text-doctrine-emphasis',
	doctrineStrong: 'ds-workflow-text-doctrine-strong',
	embedCompactProse: 'ds-workflow-text-embed-compact',
	guidanceIntroMuted: 'ds-workflow-text-guidance-intro-muted',
	modalTitle: 'ds-workflow-modal-title',
	modalLabel: 'ds-workflow-modal-label'
} as const;

/** P77-09 — Case Overview / Summary (`/case/:id/summary`); `CaseSummaryPanel` + route modules */
export const DS_SUMMARY_CLASSES = {
	pageScroll: 'ds-summary-page-scroll',
	pageInner: 'ds-summary-page-inner',
	identityBand: 'ds-summary-identity-band',
	identityTitleRow: 'ds-summary-identity-title-row',
	pageEyebrow: 'ds-summary-page-eyebrow',
	inPageNav: 'ds-summary-in-page-nav',
	navLink: 'ds-summary-nav-link',
	navSep: 'ds-summary-nav-sep',
	modulePrimary: 'ds-summary-module-primary',
	moduleSession: 'ds-summary-module-session',
	moduleBrief: 'ds-summary-module-brief',
	subpanel: 'ds-summary-subpanel',
	subpanelRun: 'ds-summary-subpanel-run',
	sessionScopeBanner: 'ds-summary-session-scope-banner',
	loadingPanel: 'ds-summary-loading-panel',
	emptyDashed: 'ds-summary-empty-dashed',
	sectionDivider: 'ds-summary-section-divider',
	outputCard: 'ds-summary-output-card',
	keyEventItem: 'ds-summary-key-event-item',
	briefMetaPanel: 'ds-summary-brief-meta-panel',
	briefDateSection: 'ds-summary-brief-date-section',
	briefEntryCard: 'ds-summary-brief-entry-card',
	panelShell: 'ds-summary-panel-shell',
	citationsToggle: 'ds-summary-citations-toggle',
	citationChip: 'ds-summary-citation-chip'
} as const;

/** P77-10 — Entity Intelligence (`/case/:id/intelligence`, nested entity focus); pairs with Tier L `ce-l-intelligence-*` scroll shell */
export const DS_INTELLIGENCE_CLASSES = {
	primaryInner: 'ds-intelligence-primary-inner',
	identityEyebrow: 'ds-intelligence-identity-eyebrow',
	inlineLink: 'ds-intelligence-inline-link',
	workspaceTab: 'ds-intelligence-workspace-tab',
	workspaceTabActive: 'ds-intelligence-workspace-tab--active',
	workspaceTabInactive: 'ds-intelligence-workspace-tab--inactive',
	entitiesRibbon: 'ds-intelligence-entities-ribbon',
	modeBanner: 'ds-intelligence-mode-banner',
	sectionIntro: 'ds-intelligence-section-intro',
	panel: 'ds-intelligence-panel',
	panelInset: 'ds-intelligence-panel-inset',
	alertList: 'ds-intelligence-alert-list',
	alertItem: 'ds-intelligence-alert-item',
	alertExcerptRail: 'ds-intelligence-alert-excerpt-rail',
	ackButton: 'ds-intelligence-ack-button',
	formToolbar: 'ds-intelligence-form-toolbar',
	integrityRefusalBox: 'ds-intelligence-integrity-refusal',
	resultCard: 'ds-intelligence-result-card',
	evidenceCaseCard: 'ds-intelligence-evidence-case-card',
	evidenceHitRow: 'ds-intelligence-evidence-hit-row',
	emptyDashed: 'ds-intelligence-empty-dashed',
	entitySearchGroup: 'ds-intelligence-entity-search-group',
	citationList: 'ds-intelligence-citation-list',
	noAuthNote: 'ds-intelligence-no-auth-note',
	entityPageScroll: 'ds-intelligence-entity-page-scroll',
	entityPageInner: 'ds-intelligence-entity-page-inner',
	entityPanel: 'ds-intelligence-entity-panel',
	entityBackLink: 'ds-intelligence-entity-back-link',
	/** Vertical rhythm for large intelligence workspace sections (replaces `space-y-6`). */
	panelSectionStack: 'ds-intelligence-panel-section-stack'
} as const;

/** P77-11 — Entity board / registry workspace (`EntitiesOverviewBoardShell` + registry/focus/connections/intake chrome) */
export const DS_ENTITY_BOARD_CLASSES = {
	root: 'ds-entity-board-root',
	scroll: 'ds-entity-board-scroll',
	inner: 'ds-entity-board-inner',
	divider: 'ds-entity-board-divider',
	grid: 'ds-entity-board-grid',
	section: 'ds-entity-board-section',
	sectionLabel: 'ds-entity-board-section-label',
	toolbar: 'ds-entity-board-toolbar',
	toolbarRow: 'ds-entity-board-toolbar-row',
	toolbarTitleRow: 'ds-entity-board-toolbar-title-row',
	toolbarTitle: 'ds-entity-board-toolbar-title',
	toolbarBadge: 'ds-entity-board-toolbar-badge',
	toolbarSubtitle: 'ds-entity-board-toolbar-subtitle',
	toolbarCaseLine: 'ds-entity-board-toolbar-case-line',
	toolbarActions: 'ds-entity-board-toolbar-actions',
	toolbarLink: 'ds-entity-board-toolbar-link',
	toolbarGhostBtn: 'ds-entity-board-toolbar-ghost-btn',
	toolbarPrimaryBtn: 'ds-entity-board-toolbar-primary-btn',
	toolbarMenu: 'ds-entity-board-toolbar-menu',
	toolbarMenuItem: 'ds-entity-board-toolbar-menu-item',
	toolbarMenuBackdrop: 'ds-entity-board-toolbar-menu-backdrop',
	toolbarIntakeToggle: 'ds-entity-board-toolbar-intake-toggle',
	registryPanel: 'ds-entity-registry-panel',
	registryPanelBoard: 'ds-entity-registry-panel--layout-board',
	registryPanelAnchored: 'ds-entity-registry-panel--layout-anchored',
	registryPanelPerson: 'ds-entity-registry-panel--person',
	registryPanelVehicle: 'ds-entity-registry-panel--vehicle',
	registryPanelLocation: 'ds-entity-registry-panel--location',
	registryPanelPhone: 'ds-entity-registry-panel--phone',
	registryHeader: 'ds-entity-registry-header',
	registryHeaderPerson: 'ds-entity-registry-header--person',
	registryHeaderVehicle: 'ds-entity-registry-header--vehicle',
	registryHeaderLocation: 'ds-entity-registry-header--location',
	registryHeaderPhone: 'ds-entity-registry-header--phone',
	registryTile: 'ds-entity-registry-tile',
	registryTilePerson: 'ds-entity-registry-tile--person',
	registryTileVehicle: 'ds-entity-registry-tile--vehicle',
	registryTileLocation: 'ds-entity-registry-tile--location',
	registryTilePhone: 'ds-entity-registry-tile--phone',
	registryFooter: 'ds-entity-registry-footer',
	registryRow: 'ds-entity-registry-row',
	registryRowSelected: 'ds-entity-registry-row--selected',
	registryRoster: 'ds-entity-registry-roster',
	registryRosterAnchored: 'ds-entity-registry-roster--anchored',
	registryRosterExpanded: 'ds-entity-registry-roster--expanded',
	registryList: 'ds-entity-registry-list',
	registryFooterSearch: 'ds-entity-registry-footer-search',
	registryFooterSelect: 'ds-entity-registry-footer-select',
	registryViewAll: 'ds-entity-registry-view-all',
	registryLoading: 'ds-entity-registry-loading',
	registryTitle: 'ds-entity-registry-title',
	registrySubtitle: 'ds-entity-registry-subtitle',
	registryPortrait: 'ds-entity-registry-portrait',
	registryRowLabel: 'ds-entity-registry-row-label',
	registryRowSecondary: 'ds-entity-registry-row-secondary',
	registryRowId: 'ds-entity-registry-row-id',
	registryRetiredPill: 'ds-entity-registry-retired-pill',
	registryChevron: 'ds-entity-registry-chevron',
	registryPlaceholder: 'ds-entity-registry-placeholder',
	registryEmpty: 'ds-entity-registry-empty',
	registryFilteredEmpty: 'ds-entity-registry-filtered-empty',
	focusShell: 'ds-entity-focus-shell',
	focusHeader: 'ds-entity-focus-header',
	focusBackBtn: 'ds-entity-focus-back-btn',
	focusCaseMeta: 'ds-entity-focus-case-meta',
	focusBody: 'ds-entity-focus-body',
	focusAnchoredCol: 'ds-entity-focus-anchored-col',
	focusDetailRegion: 'ds-entity-focus-detail-region',
	focusDirtyGateOverlay: 'ds-entity-focus-dirty-gate-overlay',
	focusDirtyGateCard: 'ds-entity-focus-dirty-gate-card',
	connectionsSection: 'ds-entity-connections-section',
	connectionsHeader: 'ds-entity-connections-header',
	connectionsDot: 'ds-entity-connections-dot',
	connectionsRefresh: 'ds-entity-connections-refresh',
	connectionsEmpty: 'ds-entity-connections-empty',
	connectionsRow: 'ds-entity-connections-row',
	intakeRail: 'ds-entity-intake-rail',
	intakeToggle: 'ds-entity-intake-toggle',
	intakeToggleExpanded: 'ds-entity-intake-toggle--expanded',
	intakeToggleCollapsed: 'ds-entity-intake-toggle--collapsed',
	intakeBody: 'ds-entity-intake-body',
	intakeStagePanel: 'ds-entity-intake-stage-panel'
} as const;

/** P77-12 — Entity detail workspace (`EntityDetailWorkspace` inside Intelligence focus) */
export const DS_ENTITY_DETAIL_CLASSES = {
	workspaceRoot: 'ds-entity-detail-workspace',
	headerSkeleton: 'ds-entity-detail-header-skeleton',
	headerError: 'ds-entity-detail-header-error',
	header: 'ds-entity-detail-header',
	retiredBanner: 'ds-entity-detail-retired-banner',
	identityRow: 'ds-entity-detail-identity-row',
	identityMain: 'ds-entity-detail-identity-main',
	portrait: 'ds-entity-detail-portrait',
	portraitFallback: 'ds-entity-detail-portrait-fallback',
	kindTileVehicle: 'ds-entity-detail-kind-tile--vehicle',
	kindTileLocation: 'ds-entity-detail-kind-tile--location',
	heroTitle: 'ds-entity-detail-hero-title',
	kindBadgePerson: 'ds-entity-detail-kind-badge--person',
	kindBadgeVehicle: 'ds-entity-detail-kind-badge--vehicle',
	kindBadgeLocation: 'ds-entity-detail-kind-badge--location',
	kindBadgeDefault: 'ds-entity-detail-kind-badge--default',
	metaLine: 'ds-entity-detail-meta-line',
	scopeLine: 'ds-entity-detail-scope-line',
	actionsWrap: 'ds-entity-detail-actions-wrap',
	actionsSummary: 'ds-entity-detail-actions-summary',
	actionsMenuPanel: 'ds-entity-detail-actions-menu-panel',
	actionsMenuItem: 'ds-entity-detail-actions-menu-item',
	actionsMenuItemDisabled: 'ds-entity-detail-actions-menu-item--disabled',
	quickPills: 'ds-entity-detail-quick-pills',
	quickPillCluster: 'ds-entity-detail-quick-pill-cluster',
	quickPillClusterLabel: 'ds-entity-detail-quick-pill-cluster__label',
	quickPillClusterRow: 'ds-entity-detail-quick-pill-cluster__row',
	quickPill: 'ds-entity-detail-quick-pill',
	quickPillWorkspace: 'ds-entity-detail-quick-pill--workspace',
	quickPillProposals: 'ds-entity-detail-quick-pill--proposals',
	idRow: 'ds-entity-detail-id-row',
	tabstrip: 'ds-entity-detail-tabstrip',
	tab: 'ds-entity-detail-tab',
	tabActive: 'ds-entity-detail-tab--active',
	tabInactive: 'ds-entity-detail-tab--inactive',
	panelBody: 'ds-entity-detail-panel-body',
	overviewGrid: 'ds-entity-detail-overview-grid',
	sectionLabel: 'ds-entity-detail-section-label',
	sectionHint: 'ds-entity-detail-section-hint',
	attrGrid: 'ds-entity-detail-attr-grid',
	attrCell: 'ds-entity-detail-attr-cell',
	attrDt: 'ds-entity-detail-attr-dt',
	attrDd: 'ds-entity-detail-attr-dd',
	statusDl: 'ds-entity-detail-status-dl',
	statusRow: 'ds-entity-detail-status-row',
	statusDt: 'ds-entity-detail-status-dt',
	assocSummaryList: 'ds-entity-detail-assoc-summary-list',
	assocSummaryRow: 'ds-entity-detail-assoc-summary-row',
	deepSectionTitle: 'ds-entity-detail-deep-section-title',
	deepDivider: 'ds-entity-detail-deep-divider',
	assocCommittedRow: 'ds-entity-detail-assoc-committed-row',
	assocStagingRow: 'ds-entity-detail-assoc-staging-row',
	notesDraftPanel: 'ds-entity-detail-notes-draft-panel',
	notesDraftLabel: 'ds-entity-detail-notes-draft-label',
	notesDraftHint: 'ds-entity-detail-notes-draft-hint',
	discardDraftBtn: 'ds-entity-detail-discard-draft',
	aiAssistCard: 'ds-entity-detail-ai-assist-card'
} as const;

/** P77-02 — Operator Command Center surfaces (`/home` OCC frame); pairs with `OperatorCommandCenterFrame` */
export const DS_OCC_CLASSES = {
	mainCanvas: 'ds-occ-main-canvas',
	summarySlot: 'ds-occ-summary-slot',
	summaryLabel: 'ds-occ-summary-slot__label',
	summaryValue: 'ds-occ-summary-slot__value',
	summaryValueMuted: 'ds-occ-summary-slot__value--muted',
	summaryHint: 'ds-occ-summary-slot__hint',
	summaryHintLoading: 'ds-occ-summary-slot__hint--loading',
	mainSection: 'ds-occ-main-section',
	sectionHeaderRow: 'ds-occ-section-header-row',
	sectionHeaderTitle: 'ds-occ-section-header-row__title',
	sectionHeaderHeading: 'ds-occ-section-header-row__heading',
	railPanel: 'ds-occ-rail-panel',
	resourceRow: 'ds-occ-resource-row'
} as const;

/** P77 — Command center browse surfaces (token-only; cases list, OCC-adjacent layouts) */
export const DS_COMMAND_CENTER_CLASSES = {
	page: 'ds-command-page',
	pageInner: 'ds-command-page__inner',
	header: 'ds-command-page__header',
	kpiGrid: 'ds-command-kpi-grid',
	kpiTile: 'ds-kpi-tile',
	kpiValue: 'ds-kpi-tile__value',
	kpiLabel: 'ds-kpi-tile__label',
	filterBar: 'ds-command-filter-bar',
	filterGrid: 'ds-command-filter-bar__grid',
	caseListCard: 'ds-case-list-card',
	caseListMeta: 'ds-case-list-card__meta',
	caseListOpen: 'ds-case-list-card__open',
	caseListActions: 'ds-case-list-card__actions',
	workspaceSidebar: 'ds-workspace-sidebar'
} as const;

/** P76-02 / P76-06 — Case workspace shell frame (Wave 3); single owner `case/[id]/+layout.svelte` — pairs with Tier L `.ce-l-*` chrome */
export const DS_CASE_SHELL_CLASSES = {
	root: 'ds-case-shell',
	body: 'ds-case-shell__body',
	canvasColumn: 'ds-case-shell__canvas-column',
	/** P76-06 — Optional §Case-level quick actions / indicators band (under tabs; truthful content only). */
	contextBand: 'ds-case-shell__context-band',
	/** P76-06 — Shell-level chat context column (reserved frame; page-owned content by default per spec). */
	rail: 'ds-case-shell__rail'
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
