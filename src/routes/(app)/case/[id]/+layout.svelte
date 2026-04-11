<script lang="ts">
	/**
	 * P19-06 — Case Workspace Shell
	 * P82-01 — `CaseWorkspaceShell` + `CaseWorkspaceNav` (left rail).
	 * P82-02 — `CaseWorkspaceHeader` (identity + context strip + pending proposals link).
	 * P76-02 — Wave 3 `ds-case-shell*` frame + `data-region`.
	 * P76-08 — `caseModeActive` for GNAV / case shell coordination.
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import {
		caseEngineToken,
		caseModeActive,
		activeCaseMeta,
		activeCaseId,
		activeCaseNumber,
		caseEngineAuthState
	} from '$lib/stores';
	import { getCaseById, listProposalsPaginated } from '$lib/apis/caseEngine';
	import type { CaseEngineCase } from '$lib/apis/caseEngine';
	import {
		classifyCaseEngineFailure,
		formatCaseEngineUiMessage,
		caseShellHeaderDataUiState,
		type CaseEngineUiState
	} from '$lib/utils/caseEngineUiState';
	import { resolveAuthStateDecision, blockedRedirectPath } from '$lib/utils/authStateDecision';
	import { resolveActiveCaseSection } from '$lib/utils/caseNavSection';
	import {
		runCaseWorkspaceScrollDiagnostics,
		shouldRunCaseWorkspaceScrollDiagnostics
	} from '$lib/utils/caseWorkspaceScrollDiagnostics';
	import CaseWorkspaceShell from '$lib/components/case/CaseWorkspaceShell.svelte';
	import CaseWorkspaceNav from '$lib/components/case/CaseWorkspaceNav.svelte';
	import CaseWorkspaceHeader from '$lib/components/case/CaseWorkspaceHeader.svelte';
	import EditCaseModal from '$lib/components/case/EditCaseModal.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import { DS_CASE_SHELL_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { caseIdentityStripExpandedPosture } from '$lib/utils/caseIdentityStrip';
	import {
		isDetectiveWave3CaseShellEnabled,
		WAVE3_CASE_SHELL_LEGACY_ROOT_CLASS,
		WAVE3_CASE_SHELL_LEGACY_BODY_CLASS,
		WAVE3_CASE_SHELL_LEGACY_CANVAS_COLUMN_CLASS,
		WAVE3_CASE_SHELL_LEGACY_RAIL_CLASS,
		WAVE3_CASE_SHELL_GOVERNED_RAIL_CLASS
	} from '$lib/case/detectiveWave3CaseShell';

	caseModeActive.set(true);

	let loading = true;
	let loadError = '';
	let showEditCaseModal = false;
	let editCaseSeed: CaseEngineCase | null = null;
	let loadUiState: CaseEngineUiState | null = null;
	let pendingProposalsShellCount: number | null = null;

	let prevCaseId: string = $page.params.id ?? '';

	function mapCaseToMeta(c: CaseEngineCase) {
		const createdRaw = c.created_at;
		const created_at =
			typeof createdRaw === 'string' && createdRaw.trim() ? createdRaw : null;
		return {
			id: c.id as string,
			case_number: (c.case_number ?? c.id) as string,
			title: (c.title ?? '') as string,
			unit: (c.unit ?? '') as string,
			status: (c.status ?? '') as string,
			incident_date:
				typeof c.incident_date === 'string' && c.incident_date.trim()
					? c.incident_date
					: null,
			created_at
		};
	}

	async function loadCaseMeta(caseId: string): Promise<void> {
		loading = true;
		loadError = '';
		loadUiState = 'loading';
		activeCaseMeta.set(null);
		pendingProposalsShellCount = null;
		try {
			const c = await getCaseById(caseId, $caseEngineToken!);
			activeCaseMeta.set(mapCaseToMeta(c));
			activeCaseId.set(c.id as string);
			activeCaseNumber.set((c.case_number ?? null) as string | null);
			loadUiState = 'success';
			try {
				const pr = await listProposalsPaginated(caseId, $caseEngineToken!, 'pending', {
					limit: 1,
					offset: 0
				});
				pendingProposalsShellCount = pr.totalsByStatus.pending;
			} catch {
				pendingProposalsShellCount = null;
			}
		} catch (e: unknown) {
			const { state, userMessage } = classifyCaseEngineFailure(e);
			loadUiState = state;
			loadError = formatCaseEngineUiMessage(state, userMessage);
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		if ($caseEngineAuthState) {
			const decision = resolveAuthStateDecision($caseEngineAuthState.state);
			const redirectTo = blockedRedirectPath(decision);
			if (redirectTo) {
				caseModeActive.set(false);
				await goto(redirectTo);
				return;
			}
		}

		if (!$caseEngineToken) {
			caseModeActive.set(false);
			await goto('/cases');
			return;
		}

		await loadCaseMeta($page.params.id);
	});

	onDestroy(() => {
		caseModeActive.set(false);
		activeCaseMeta.set(null);
	});

	onMount(() => {
		if (!browser || import.meta.env.PROD) return;
		const schedule = () => {
			if (!shouldRunCaseWorkspaceScrollDiagnostics()) return;
			void tick().then(() => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						setTimeout(() => runCaseWorkspaceScrollDiagnostics(), 0);
					});
				});
			});
		};
		schedule();
		const unsub = page.subscribe(() => schedule());
		return () => unsub();
	});

	$: if ($page.params.id && $caseEngineToken && $page.params.id !== prevCaseId) {
		prevCaseId = $page.params.id;
		loadCaseMeta($page.params.id);
	}

	$: activeSection = resolveActiveCaseSection($page.url.pathname);

	$: shellHeaderDataUiState = caseShellHeaderDataUiState({
		loading,
		hasActiveCaseMeta: !!$activeCaseMeta,
		loadError,
		loadUiState
	});

	$: identityStripExpanded = caseIdentityStripExpandedPosture(activeSection);

	$: wave3CaseShellEnabled = isDetectiveWave3CaseShellEnabled();
	$: caseShellRootClass = wave3CaseShellEnabled ? DS_CASE_SHELL_CLASSES.root : WAVE3_CASE_SHELL_LEGACY_ROOT_CLASS;
	$: caseShellBodyClass = wave3CaseShellEnabled ? DS_CASE_SHELL_CLASSES.body : WAVE3_CASE_SHELL_LEGACY_BODY_CLASS;
	$: caseShellCanvasColumnClass = wave3CaseShellEnabled
		? DS_CASE_SHELL_CLASSES.canvasColumn
		: WAVE3_CASE_SHELL_LEGACY_CANVAS_COLUMN_CLASS;
	$: contextRailClass = wave3CaseShellEnabled ? WAVE3_CASE_SHELL_GOVERNED_RAIL_CLASS : WAVE3_CASE_SHELL_LEGACY_RAIL_CLASS;

	function openEditCaseModal(): void {
		if (!$activeCaseMeta) return;
		editCaseSeed = {
			id: $activeCaseMeta.id,
			case_number: $activeCaseMeta.case_number,
			title: $activeCaseMeta.title,
			unit: $activeCaseMeta.unit,
			status: $activeCaseMeta.status,
			incident_date: $activeCaseMeta.incident_date ?? null
		};
		showEditCaseModal = true;
	}
</script>

<div
	class={caseShellRootClass}
	data-testid="case-workspace-shell"
	data-case-shell-wave3={wave3CaseShellEnabled ? 'on' : 'off'}
	data-region={wave3CaseShellEnabled ? 'case-shell-root' : undefined}
>
	<CaseWorkspaceShell>
		<svelte:fragment slot="header">
			<CaseWorkspaceHeader
				caseId={$page.params.id}
				{loading}
				{loadError}
				meta={$activeCaseMeta}
				shellHeaderDataUiState={shellHeaderDataUiState}
				{identityStripExpanded}
				{wave3CaseShellEnabled}
				{pendingProposalsShellCount}
				onEdit={openEditCaseModal}
			/>
		</svelte:fragment>

		<svelte:fragment slot="nav">
			<CaseWorkspaceNav />
		</svelte:fragment>

		<div class={caseShellBodyClass} data-region={wave3CaseShellEnabled ? 'case-shell-body' : undefined}>
			<div class={caseShellCanvasColumnClass} data-region={wave3CaseShellEnabled ? 'case-shell-canvas-column' : undefined}>
				<div
					class="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden relative"
					data-testid="case-workspace-main"
					data-region={wave3CaseShellEnabled ? 'case-shell-page' : undefined}
				>
					{#if loading && !$activeCaseMeta}
						<div class="flex items-center justify-center h-full">
							<Spinner className="size-5" />
						</div>
					{:else if loadError}
						<div class="flex items-center justify-center h-full">
							<p class="text-sm text-red-500 dark:text-red-400">{loadError}</p>
						</div>
					{:else}
						<slot />
					{/if}
				</div>

				<div
					class="shrink-0 min-h-0"
					aria-label="Composer region"
					data-testid="case-composer-region"
					data-region={wave3CaseShellEnabled ? 'case-shell-composer' : undefined}
					data-section={activeSection}
				></div>
			</div>

			{#if activeSection === 'chat'}
				<div
					class="{contextRailClass} {DS_CASE_SHELL_CLASSES.rail}"
					aria-label="Context rail"
					data-testid="case-context-rail"
					data-region={wave3CaseShellEnabled ? 'case-shell-rail' : undefined}
				></div>
			{/if}
		</div>
	</CaseWorkspaceShell>
</div>

<EditCaseModal
	show={showEditCaseModal}
	token={$caseEngineToken}
	caseData={editCaseSeed}
	on:close={() => {
		showEditCaseModal = false;
	}}
	on:saved={(event) => {
		const saved = event.detail.case as CaseEngineCase;
		activeCaseMeta.set(mapCaseToMeta(saved));
		activeCaseNumber.set(String(saved.case_number ?? ''));
		editCaseSeed = saved;
		showEditCaseModal = false;
	}}
/>
