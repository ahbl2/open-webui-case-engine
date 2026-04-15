<script lang="ts">
	/**
	 * P106-03 / P106-04 / P106-05 — Entity detail; evidence → Phase 103 navigation (explicit targets).
	 * P107-01 — Manual edit form (Phase 105 PATCH) for active entities only.
	 * P107-02 — Retire/restore (Phase 105 POST lifecycle); detail GET uses include_retired to load retired rows by id.
	 * P108-01 / P108-02 — Read-only links to timeline + files entity lens (`?entityLens=`).
	 * P108-03 — Same query param; lens banners link back to this detail route.
	 * P126-03 — Identity / attributes / linked references layout; explicit links only (partitioned by type).
	 */
	import { onDestroy } from 'svelte';
	import {
		getCaseEntityDetail,
		removeCaseEntityEvidenceLink,
		restoreCaseEntity,
		retireCaseEntity,
		type CaseEngineEvidenceLinkReadItem
	} from '$lib/apis/caseEngine/caseEntitiesApi';
	import CaseEntityEvidenceLinkForm from '$lib/components/case/CaseEntityEvidenceLinkForm.svelte';
	import CaseEntityMutateForm from '$lib/components/case/CaseEntityMutateForm.svelte';
	import {
		P107_CASE_ENTITY_EDIT_BUTTON,
		P107_CASE_ENTITY_EDIT_UNAVAILABLE_RETIRED
	} from '$lib/case/p107CaseEntityCreateEditCopy';
	import {
		P107_CASE_ENTITY_LIFECYCLE_NOTE,
		P107_CASE_ENTITY_LIFECYCLE_SUBMITTING,
		P107_CASE_ENTITY_RESTORE_BUTTON,
		P107_CASE_ENTITY_RESTORE_CONFIRM,
		P107_CASE_ENTITY_RETIRE_BUTTON,
		P107_CASE_ENTITY_RETIRE_CONFIRM
	} from '$lib/case/p107CaseEntityLifecycleCopy';
	import { P107_EVIDENCE_UNLINK_BUTTON, P107_EVIDENCE_UNLINK_CONFIRM } from '$lib/case/p107CaseEntityEvidenceLinkCopy';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { p106LiteralAttributeRows } from '$lib/case/p106CaseEntityLiteralAttributes';
	import { citationNavigationPayloadFromEntityEvidenceLink } from '$lib/case/p106EntityEvidenceCitationNavigation';
	import { navigateToCitationNavigationPayload } from '$lib/case/p103CitationNavigationIntent';
	import {
		P108_ENTITY_FILES_LENS_VIEW_ACTION,
		P108_ENTITY_TIMELINE_LENS_VIEW_ACTION
	} from '$lib/case/p108EntityTimelineLensCopy';
	import { auditFieldDisplay } from '$lib/case/p107CaseEntityAudit';
	import {
		P107_AUDIT_CREATED_AT,
		P107_AUDIT_CREATED_BY,
		P107_AUDIT_NOTE,
		P107_AUDIT_RETIRED_AT,
		P107_AUDIT_RETIRED_BY,
		P107_AUDIT_SECTION_HEADING,
		P107_AUDIT_UPDATED_AT,
		P107_AUDIT_UPDATED_BY
	} from '$lib/case/p107CaseEntityAuditCopy';
	import {
		P106_CASE_ENTITIES_NO_SESSION,
		P106_CASE_ENTITIES_RETIRED_LABEL,
		P106_CASE_ENTITY_DETAIL_ATTRIBUTES_HEADING,
		P106_CASE_ENTITY_DETAIL_BACK_TO_LIST,
		P106_CASE_ENTITY_DETAIL_ERROR_GENERIC,
		P106_CASE_ENTITY_DETAIL_LINK_TYPE_FILE,
		P106_CASE_ENTITY_DETAIL_LINK_TYPE_TIMELINE,
		P106_CASE_ENTITY_DETAIL_LOADING,
		P106_CASE_ENTITY_DETAIL_SUPPORTING_COPY,
		P106_CASE_ENTITY_DETAIL_TARGET_UNAVAILABLE,
		P106_CASE_ENTITY_EVIDENCE_UNAVAILABLE_NOTE,
		P106_CASE_ENTITY_NAVIGATION_FAILED,
		P106_CASE_ENTITY_OPEN_LINKED_RECORD
	} from '$lib/case/p106CaseEntitiesOperatorCopy';
	import {
		P126_ENTITY_DETAIL_ATTRIBUTES_EMPTY,
		P126_ENTITY_DETAIL_FIELD_TYPE_LABEL,
		P126_ENTITY_DETAIL_FIELD_VALUE_LABEL,
		P126_ENTITY_DETAIL_SECTION_IDENTITY,
		P126_LINKED_REFERENCES_FILES_EMPTY,
		P126_LINKED_REFERENCES_HEADING,
		P126_LINKED_REFERENCES_INTRO,
		P126_LINKED_REFERENCES_NOTES_UNAVAILABLE,
		P126_LINKED_REFERENCES_SUB_FILES,
		P126_LINKED_REFERENCES_SUB_NOTES,
		P126_LINKED_REFERENCES_SUB_TIMELINE,
		P126_LINKED_REFERENCES_TIMELINE_EMPTY
	} from '$lib/caseContext/p126EntityListDetailCopy';
	import Spinner from '$lib/components/common/Spinner.svelte';

	export let caseId: string;
	export let entityId: string;
	export let caseEngineToken: string;

	let loading = false;
	let clientError = '';
	let navigationError = '';
	let detail: Awaited<ReturnType<typeof getCaseEntityDetail>> | null = null;
	let showEditForm = false;
	/** `null` when idle; which lifecycle POST is in flight (for button label only). */
	let lifecycleOp: null | 'retire' | 'restore' = null;
	let lifecycleError = '';
	let evidenceUnlinkError = '';
	let unlinkingLinkId: string | null = null;

	let requestGeneration = 0;
	let activeKey = '';

	function resetForEntity(): void {
		loading = false;
		clientError = '';
		navigationError = '';
		detail = null;
		showEditForm = false;
		lifecycleOp = null;
		lifecycleError = '';
		evidenceUnlinkError = '';
		unlinkingLinkId = null;
		requestGeneration += 1;
		activeKey = `${caseId}|${entityId}`;
	}

	$: if (caseId && entityId && `${caseId}|${entityId}` !== activeKey) {
		resetForEntity();
	}

	onDestroy(() => {
		requestGeneration += 1;
	});

	async function loadDetail(): Promise<void> {
		const myCase = caseId;
		const myEnt = entityId;
		if (!myCase || !myEnt) return;
		if (!caseEngineToken) {
			clientError = P106_CASE_ENTITIES_NO_SESSION;
			detail = null;
			return;
		}
		const gen = ++requestGeneration;
		loading = true;
		clientError = '';
		lifecycleError = '';
		evidenceUnlinkError = '';
		lifecycleOp = null;
		detail = null;
		try {
			const d = await getCaseEntityDetail(myCase, myEnt, caseEngineToken, { includeRetired: true });
			if (gen !== requestGeneration || myCase !== caseId || myEnt !== entityId) return;
			detail = d;
		} catch (e: unknown) {
			if (gen !== requestGeneration || myCase !== caseId || myEnt !== entityId) return;
			detail = null;
			clientError = e instanceof Error ? e.message : P106_CASE_ENTITY_DETAIL_ERROR_GENERIC;
		} finally {
			if (gen === requestGeneration && myCase === caseId && myEnt === entityId) loading = false;
		}
	}

	$: if (caseId && entityId && caseEngineToken && activeKey === `${caseId}|${entityId}`) {
		void loadDetail();
	}

	$: if (caseId && entityId && !caseEngineToken && activeKey === `${caseId}|${entityId}`) {
		clientError = P106_CASE_ENTITIES_NO_SESSION;
		detail = null;
		loading = false;
	}

	$: timelineRefLinks =
		detail?.evidence_links.filter((l) => l.link_type === 'timeline_entry') ?? [];
	$: fileRefLinks = detail?.evidence_links.filter((l) => l.link_type === 'case_file') ?? [];

	function linkTypeLabel(link: CaseEngineEvidenceLinkReadItem): string {
		if (link.link_type === 'timeline_entry') return P106_CASE_ENTITY_DETAIL_LINK_TYPE_TIMELINE;
		if (link.link_type === 'case_file') return P106_CASE_ENTITY_DETAIL_LINK_TYPE_FILE;
		return link.link_type;
	}

	async function openLinkedRecord(link: CaseEngineEvidenceLinkReadItem): Promise<void> {
		navigationError = '';
		const payload = citationNavigationPayloadFromEntityEvidenceLink(caseId, link);
		if (!payload) return;
		const res = await navigateToCitationNavigationPayload(payload, caseId);
		if (!res.ok) {
			navigationError = P106_CASE_ENTITY_NAVIGATION_FAILED;
		}
	}

	async function handleEdited(): Promise<void> {
		showEditForm = false;
		await loadDetail();
	}

	async function handleRetire(): Promise<void> {
		if (!caseEngineToken || !detail) return;
		if (detail.case_entity.deleted_at) return;
		if (!browserConfirmRetire()) return;
		lifecycleError = '';
		lifecycleOp = 'retire';
		try {
			await retireCaseEntity(caseId, entityId, caseEngineToken);
			await loadDetail();
		} catch (e: unknown) {
			lifecycleError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			lifecycleOp = null;
		}
	}

	function browserConfirmRetire(): boolean {
		if (typeof globalThis.window === 'undefined') return false;
		return globalThis.window.confirm(P107_CASE_ENTITY_RETIRE_CONFIRM);
	}

	function browserConfirmRestore(): boolean {
		if (typeof globalThis.window === 'undefined') return false;
		return globalThis.window.confirm(P107_CASE_ENTITY_RESTORE_CONFIRM);
	}

	function browserConfirmUnlink(): boolean {
		if (typeof globalThis.window === 'undefined') return false;
		return globalThis.window.confirm(P107_EVIDENCE_UNLINK_CONFIRM);
	}

	async function handleUnlinkEvidence(linkId: string): Promise<void> {
		if (!caseEngineToken || !detail || showEditForm) return;
		if (!browserConfirmUnlink()) return;
		evidenceUnlinkError = '';
		unlinkingLinkId = linkId;
		try {
			await removeCaseEntityEvidenceLink(caseId, entityId, linkId, caseEngineToken);
			await loadDetail();
		} catch (e: unknown) {
			evidenceUnlinkError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			unlinkingLinkId = null;
		}
	}

	async function handleRestore(): Promise<void> {
		if (!caseEngineToken || !detail) return;
		if (!detail.case_entity.deleted_at) return;
		if (!browserConfirmRestore()) return;
		lifecycleError = '';
		lifecycleOp = 'restore';
		try {
			await restoreCaseEntity(caseId, entityId, caseEngineToken);
			await loadDetail();
		} catch (e: unknown) {
			lifecycleError = e instanceof Error ? e.message : 'Request failed.';
		} finally {
			lifecycleOp = null;
		}
	}
