<script lang="ts">
	/**
	 * Case Files — workspace shell (hero, KPIs, folder rail) + CaseFilesTab.
	 * P19-14 — Case Engine file APIs; folders: Case Engine `071_case_file_folders`.
	 */
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import { getRouteCaseId } from '$lib/caseContext/routeCaseContext';
	import { getCaseFilesInsights, uploadCaseFile, type CaseFilesAggregateStats, type CaseFilesInsights } from '$lib/apis/caseEngine';
	import CaseFilesTab from '$lib/components/case/CaseFilesTab.svelte';
	import CaseWorkspaceContentRegion from '$lib/components/case/CaseWorkspaceContentRegion.svelte';
	import CaseWorkspaceRouteSurfacePlaceholder from '$lib/components/case/CaseWorkspaceRouteSurfacePlaceholder.svelte';
	import CaseFilesWorkspaceHero from '$lib/components/case/CaseFilesWorkspaceHero.svelte';
	import CaseFilesKpiStrip from '$lib/components/case/CaseFilesKpiStrip.svelte';
	import CaseFilesFolderRail from '$lib/components/case/CaseFilesFolderRail.svelte';
	import CaseFilesTagsRail from '$lib/components/case/CaseFilesTagsRail.svelte';
	import { toast } from 'svelte-sonner';

	$: routeCaseId = getRouteCaseId($page.params);

	let prevRouteCaseId = '';
	/** `null` = all; `__unfiled__`; or folder id */
	let selectedFolderKey: string | null = null;
	/** Tags rail filter; `null` = all tags */
	let selectedTagKey: string | null = null;
	let tabReloadTick = 0;
	let folderReloadEpoch = 0;
	/** Bumps `CaseFilesTab` folder dropdown when the rail creates/updates folders (not only on file mutations). */
	let folderListEpoch = 0;

	$: if (routeCaseId && routeCaseId !== prevRouteCaseId) {
		prevRouteCaseId = routeCaseId;
		selectedFolderKey = null;
		selectedTagKey = null;
		tabReloadTick = 0;
		folderReloadEpoch = 0;
		folderListEpoch = 0;
	}

	let kpiStats: CaseFilesAggregateStats | null = null;
	let kpiLoading = true;
	let caseInsights: CaseFilesInsights | null = null;
	let caseInsightsLoading = true;
	let heroFileInput: HTMLInputElement | undefined;
	let heroUploading = false;

	async function loadCaseInsights() {
		if (!routeCaseId || !$caseEngineToken) {
			caseInsights = null;
			caseInsightsLoading = false;
			return;
		}
		caseInsightsLoading = true;
		try {
			caseInsights = await getCaseFilesInsights(routeCaseId, $caseEngineToken);
		} catch {
			caseInsights = null;
		} finally {
			caseInsightsLoading = false;
		}
	}

	$: if (routeCaseId && $caseEngineToken) {
		void loadCaseInsights();
	}

	$: if (!routeCaseId || !$caseEngineToken) {
		kpiStats = null;
		kpiLoading = false;
	}

	function onKpiStatsFromTab(stats: CaseFilesAggregateStats | null, loading: boolean) {
		kpiStats = stats;
		kpiLoading = loading;
	}

	function onFilesMutated() {
		void loadCaseInsights();
		folderReloadEpoch += 1;
		tabReloadTick += 1;
	}

	async function onHeroFileChange(ev: Event) {
		const input = ev.currentTarget as HTMLInputElement;
		const list = input.files;
		if (!list?.length || !routeCaseId || !$caseEngineToken) return;
		const opts =
			selectedFolderKey && selectedFolderKey !== '__unfiled__'
				? { folderId: selectedFolderKey }
				: undefined;
		heroUploading = true;
		let ok = 0;
		try {
			for (const file of Array.from(list)) {
				try {
					await uploadCaseFile(routeCaseId, file, $caseEngineToken, opts);
					ok += 1;
				} catch (e: unknown) {
					toast.error(e instanceof Error ? `${e.message} (${file.name})` : `Upload failed (${file.name})`);
				}
			}
			if (ok > 0) {
				toast.success(ok === 1 ? 'File uploaded' : `${ok} files uploaded`);
				input.value = '';
				onFilesMutated();
			} else {
				input.value = '';
			}
		} finally {
			heroUploading = false;
		}
	}

	function openNewFolderInRail() {
		document.querySelector<HTMLButtonElement>('[data-testid="case-files-folder-new-toggle"]')?.click();
		const rail = document.querySelector('[data-testid="case-files-folder-rail"]');
		rail?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}
</script>

{#if !routeCaseId}
	<CaseWorkspaceRouteSurfacePlaceholder surface="Files" testId="case-files-placeholder" />
{:else}
	<CaseWorkspaceContentRegion testId="case-files-page">
		<div
			class="ce-l-files-shell flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
			data-route-case-id={routeCaseId}
		>
			<CaseFilesWorkspaceHero
				uploading={heroUploading}
				disabled={!$caseEngineToken}
				onUploadClick={() => heroFileInput?.click()}
				onNewFolderClick={openNewFolderInRail}
			/>
			<input
				bind:this={heroFileInput}
				type="file"
				multiple
				class="sr-only"
				aria-hidden="true"
				tabindex={-1}
				data-testid="case-files-hero-file-input"
				on:change={onHeroFileChange}
			/>

			<div class="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
				{#if $caseEngineToken}
					<div
						class="flex min-h-0 w-full min-w-0 flex-col overflow-hidden border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] sm:w-56 sm:shrink-0 sm:border-b-0 sm:border-r lg:h-full lg:max-h-full"
						data-testid="case-files-left-rail"
					>
						<CaseFilesFolderRail
							caseId={routeCaseId}
							token={$caseEngineToken}
							bind:selectedFolderKey
							reloadEpoch={folderReloadEpoch}
							onFoldersMutated={() => {
								folderListEpoch += 1;
							}}
						/>
						<CaseFilesTagsRail
							caseId={routeCaseId}
							token={$caseEngineToken}
							folderFilter={selectedFolderKey}
							reloadEpoch={folderReloadEpoch}
							bind:selectedTagKey
						/>
					</div>
				{/if}

				<div
					class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
					data-testid="case-files-primary-column"
				>
					<CaseFilesKpiStrip stats={kpiStats} loading={kpiLoading} />
					<div
						class="ce-l-files-primary-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
						data-testid="case-files-primary-scroll"
					>
					{#if $caseEngineToken}
						<CaseFilesTab
							caseId={routeCaseId}
							token={$caseEngineToken}
							focusFileId={$page.url.searchParams.get('file')}
							synthesisNavigationEnabled={true}
							folderFilter={selectedFolderKey}
							tagFilter={selectedTagKey}
							hideUploadSection={true}
							onClearExternalFilters={() => (selectedTagKey = null)}
							reloadTick={tabReloadTick}
							folderListEpoch={folderListEpoch}
							caseInsights={caseInsights}
							caseInsightsLoading={caseInsightsLoading}
							onFilesMutated={onFilesMutated}
							onKpiStatsChange={onKpiStatsFromTab}
						/>
					{:else}
						<div class="flex min-h-[8rem] items-center justify-center p-4">
							<p class="text-sm text-[color:var(--ce-l-text-muted)]">
								Not authenticated to Case Engine.
							</p>
						</div>
					{/if}
					</div>
				</div>
			</div>
		</div>
	</CaseWorkspaceContentRegion>
{/if}
