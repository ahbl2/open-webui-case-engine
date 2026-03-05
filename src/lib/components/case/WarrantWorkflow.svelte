<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		listTemplates,
		renderTemplate,
		requestAiWarrantDraft,
		downloadWarrantPacket,
		listWarrantDrafts,
		createWarrantDraft,
		getWarrantDraft,
		createWarrantDraftVersion,
		type TemplateMeta,
		type WarrantDraftResult,
		type WarrantDraftItem
	} from '$lib/apis/caseEngine';

	export let caseId: string;
	export let token: string;
	export let caseNumber: string = '';
	export let isAdmin: boolean = false;

	type WorkflowStep = 1 | 2 | 3 | 4 | 5;

	let step: WorkflowStep = 1;
	let loadingTemplates = false;
	let templates: TemplateMeta[] = [];
	let selectedTemplateId: string | null = null;
	let rbacDenied = false;
	let genericError: string | null = null;

	// Drafts (Ticket 19)
	let currentDraftId: string | null = null;
	let drafts: WarrantDraftItem[] = [];
	let loadingDrafts = false;
	let savingDraft = false;
	let selectedDraftId: string | null = null;
	let lastSavedAt: string | null = null;
	let lastSavedBy: string | null = null;

	// Facts
	let affiantName = '';
	let affiantBadge = '';
	let targetLocation = '';
	let requestedItemsText = '';
	let probableCauseText = '';
	let factsFocus = '';

	// AI draft
	let aiStatus: 'idle' | 'running' | 'done' | 'error' = 'idle';
	let aiError: string | null = null;
	let aiResult: WarrantDraftResult | null = null;
	let aiNarrativePreview = '';

	// Render
	let renderStatus: 'idle' | 'running' | 'done' | 'error' = 'idle';
	let renderError: string | null = null;
	let renderedHtml: string | null = null;
	let missingFields: string[] = [];

	// Export
	let exportStatus: 'idle' | 'running' | 'done' | 'error' = 'idle';
	let exportError: string | null = null;

	// Admin
	let includeDeleted = false;

	onMount(() => {
		loadTemplates();
		loadDrafts();
	});

	function buildDraftData(): Record<string, unknown> {
		const usedAi = !!aiResult && !!aiNarrativePreview;
		return {
			templateId: selectedTemplateId ?? '',
			facts: {
				affiantName,
				affiantBadge,
				targetLocation,
				requestedItemsText,
				probableCauseText,
				factsFocus
			},
			ai: usedAi
				? {
						used: true,
						narrative: aiNarrativePreview,
						generatedAt: new Date().toISOString()
					}
				: { used: false }
		};
	}

	async function loadDrafts() {
		if (rbacDenied) return;
		loadingDrafts = true;
		try {
			const res = await listWarrantDrafts(caseId, token, {
				includeDeleted: isAdmin && false
			});
			drafts = res.items ?? [];
			selectedDraftId = null;
		} catch {
			drafts = [];
		} finally {
			loadingDrafts = false;
		}
	}

	async function handleSaveDraft() {
		if (!selectedTemplateId) {
			toast.error('Select a template first');
			return;
		}
		const data = buildDraftData();
		savingDraft = true;
		try {
			if (currentDraftId) {
				const result = await createWarrantDraftVersion(caseId, currentDraftId, token, { data });
				lastSavedAt = result.version.createdAt;
				lastSavedBy = result.version.createdBy;
				toast.success('Draft saved (new version)');
			} else {
				const result = await createWarrantDraft(caseId, token, {
					templateId: selectedTemplateId,
					title: `Draft ${new Date().toLocaleDateString()}`,
					data
				});
				currentDraftId = result.draft.id;
				lastSavedAt = result.version.createdAt;
				lastSavedBy = result.version.createdBy;
				toast.success('Draft saved');
			}
			await loadDrafts();
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Save failed');
		} finally {
			savingDraft = false;
		}
	}

	async function handleLoadDraft() {
		const draftId = selectedDraftId ?? currentDraftId;
		if (!draftId) {
			toast.error('Select a draft to load');
			return;
		}
		try {
			const result = await getWarrantDraft(caseId, draftId, token);
			const d = result.latest?.data;
			if (d?.facts) {
				const f = d.facts as Record<string, string>;
				affiantName = f.affiantName ?? '';
				affiantBadge = f.affiantBadge ?? '';
				targetLocation = f.targetLocation ?? '';
				requestedItemsText = f.requestedItemsText ?? '';
				probableCauseText = f.probableCauseText ?? '';
				factsFocus = f.factsFocus ?? '';
			}
			if (d?.templateId) selectedTemplateId = String(d.templateId);
			if (d?.ai?.used && (d.ai as { narrative?: string }).narrative) {
				aiNarrativePreview = (d.ai as { narrative: string }).narrative;
				probableCauseText = aiNarrativePreview;
				aiStatus = 'done';
			}
			currentDraftId = result.draft.id;
			selectedDraftId = result.draft.id;
			lastSavedAt = result.latest.createdAt;
			lastSavedBy = result.latest.createdBy;
			toast.success('Draft loaded');
		} catch (e) {
			toast.error((e as Error)?.message ?? 'Load failed');
		}
	}

	function handleNewDraft() {
		if (currentDraftId || affiantName || probableCauseText) {
			if (!window.confirm('Start a new draft? Unsaved changes will be lost.')) return;
		}
		currentDraftId = null;
		selectedDraftId = null;
		affiantName = '';
		affiantBadge = '';
		targetLocation = '';
		requestedItemsText = '';
		probableCauseText = '';
		factsFocus = '';
		aiStatus = 'idle';
		aiResult = null;
		aiNarrativePreview = '';
		lastSavedAt = null;
		lastSavedBy = null;
		renderedHtml = null;
		renderStatus = 'idle';
		toast.success('New draft started');
	}

	async function loadTemplates() {
		loadingTemplates = true;
		rbacDenied = false;
		genericError = null;
		try {
			const res = await listTemplates(token);
			templates = (res.templates ?? []).filter((t) => !t.disabled);
		} catch (e) {
			const msg = (e as Error)?.message ?? '';
			if (msg.includes('403') || msg.toLowerCase().includes('access denied')) {
				rbacDenied = true;
			} else {
				genericError = msg;
			}
		} finally {
			loadingTemplates = false;
		}
	}

	function nextStep() {
		if (step < 5) step = (step + 1) as WorkflowStep;
	}

	function prevStep() {
		if (step > 1) step = (step - 1) as WorkflowStep;
	}

	async function handleGenerateAiDraft() {
		aiStatus = 'running';
		aiError = null;
		aiResult = null;
		aiNarrativePreview = '';
		try {
			const res = await requestAiWarrantDraft(caseId, token, {
				factsFocus: factsFocus.trim() || undefined,
				options: {
					maxEvidenceItems: 25,
					includeFiles: true,
					includeTimeline: true,
					includeDeleted: isAdmin && includeDeleted
				}
			});
			aiResult = res;
			aiNarrativePreview = res.draft?.probableCauseNarrative ?? '';
			aiStatus = 'done';
		} catch (e) {
			aiError = (e as Error)?.message ?? 'AI draft failed';
			aiStatus = 'error';
		}
	}

	function useAiNarrative() {
		if (aiNarrativePreview) {
			probableCauseText = aiNarrativePreview;
			toast.success('Narrative applied; you can edit before rendering');
		}
	}

	async function copyNarrative() {
		if (aiNarrativePreview) {
			await navigator.clipboard.writeText(aiNarrativePreview);
			toast.success('Copied to clipboard');
		}
	}

	async function handleRender() {
		if (!selectedTemplateId) return;
		renderStatus = 'running';
		renderError = null;
		renderedHtml = null;
		missingFields = [];
		try {
			const mergeOverrides = {
				case: {
					affiant_name: affiantName,
					affiant_badge: affiantBadge,
					target_location: targetLocation,
					requested_items: requestedItemsText,
					probable_cause: probableCauseText
				}
			};
			const res = await renderTemplate(caseId, selectedTemplateId, token, {
				mergeOverrides,
				options: { includeDeleted: isAdmin && includeDeleted }
			});
			renderedHtml = res.renderedHtml;
			missingFields = res.missingFields ?? [];
			renderStatus = 'done';
		} catch (e) {
			renderError = (e as Error)?.message ?? 'Render failed';
			renderStatus = 'error';
		}
	}

	async function handleDownloadPacket() {
		exportStatus = 'running';
		exportError = null;
		try {
			await downloadWarrantPacket(caseId, token, {
				includeDeleted: isAdmin && includeDeleted,
				caseNumber
			});
			exportStatus = 'done';
			toast.success('Warrant packet downloaded');
		} catch (e) {
			exportError = (e as Error)?.message ?? 'Download failed';
			exportStatus = 'error';
		} finally {
			exportStatus = exportStatus === 'running' ? 'idle' : exportStatus;
		}
	}

	function downloadRenderedTemplate() {
		if (!renderedHtml) return;
		const blob = new Blob([renderedHtml], { type: 'text/html' });
		const filename = `Rendered_Template_${caseId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.html`;
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
		toast.success('Template downloaded');
	}

	function openRenderedInNewTab() {
		if (!renderedHtml) return;
		const blob = new Blob([renderedHtml], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
		setTimeout(() => URL.revokeObjectURL(url), 2000);
	}
</script>

<div class="flex flex-col gap-4 p-4">
	<div class="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2 text-sm">
		Workflow is not saved to the case. Save drafts to persist your work. Copy or export outputs as needed.
	</div>

	{#if rbacDenied}
		<div class="text-red-600 dark:text-red-400 font-medium">Access denied (RBAC).</div>
		<p class="text-sm text-gray-600 dark:text-gray-400">You do not have permission to access this case or templates.</p>
	{:else if genericError}
		<div class="text-red-600 dark:text-red-400">{genericError}</div>
	{:else}
		<!-- Stepper -->
		<div class="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
			{#each [1, 2, 3, 4, 5] as s}
				<button
					type="button"
					class="px-2 py-1 text-sm rounded {step === s
						? 'bg-gray-200 dark:bg-gray-700 font-medium'
						: 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}"
					on:click={() => (step = s as WorkflowStep)}
				>
					{s}. {s === 1 ? 'Template' : s === 2 ? 'Facts' : s === 3 ? 'AI Draft' : s === 4 ? 'Render' : 'Export'}
				</button>
			{/each}
		</div>

		<!-- Drafts panel (Ticket 19) -->
		<div class="flex flex-wrap items-center gap-3 py-2 px-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
			<span class="text-sm font-medium">Drafts</span>
			<button
				type="button"
				class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
				on:click={handleSaveDraft}
				disabled={savingDraft || !selectedTemplateId}
			>
				{savingDraft ? 'Saving…' : 'Save Draft'}
			</button>
			<select
				bind:value={selectedDraftId}
				class="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm min-w-[200px]"
			>
				<option value="">— Select a saved draft —</option>
				{#each drafts as d}
					<option value={d.id}>{d.title} ({new Date(d.updatedAt).toLocaleString()})</option>
				{/each}
			</select>
			<button
				type="button"
				class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
				on:click={handleLoadDraft}
				disabled={loadingDrafts || (!selectedDraftId && !currentDraftId)}
			>
				Load Draft
			</button>
			<button
				type="button"
				class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
				on:click={handleNewDraft}
			>
				New Draft
			</button>
			{#if lastSavedAt}
				<span class="text-xs text-gray-500">
					Last saved: {new Date(lastSavedAt).toLocaleString()}
					{#if lastSavedBy}
						by {lastSavedBy}
					{/if}
				</span>
			{/if}
		</div>

		<!-- Admin includeDeleted toggle (backend enforces ADMIN) -->
		<label class="flex items-center gap-2 cursor-pointer text-sm">
			<input type="checkbox" bind:checked={includeDeleted} class="rounded" />
			<span>Include deleted items {#if !isAdmin}<span class="text-gray-500">(ADMIN only; backend enforces)</span>{/if}</span>
		</label>

		<!-- Step 1: Select template -->
		{#if step === 1}
			<div>
				<h3 class="font-medium mb-2">Select template</h3>
				{#if loadingTemplates}
					<p class="text-sm text-gray-500">Loading templates…</p>
				{:else}
					<select
						bind:value={selectedTemplateId}
						class="w-full max-w-md rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
					>
						<option value="">— Select a template —</option>
						{#each templates as t}
							<option value={t.templateId}>{t.label} ({t.category})</option>
						{/each}
					</select>
					<div class="mt-4 flex gap-2">
						<button
							type="button"
							class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
							on:click={nextStep}
							disabled={!selectedTemplateId}
						>
							Next
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Step 2: Gather facts -->
		{#if step === 2}
			<div class="space-y-3">
				<h3 class="font-medium">Gather facts</h3>
				<div>
					<label class="block text-sm text-gray-600 dark:text-gray-400">Affiant Name</label>
					<input
						type="text"
						bind:value={affiantName}
						class="w-full max-w-md rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
					/>
				</div>
				<div>
					<label class="block text-sm text-gray-600 dark:text-gray-400">Affiant Badge/ID</label>
					<input
						type="text"
						bind:value={affiantBadge}
						class="w-full max-w-md rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
					/>
				</div>
				<div>
					<label class="block text-sm text-gray-600 dark:text-gray-400">Target Location</label>
					<input
						type="text"
						bind:value={targetLocation}
						class="w-full max-w-md rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
					/>
				</div>
				<div>
					<label class="block text-sm text-gray-600 dark:text-gray-400">Requested Items (one per line)</label>
					<textarea
						bind:value={requestedItemsText}
						rows="3"
						class="w-full max-w-md rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
					></textarea>
				</div>
				<div>
					<label class="block text-sm text-gray-600 dark:text-gray-400">Facts focus (optional, for AI)</label>
					<input
						type="text"
						bind:value={factsFocus}
						placeholder="e.g., emphasize timeline order, key witnesses"
						class="w-full max-w-md rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
					/>
				</div>
				<div>
					<label class="block text-sm text-gray-600 dark:text-gray-400">Probable Cause Narrative</label>
					<textarea
						bind:value={probableCauseText}
						rows="4"
						placeholder="Type manually or fill from AI draft"
						class="w-full max-w-md rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
					></textarea>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
						on:click={prevStep}
					>
						Back
					</button>
					<button
						type="button"
						class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700"
						on:click={nextStep}
					>
						Next
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 3: Optional AI draft -->
		{#if step === 3}
			<div class="space-y-3">
				<h3 class="font-medium">Optional AI Draft (proposal-only)</h3>
				<button
					type="button"
					class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
					on:click={handleGenerateAiDraft}
					disabled={aiStatus === 'running'}
				>
					{aiStatus === 'running' ? 'Generating…' : 'Generate AI Draft'}
				</button>
				{#if aiStatus === 'done' && aiResult}
					<div class="border border-gray-200 dark:border-gray-700 rounded p-3 space-y-2">
						<p class="text-sm font-medium">Narrative preview:</p>
						<div
							class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto rounded bg-gray-50 dark:bg-gray-900 p-2"
						>
							{aiNarrativePreview || '(empty)'}
						</div>
						{#if aiResult.draft?.missingInfoQuestions?.length}
							<p class="text-sm text-amber-600 dark:text-amber-400">Missing questions:</p>
							<ul class="text-sm list-disc list-inside">
								{#each aiResult.draft.missingInfoQuestions as q}
									<li>{q}</li>
								{/each}
							</ul>
						{/if}
						{#if aiResult.draft?.citations?.length}
							<p class="text-sm font-medium">Citations:</p>
							<ul class="text-sm space-y-1">
								{#each aiResult.draft.citations as c}
									<li>
										<span class="text-gray-600 dark:text-gray-400">"{c.claim}"</span> → evidence IDs:
										{c.evidenceItemIds?.join(', ') ?? '-'}
									</li>
								{/each}
							</ul>
						{/if}
						<div class="flex gap-2 pt-2">
							<button
								type="button"
								class="rounded bg-green-600 text-white px-3 py-1.5 text-sm hover:bg-green-700"
								on:click={useAiNarrative}
							>
								Use this narrative
							</button>
							<button
								type="button"
								class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
								on:click={copyNarrative}
							>
								Copy narrative
							</button>
						</div>
					</div>
				{/if}
				{#if aiStatus === 'error'}
					<p class="text-sm text-red-600 dark:text-red-400">{aiError}</p>
				{/if}
				<div class="flex gap-2 pt-2">
					<button
						type="button"
						class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
						on:click={prevStep}
					>
						Back
					</button>
					<button
						type="button"
						class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700"
						on:click={nextStep}
					>
						Next
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 4: Render -->
		{#if step === 4}
			<div class="space-y-3">
				<h3 class="font-medium">Render template</h3>
				<button
					type="button"
					class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
					on:click={handleRender}
					disabled={renderStatus === 'running'}
				>
					{renderStatus === 'running' ? 'Rendering…' : 'Render Template'}
				</button>
				{#if missingFields.length > 0}
					<div class="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-sm">
						<span aria-hidden="true">⚠</span>
						<div>
							<p class="font-medium">Missing fields:</p>
							<ul class="list-disc list-inside">{missingFields.join(', ')}</ul>
						</div>
					</div>
				{/if}
				{#if renderStatus === 'done' && renderedHtml}
					<div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
						<iframe
							title="Rendered template preview"
							srcdoc={renderedHtml}
							class="w-full h-80 border-0"
							sandbox="allow-same-origin"
						></iframe>
					</div>
					<div class="flex gap-2">
						<button
							type="button"
							class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
							on:click={openRenderedInNewTab}
						>
							Open in new tab
						</button>
						<button
							type="button"
							class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
							on:click={downloadRenderedTemplate}
						>
							Download rendered HTML
						</button>
					</div>
				{/if}
				{#if renderStatus === 'error'}
					<p class="text-sm text-red-600 dark:text-red-400">{renderError}</p>
				{/if}
				<div class="flex gap-2 pt-2">
					<button
						type="button"
						class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
						on:click={prevStep}
					>
						Back
					</button>
					<button
						type="button"
						class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
						on:click={nextStep}
						disabled={!renderedHtml}
					>
						Next
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 5: Export warrant packet -->
		{#if step === 5}
			<div class="space-y-3">
				<h3 class="font-medium">Export warrant packet</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					This packet exports case timeline + evidence list. It does not include your typed facts unless they
					exist in the case timeline.
				</p>
				<button
					type="button"
					class="rounded bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50"
					on:click={handleDownloadPacket}
					disabled={exportStatus === 'running'}
				>
					{exportStatus === 'running' ? 'Downloading…' : 'Download Warrant Packet (HTML)'}
				</button>
				{#if renderedHtml}
					<p class="text-sm text-gray-600 dark:text-gray-400">
						You can also open your rendered template in a new tab or download it from the previous step.
					</p>
					<div class="flex gap-2">
						<button
							type="button"
							class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
							on:click={openRenderedInNewTab}
						>
							Open rendered template in new tab
						</button>
					</div>
				{/if}
				{#if exportStatus === 'error'}
					<p class="text-sm text-red-600 dark:text-red-400">{exportError}</p>
				{/if}
				<div class="flex gap-2 pt-2">
					<button
						type="button"
						class="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
						on:click={prevStep}
					>
						Back
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>