</script>

<div
	class="flex flex-col gap-4 min-h-0"
	data-testid="case-entity-detail-panel"
	data-case-entity-detail-case-id={caseId}
	data-case-entity-detail-entity-id={entityId}
>
	<nav class="shrink-0">
		<a
			href={`/case/${encodeURIComponent(caseId)}/entities`}
			class="text-sm text-[color:var(--ce-l-text-secondary)] hover:underline"
			data-testid="case-entity-detail-back"
		>
			{P106_CASE_ENTITY_DETAIL_BACK_TO_LIST}
		</a>
	</nav>

	{#if loading}
		<div
			class="flex items-center gap-2 text-sm text-[color:var(--ce-l-text-secondary)]"
			data-testid="case-entity-detail--loading"
		>
			<Spinner />
			<span>{P106_CASE_ENTITY_DETAIL_LOADING}</span>
		</div>
	{:else if clientError}
		<p class="text-sm text-[color:var(--ce-l-text-secondary)]" data-testid="case-entity-detail--error" role="alert">
			{clientError}
		</p>
	{:else if detail}
		{#if showEditForm && caseEngineToken && !detail.case_entity.deleted_at}
			<CaseEntityMutateForm
				mode="edit"
				caseId={caseId}
				caseEngineToken={caseEngineToken}
				initialEntity={detail.case_entity}
				onSuccess={() => void handleEdited()}
				onCancel={() => {
					showEditForm = false;
				}}
			/>
		{:else}
			<header class="flex flex-col gap-2 shrink-0" data-testid="case-entity-detail--identity">
				<h2 class="{DS_TYPE_CLASSES.section} text-sm font-medium text-[color:var(--ce-l-text-primary)] m-0">
					{P126_ENTITY_DETAIL_SECTION_IDENTITY}
				</h2>
				<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0">{P106_CASE_ENTITY_DETAIL_SUPPORTING_COPY}</p>
				<dl class="grid grid-cols-1 sm:grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-1 text-sm m-0">
					<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P126_ENTITY_DETAIL_FIELD_TYPE_LABEL}</dt>
					<dd class="text-[color:var(--ce-l-text-primary)] break-words">
						{detail.case_entity.entity_type}
						{#if detail.case_entity.deleted_at}
							<span class="ml-2 text-xs uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
								({P106_CASE_ENTITIES_RETIRED_LABEL})
							</span>
						{/if}
					</dd>
					<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P126_ENTITY_DETAIL_FIELD_VALUE_LABEL}</dt>
					<dd class="text-[color:var(--ce-l-text-primary)] break-words">{detail.case_entity.display_label}</dd>
				</dl>
				{#if caseEngineToken}
					<div class="pt-1 flex flex-col gap-1">
						<a
							href={`/case/${encodeURIComponent(caseId)}/timeline?entityLens=${encodeURIComponent(entityId)}`}
							class="text-sm text-[color:var(--ce-l-text-secondary)] hover:underline"
							data-testid="case-entity-detail--view-timeline-lens"
						>
							{P108_ENTITY_TIMELINE_LENS_VIEW_ACTION}
						</a>
						<a
							href={`/case/${encodeURIComponent(caseId)}/files?entityLens=${encodeURIComponent(entityId)}`}
							class="text-sm text-[color:var(--ce-l-text-secondary)] hover:underline"
							data-testid="case-entity-detail--view-files-lens"
						>
							{P108_ENTITY_FILES_LENS_VIEW_ACTION}
						</a>
					</div>
				{/if}
				{#if caseEngineToken && !detail.case_entity.deleted_at}
					<div class="flex flex-wrap gap-2 pt-1">
						<button
							type="button"
							class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-60"
							data-testid="case-entity-detail--edit-open"
							disabled={lifecycleOp !== null}
							on:click={() => {
								showEditForm = true;
							}}
						>
							{P107_CASE_ENTITY_EDIT_BUTTON}
						</button>
						<button
							type="button"
							class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-60"
							data-testid="case-entity-detail--retire"
							disabled={lifecycleOp !== null}
							on:click={() => void handleRetire()}
						>
							{lifecycleOp === 'retire' ? P107_CASE_ENTITY_LIFECYCLE_SUBMITTING : P107_CASE_ENTITY_RETIRE_BUTTON}
						</button>
					</div>
					<p class="text-xs text-[color:var(--ce-l-text-muted)] pt-1 max-w-prose">{P107_CASE_ENTITY_LIFECYCLE_NOTE}</p>
				{/if}
				{#if caseEngineToken && detail.case_entity.deleted_at}
					<div class="flex flex-wrap gap-2 pt-1">
						<button
							type="button"
							class="rounded px-3 py-1.5 text-sm font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-60"
							data-testid="case-entity-detail--restore"
							disabled={lifecycleOp !== null}
							on:click={() => void handleRestore()}
						>
							{lifecycleOp === 'restore' ? P107_CASE_ENTITY_LIFECYCLE_SUBMITTING : P107_CASE_ENTITY_RESTORE_BUTTON}
						</button>
					</div>
					<p class="text-xs text-[color:var(--ce-l-text-muted)] pt-1 max-w-prose">{P107_CASE_ENTITY_LIFECYCLE_NOTE}</p>
				{/if}
				{#if detail.case_entity.deleted_at}
					<p class="text-xs text-[color:var(--ce-l-text-muted)]">{P107_CASE_ENTITY_EDIT_UNAVAILABLE_RETIRED}</p>
				{/if}
				{#if lifecycleError}
					<p class="text-sm text-red-700 dark:text-red-300 pt-1" data-testid="case-entity-detail--lifecycle-error" role="alert">
						{lifecycleError}
					</p>
				{/if}
			</header>

			<section
				data-testid="case-entity-detail--audit"
				class="flex flex-col gap-2 rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-raised)]"
				aria-label={P107_AUDIT_SECTION_HEADING}
			>
				<h2 class="text-sm font-medium text-[color:var(--ce-l-text-primary)]">{P107_AUDIT_SECTION_HEADING}</h2>
				<p class="text-xs text-[color:var(--ce-l-text-secondary)] max-w-prose">{P107_AUDIT_NOTE}</p>
				<dl class="grid grid-cols-1 sm:grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-1 text-sm">
					<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P107_AUDIT_CREATED_AT}</dt>
					<dd class="text-[color:var(--ce-l-text-primary)] break-words" data-testid="case-entity-detail--audit-created-at">
						{auditFieldDisplay(detail.case_entity.created_at)}
					</dd>
					<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P107_AUDIT_CREATED_BY}</dt>
					<dd class="text-[color:var(--ce-l-text-primary)] break-words" data-testid="case-entity-detail--audit-created-by">
						{auditFieldDisplay(detail.case_entity.created_by)}
					</dd>
					<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P107_AUDIT_UPDATED_AT}</dt>
					<dd class="text-[color:var(--ce-l-text-primary)] break-words" data-testid="case-entity-detail--audit-updated-at">
						{auditFieldDisplay(detail.case_entity.updated_at)}
					</dd>
					<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P107_AUDIT_UPDATED_BY}</dt>
					<dd class="text-[color:var(--ce-l-text-primary)] break-words" data-testid="case-entity-detail--audit-updated-by">
						{auditFieldDisplay(detail.case_entity.updated_by)}
					</dd>
					{#if detail.case_entity.deleted_at}
						<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P107_AUDIT_RETIRED_AT}</dt>
						<dd class="text-[color:var(--ce-l-text-primary)] break-words" data-testid="case-entity-detail--audit-retired-at">
							{auditFieldDisplay(detail.case_entity.deleted_at)}
						</dd>
						<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{P107_AUDIT_RETIRED_BY}</dt>
						<dd class="text-[color:var(--ce-l-text-primary)] break-words" data-testid="case-entity-detail--audit-retired-by">
							{auditFieldDisplay(detail.case_entity.deleted_by)}
						</dd>
					{/if}
				</dl>
			</section>

			<section
				data-testid="case-entity-detail--attributes"
				class="flex flex-col gap-2 rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-raised)]"
			>
				<h2 class="{DS_TYPE_CLASSES.section} text-sm font-medium text-[color:var(--ce-l-text-primary)] m-0">
					{P106_CASE_ENTITY_DETAIL_ATTRIBUTES_HEADING}
				</h2>
				{#if p106LiteralAttributeRows(detail.case_entity.attributes).length > 0}
					<dl class="grid grid-cols-1 sm:grid-cols-[minmax(0,12rem)_1fr] gap-x-4 gap-y-1 text-sm m-0">
						{#each p106LiteralAttributeRows(detail.case_entity.attributes) as row (row.key)}
							<dt class="text-[color:var(--ce-l-text-muted)] shrink-0">{row.key}</dt>
							<dd class="text-[color:var(--ce-l-text-primary)] break-words">{row.value}</dd>
						{/each}
					</dl>
				{:else}
					<p class="text-sm text-[color:var(--ce-l-text-secondary)] m-0" data-testid="case-entity-detail--attributes-empty">
						{P126_ENTITY_DETAIL_ATTRIBUTES_EMPTY}
					</p>
				{/if}
			</section>
		{/if}

		<section
			data-testid="case-entity-detail--linked-references"
			class="flex flex-col gap-3 min-h-0 rounded-md border border-[color:var(--ce-l-border-subtle)] p-3 bg-[color:var(--ce-l-surface-raised)]"
		>
			<div>
				<h2 class="{DS_TYPE_CLASSES.section} text-sm font-medium text-[color:var(--ce-l-text-primary)] m-0">
					{P126_LINKED_REFERENCES_HEADING}
				</h2>
				<p class="text-xs text-[color:var(--ce-l-text-secondary)] m-0 mt-1 max-w-prose">{P126_LINKED_REFERENCES_INTRO}</p>
			</div>
			{#if caseEngineToken && !showEditForm}
				<CaseEntityEvidenceLinkForm
					caseId={caseId}
					entityId={entityId}
					caseEngineToken={caseEngineToken}
					entityActive={!detail.case_entity.deleted_at}
					evidenceLinks={detail.evidence_links}
					onLinked={() => loadDetail()}
				/>
			{/if}
			{#if evidenceUnlinkError}
				<p
					class="text-sm text-red-700 dark:text-red-300"
					data-testid="case-entity-detail--evidence-unlink-error"
					role="alert"
				>
					{evidenceUnlinkError}
				</p>
			{/if}
			{#if navigationError}
				<p
					class="text-sm text-amber-800 dark:text-amber-200"
					data-testid="case-entity-detail--nav-error"
					role="alert"
				>
					{navigationError}
				</p>
			{/if}

			<div class="flex flex-col gap-4">
				<div data-testid="case-entity-detail--references-timeline-block">
					<h3 class="text-xs font-medium uppercase tracking-wide text-[color:var(--ce-l-text-muted)] m-0">
						{P126_LINKED_REFERENCES_SUB_TIMELINE}
					</h3>
					{#if timelineRefLinks.length === 0}
						<p
							class="text-sm text-[color:var(--ce-l-text-secondary)] m-0 mt-1"
							data-testid="case-entity-detail--references-timeline-empty"
						>
							{P126_LINKED_REFERENCES_TIMELINE_EMPTY}
						</p>
					{:else}
						<ul class="flex flex-col gap-2 list-none p-0 m-0 mt-1" data-testid="case-entity-detail--references-timeline-list">
							{#each timelineRefLinks as link (link.id)}
								<li
									class="rounded-md border border-[color:var(--ce-l-border-subtle)] px-3 py-2 bg-[color:var(--ce-l-surface-base)]"
									data-testid="case-entity-detail--evidence-row"
									data-evidence-link-type={link.link_type}
								>
									<div class="text-xs uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
										{linkTypeLabel(link)}
									</div>
									<div class="text-sm text-[color:var(--ce-l-text-primary)] mt-0.5 break-words">
										{link.target_label ?? link.target_id}
									</div>
									{#if link.target_status === 'unavailable'}
										<div class="text-xs text-[color:var(--ce-l-text-muted)] mt-1">
											{P106_CASE_ENTITY_DETAIL_TARGET_UNAVAILABLE}
										</div>
										<div
											class="text-xs text-[color:var(--ce-l-text-muted)] mt-0.5"
											data-testid="case-entity-detail--evidence-unavailable-note"
										>
											{P106_CASE_ENTITY_EVIDENCE_UNAVAILABLE_NOTE}
										</div>
									{:else if citationNavigationPayloadFromEntityEvidenceLink(caseId, link)}
										<div class="mt-2">
											<button
												type="button"
												class="rounded px-2 py-1 text-xs font-medium bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
												data-testid="case-entity-detail--evidence-open"
												aria-label={P106_CASE_ENTITY_OPEN_LINKED_RECORD}
												on:click={() => void openLinkedRecord(link)}
											>
												{P106_CASE_ENTITY_OPEN_LINKED_RECORD}
											</button>
										</div>
									{/if}
									{#if caseEngineToken && !showEditForm}
										<div class="mt-2">
											<button
												type="button"
												class="rounded px-2 py-1 text-xs font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-60"
												data-testid="case-entity-detail--evidence-unlink"
												data-evidence-link-id={link.id}
												disabled={unlinkingLinkId !== null}
												on:click={() => void handleUnlinkEvidence(link.id)}
											>
												{unlinkingLinkId === link.id ? '…' : P107_EVIDENCE_UNLINK_BUTTON}
											</button>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div data-testid="case-entity-detail--references-files-block">
					<h3 class="text-xs font-medium uppercase tracking-wide text-[color:var(--ce-l-text-muted)] m-0">
						{P126_LINKED_REFERENCES_SUB_FILES}
					</h3>
					{#if fileRefLinks.length === 0}
						<p
							class="text-sm text-[color:var(--ce-l-text-secondary)] m-0 mt-1"
							data-testid="case-entity-detail--references-files-empty"
						>
							{P126_LINKED_REFERENCES_FILES_EMPTY}
						</p>
					{:else}
						<ul class="flex flex-col gap-2 list-none p-0 m-0 mt-1" data-testid="case-entity-detail--references-files-list">
							{#each fileRefLinks as link (link.id)}
								<li
									class="rounded-md border border-[color:var(--ce-l-border-subtle)] px-3 py-2 bg-[color:var(--ce-l-surface-base)]"
									data-testid="case-entity-detail--evidence-row"
									data-evidence-link-type={link.link_type}
								>
									<div class="text-xs uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
										{linkTypeLabel(link)}
									</div>
									<div class="text-sm text-[color:var(--ce-l-text-primary)] mt-0.5 break-words">
										{link.target_label ?? link.target_id}
									</div>
									{#if link.target_status === 'unavailable'}
										<div class="text-xs text-[color:var(--ce-l-text-muted)] mt-1">
											{P106_CASE_ENTITY_DETAIL_TARGET_UNAVAILABLE}
										</div>
										<div
											class="text-xs text-[color:var(--ce-l-text-muted)] mt-0.5"
											data-testid="case-entity-detail--evidence-unavailable-note"
										>
											{P106_CASE_ENTITY_EVIDENCE_UNAVAILABLE_NOTE}
										</div>
									{:else if citationNavigationPayloadFromEntityEvidenceLink(caseId, link)}
										<div class="mt-2">
											<button
												type="button"
												class="rounded px-2 py-1 text-xs font-medium bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
												data-testid="case-entity-detail--evidence-open"
												aria-label={P106_CASE_ENTITY_OPEN_LINKED_RECORD}
												on:click={() => void openLinkedRecord(link)}
											>
												{P106_CASE_ENTITY_OPEN_LINKED_RECORD}
											</button>
										</div>
									{/if}
									{#if caseEngineToken && !showEditForm}
										<div class="mt-2">
											<button
												type="button"
												class="rounded px-2 py-1 text-xs font-medium border border-[color:var(--ce-l-border-subtle)] text-[color:var(--ce-l-text-primary)] hover:opacity-90 disabled:opacity-60"
												data-testid="case-entity-detail--evidence-unlink"
												data-evidence-link-id={link.id}
												disabled={unlinkingLinkId !== null}
												on:click={() => void handleUnlinkEvidence(link.id)}
											>
												{unlinkingLinkId === link.id ? '…' : P107_EVIDENCE_UNLINK_BUTTON}
											</button>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div data-testid="case-entity-detail--references-notes-block">
					<h3 class="text-xs font-medium uppercase tracking-wide text-[color:var(--ce-l-text-muted)] m-0">
						{P126_LINKED_REFERENCES_SUB_NOTES}
					</h3>
					<p
						class="text-sm text-[color:var(--ce-l-text-secondary)] m-0 mt-1 max-w-prose"
						data-testid="case-entity-detail--references-notes-empty"
					>
						{P126_LINKED_REFERENCES_NOTES_UNAVAILABLE}
					</p>
				</div>
			</div>
		</section>
	{/if}
</div>
