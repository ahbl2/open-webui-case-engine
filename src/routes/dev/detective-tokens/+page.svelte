<script lang="ts">
	/**
	 * P74-02 … P74-09 — Dev validation: DS primitives including Ask integrity banner.
	 * P74-11 — Fidelity review artifact: docs/phases/phase_74/P74-11_WAVE_1_VISUAL_QA_AND_FIDELITY_REVIEW.md
	 */
	import { onMount } from 'svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import DetectiveAskIntegrityBanner from '$lib/components/primitives/DetectiveAskIntegrityBanner.svelte';
	import { toast } from 'svelte-sonner';
	import NotificationToast from '$lib/components/NotificationToast.svelte';
	import DetectiveBanner from '$lib/components/primitives/DetectiveBanner.svelte';
	import DetectiveDrawer from '$lib/components/primitives/DetectiveDrawer.svelte';
	import DetectiveModal from '$lib/components/primitives/DetectiveModal.svelte';
	import DetectiveEmptyState from '$lib/components/primitives/DetectiveEmptyState.svelte';
	import DetectiveErrorState from '$lib/components/primitives/DetectiveErrorState.svelte';
	import DetectiveLoadingState from '$lib/components/primitives/DetectiveLoadingState.svelte';
	import DetectiveTooltip from '$lib/components/primitives/DetectiveTooltip.svelte';
	import { DS_VARS } from '$lib/case/detectiveDesignTokens';
	import {
		DS_ASK_INTEGRITY_CLASSES,
		DS_BADGE_CLASSES,
		DS_BANNER_CLASSES,
		DS_BTN_CLASSES,
		DS_CARD_CLASSES,
		DS_CHIP_CLASSES,
		DS_CONFIRM_CLASSES,
		DS_DRAWER_CLASSES,
		DS_EMPTY_CLASSES,
		DS_LOADING_CLASSES,
		DS_MODAL_CLASSES,
		DS_OVERLAY_CLASSES,
		DS_PANEL_CLASSES,
		DS_SCROLL_CLASSES,
		DS_SECTION_HEADER_CLASSES,
		DS_SKELETON_CLASSES,
		DS_STACK_CLASSES,
		DS_STATUS_SURFACE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_SURFACE_CLASSES,
		DS_TOAST_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { CE_L_VARS } from '$lib/case/caseWorkspaceTierL';

	const scrollDemoRows = Array.from({ length: 28 }, (_, i) => i + 1);

	let dark = false;

	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggleDark(): void {
		dark = !dark;
		if (dark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	function showDevToast(): void {
		toast.custom(NotificationToast, {
			props: {
				title: 'Dev notice',
				content: '**Non-domain** sample — `NotificationToast` + `ds-toast` (same svelte-sonner engine).'
			},
			duration: 5000
		});
	}

	let showModalDemo = false;
	let showDrawerDemo = false;
	let showConfirmDemo = false;
	let showDestructiveDemo = false;

	const swatches: { label: string; var: string }[] = [
		{ label: 'DS app bg', var: DS_VARS.bgApp },
		{ label: 'DS chrome', var: DS_VARS.bgChrome },
		{ label: 'DS text primary', var: DS_VARS.textPrimary },
		{ label: 'DS accent', var: DS_VARS.accent },
		{ label: 'Tier L canvas', var: CE_L_VARS.canvas },
		{ label: 'Tier L error bg', var: CE_L_VARS.errorBg }
	];

	const typeSamples: { label: string; className: string; sample: string }[] = [
		{ label: 'Display', className: DS_TYPE_CLASSES.display, sample: 'Case workspace' },
		{ label: 'Section', className: DS_TYPE_CLASSES.section, sample: 'Section heading' },
		{ label: 'Panel', className: DS_TYPE_CLASSES.panel, sample: 'Panel title' },
		{ label: 'Body', className: DS_TYPE_CLASSES.body, sample: 'Body copy for operational reading density.' },
		{ label: 'Meta', className: DS_TYPE_CLASSES.meta, sample: '2026-04-10 · ID · secondary line' },
		{ label: 'Label', className: DS_TYPE_CLASSES.label, sample: 'Dense label' },
		{ label: 'Mono', className: DS_TYPE_CLASSES.mono, sample: 'sha256:abc123…' }
	];

	const statusSurfaces: { label: string; className: string }[] = [
		{ label: 'Success', className: DS_STATUS_SURFACE_CLASSES.success },
		{ label: 'Warning', className: DS_STATUS_SURFACE_CLASSES.warning },
		{ label: 'Danger', className: DS_STATUS_SURFACE_CLASSES.danger },
		{ label: 'Info', className: DS_STATUS_SURFACE_CLASSES.info },
		{ label: 'Error', className: DS_STATUS_SURFACE_CLASSES.error },
		{ label: 'Neutral', className: DS_STATUS_SURFACE_CLASSES.neutral }
	];

	const bannerRows: { label: string; variant: keyof typeof DS_STATUS_SURFACE_CLASSES }[] = [
		{ label: 'Info', variant: 'info' },
		{ label: 'Warning', variant: 'warning' },
		{ label: 'Danger', variant: 'danger' },
		{ label: 'Success', variant: 'success' },
		{ label: 'Error', variant: 'error' },
		{ label: 'Neutral', variant: 'neutral' }
	];

	const statusText: { label: string; className: string }[] = [
		{ label: 'Success', className: DS_STATUS_TEXT_CLASSES.success },
		{ label: 'Warning', className: DS_STATUS_TEXT_CLASSES.warning },
		{ label: 'Danger', className: DS_STATUS_TEXT_CLASSES.danger },
		{ label: 'Info', className: DS_STATUS_TEXT_CLASSES.info },
		{ label: 'Error', className: DS_STATUS_TEXT_CLASSES.error }
	];
</script>

<div
	class="flex h-full min-h-0 flex-col gap-6 p-6"
	style:color="var(--ds-text-primary)"
	style:background="var(--ds-bg-app)"
>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="ds-type-display">Detective primitive foundation (dev)</h1>
		<button type="button" class={DS_BTN_CLASSES.secondary} onclick={toggleDark}>
			Toggle html.dark (currently: {dark ? 'on' : 'off'})
		</button>
	</div>

	<p class="ds-type-meta max-w-3xl">
		P74-02 tokens · P74-03 type/status · P74-04 controls · P74-05 surfaces/scroll · P74-06 empty/loading/skeleton · P74-07
		error/banner/toast · P74-08 modal/drawer/confirm · P74-09 Ask integrity. Use Interface theme = Dark for benchmark alignment.
		Wave 1 visual QA / benchmark review: P74-11 (<code class="ds-type-mono">docs/phases/phase_74/P74-11_WAVE_1_VISUAL_QA_AND_FIDELITY_REVIEW.md</code>).
	</p>

	<section class="flex flex-col gap-2" aria-labelledby="tok-heading">
		<h2 id="tok-heading" class="ds-type-section">Design tokens (swatches)</h2>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each swatches as row}
				<div
					class="flex flex-col gap-1 rounded-lg border p-3"
					style:border-color="var(--ds-border-default)"
					style:background="var(--ds-bg-surface)"
				>
					<span class="ds-type-label">{row.label}</span>
					<code class="ds-type-mono break-all">{row.var}</code>
					<div
						class="h-12 w-full rounded border"
						style:border-color="var(--ds-border-default)"
						style:background={`var(${row.var})`}
					/>
				</div>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="ctrl-heading">
		<h2 id="ctrl-heading" class="ds-type-section">Buttons, badges, chips, tooltip (P74-04)</h2>
		<div class="flex flex-col gap-3 rounded-lg border p-4" style:border-color="var(--ds-border-default)">
			<div class="flex flex-wrap items-center gap-2">
				<button type="button" class={DS_BTN_CLASSES.primary}>Primary</button>
				<button type="button" class={DS_BTN_CLASSES.secondary}>Secondary</button>
				<button type="button" class={DS_BTN_CLASSES.ghost}>Ghost</button>
				<button type="button" class={DS_BTN_CLASSES.danger}>Destructive</button>
				<button type="button" class={DS_BTN_CLASSES.primary} disabled>Disabled</button>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span class={DS_BADGE_CLASSES.neutral}>neutral</span>
				<span class={DS_BADGE_CLASSES.success}>ok</span>
				<span class={DS_BADGE_CLASSES.warning}>warn</span>
				<span class={DS_BADGE_CLASSES.danger}>risk</span>
				<span class={DS_BADGE_CLASSES.info}>info</span>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span class={DS_CHIP_CLASSES.base}>Filter: open</span>
				<span class={DS_CHIP_CLASSES.active}>Filter: active</span>
			</div>
			<div class="flex flex-wrap items-center gap-4">
				<DetectiveTooltip content="Dense tooltip copy (token-backed surface)">
					<span class="ds-type-body" style:text-decoration="underline">Hover: help cursor</span>
				</DetectiveTooltip>
				<DetectiveTooltip content="Icon toolbar control" dense>
					<span class="ds-type-body">Dense trigger</span>
				</DetectiveTooltip>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="surf-heading">
		<h2 id="surf-heading" class="ds-type-section">Surfaces & bounded scroll (P74-05)</h2>
		<p class="ds-type-meta max-w-3xl">
			<code class="ds-type-mono">ds-scroll-root</code> + <code class="ds-type-mono">ds-scroll-body</code> are unlayered
			(P71-FU6). Tier L <code class="ds-type-mono">ce-l-content-region</code> remains the case-route contract.
		</p>
		<div class="grid gap-4 lg:grid-cols-2">
			<div class="{DS_PANEL_CLASSES.primary} flex max-h-80 min-h-0 flex-col overflow-hidden">
				<div class={DS_SECTION_HEADER_CLASSES.header}>
					<span class="ds-type-panel">Primary panel</span>
					<span class={DS_BADGE_CLASSES.info}>scroll</span>
				</div>
				<div class={DS_SCROLL_CLASSES.root}>
					<div class={DS_SCROLL_CLASSES.body}>
						<div class={DS_STACK_CLASSES.stack}>
							{#each scrollDemoRows as n}
								<div class={DS_CARD_CLASSES.card}>
									<span class="ds-type-body">Dense row {n} — bounded vertical scroll inside panel.</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
			<div class="flex max-h-80 min-h-0 flex-col gap-3">
				<div class="{DS_PANEL_CLASSES.muted} flex flex-1 flex-col">
					<span class="ds-type-section">Muted panel</span>
					<p class="ds-type-meta mt-2">Secondary chrome for nested supporting blocks.</p>
				</div>
				<div class="{DS_SURFACE_CLASSES.base} flex flex-1 flex-col rounded-lg border p-3" style:border-color="var(--ds-border-default)">
					<span class="ds-type-label">ds-surface base</span>
					<p class="ds-type-body mt-1">Canvas-level surface tint for isolated workspace blocks.</p>
				</div>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="els-heading">
		<h2 id="els-heading" class="ds-type-section">Empty, loading & skeleton (P74-06)</h2>
		<p class="ds-type-meta max-w-3xl">
			Generic primitives only — no domain copy. <code class="ds-type-mono">DetectiveEmptyState</code> /
			<code class="ds-type-mono">DetectiveLoadingState</code> wrap the case components; skeletons are structural CSS
			(<code class="ds-type-mono">{DS_SKELETON_CLASSES.row}</code>, etc.).
		</p>
		<div class="grid gap-4 lg:grid-cols-2">
			<div class="{DS_PANEL_CLASSES.primaryDense} flex min-h-0 flex-col">
				<div class={DS_SECTION_HEADER_CLASSES.header}>
					<span class="ds-type-panel">Empty (framed)</span>
					<span class={DS_BADGE_CLASSES.neutral}>ds-empty</span>
				</div>
				<DetectiveEmptyState
					title="Nothing here yet"
					description="Placeholder for panel-level empty state; actions slot optional."
					testId="dev-ds-empty-framed"
				/>
			</div>
			<div class="{DS_PANEL_CLASSES.primaryDense} flex min-h-0 flex-col">
				<div class={DS_SECTION_HEADER_CLASSES.header}>
					<span class="ds-type-panel">Loading</span>
					<span class={DS_BADGE_CLASSES.info}>ds-loading</span>
				</div>
				<DetectiveLoadingState label="Loading workspace data…" testId="dev-ds-loading-panel" />
			</div>
			<div class="{DS_PANEL_CLASSES.muted} flex flex-col gap-3">
				<span class="ds-type-section">Compact loading</span>
				<p class="ds-type-meta">
					<code class="ds-type-mono">{DS_LOADING_CLASSES.compact}</code> for dense dashboard blocks.
				</p>
				<div class={DS_LOADING_CLASSES.compact}>
					<div class="flex justify-center" aria-hidden="true">
						<svg
							class="size-5 {DS_LOADING_CLASSES.icon}"
							viewBox="0 0 24 24"
							fill="currentColor"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
								opacity=".25"
							/>
							<path
								d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
							/>
						</svg>
					</div>
					<p class={DS_LOADING_CLASSES.label}>Refreshing…</p>
				</div>
			</div>
			<div class="{DS_PANEL_CLASSES.primary} flex min-h-0 flex-col gap-3">
				<div class={DS_SECTION_HEADER_CLASSES.header}>
					<span class="ds-type-panel">Skeleton rows</span>
					<span class={DS_BADGE_CLASSES.warning}>structural</span>
				</div>
				<div class={DS_STACK_CLASSES.tight}>
					<div class={DS_SKELETON_CLASSES.row} aria-hidden="true">
						<div class="{DS_SKELETON_CLASSES.base} ds-skeleton-avatar ds-skeleton-shimmer" />
						<div class={DS_SKELETON_CLASSES.lines}>
							<div class="{DS_SKELETON_CLASSES.line} ds-skeleton-shimmer" />
							<div class={DS_SKELETON_CLASSES.line} />
						</div>
					</div>
					<div class={DS_SKELETON_CLASSES.row} aria-hidden="true">
						<div class="{DS_SKELETON_CLASSES.base} ds-skeleton-avatar" />
						<div class={DS_SKELETON_CLASSES.lines}>
							<div class={DS_SKELETON_CLASSES.lineWide} />
							<div class="{DS_SKELETON_CLASSES.line} ds-skeleton-shimmer" />
						</div>
					</div>
					<div class={DS_SKELETON_CLASSES.block} aria-hidden="true" />
				</div>
			</div>
		</div>
		<div class="mt-2">
			<DetectiveEmptyState title="Unframed empty" description="Inside a parent shell." framed={false} testId="dev-ds-empty-compact">
				<svelte:fragment slot="icon">
					<span class="ds-type-meta" style:opacity={0.5} aria-hidden="true">◇</span>
				</svelte:fragment>
			</DetectiveEmptyState>
		</div>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="ebt-heading">
		<h2 id="ebt-heading" class="ds-type-section">Error, banner & toast (P74-07)</h2>
		<p class="ds-type-meta max-w-3xl">
			<code class="ds-type-mono">ds-error*</code> panel errors · <code class="ds-type-mono">ds-banner</code> +
			<code class="ds-type-mono">ds-status-surface-*</code> · <code class="ds-type-mono">{DS_TOAST_CLASSES.root}</code> on
			<code class="ds-type-mono">NotificationToast</code>. Retry uses <code class="ds-type-mono">DS_BTN_CLASSES.secondary</code>.
		</p>
		<div class="grid gap-4 lg:grid-cols-2">
			<div class="{DS_PANEL_CLASSES.primaryDense} flex min-h-0 flex-col gap-3">
				<div class={DS_SECTION_HEADER_CLASSES.header}>
					<span class="ds-type-panel">Error state + retry</span>
					<span class={DS_BADGE_CLASSES.danger}>ds-error</span>
				</div>
				<DetectiveErrorState
					title="Request did not complete"
					message="Generic failure description for dev validation."
					onRetry={() => undefined}
				/>
				<DetectiveErrorState title="Details slot" message="Optional monospace region below.">
					<svelte:fragment slot="details">
						<code class="ds-type-mono">ERR_SAMPLE · request_id=00000000-0000-0000-0000-000000000000</code>
					</svelte:fragment>
				</DetectiveErrorState>
			</div>
			<div class="{DS_PANEL_CLASSES.primary} flex min-h-0 flex-col gap-3">
				<div class={DS_SECTION_HEADER_CLASSES.header}>
					<span class="ds-type-panel">Toast (sonner)</span>
					<span class={DS_BADGE_CLASSES.neutral}>ds-toast</span>
				</div>
				<p class="ds-type-meta">
					Uses the existing <code class="ds-type-mono">toast.custom(NotificationToast, …)</code> path; only presentation is
					DS-aligned.
				</p>
				<div>
					<button type="button" class={DS_BTN_CLASSES.secondary} onclick={showDevToast}>Show sample toast</button>
				</div>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<span class="ds-type-label">Banner row — {DS_BANNER_CLASSES.base} + semantic surface</span>
			<div class="flex flex-col gap-2">
				{#each bannerRows as row}
					<DetectiveBanner variant={row.variant}>
						<span slot="label">{row.label}</span>
						Inline feedback line — non-domain placeholder copy.
					</DetectiveBanner>
				{/each}
			</div>
			<DetectiveBanner variant="warning" dense>
				<span slot="label">Dense</span>
				<code class="ds-type-mono">{DS_BANNER_CLASSES.base} {DS_BANNER_CLASSES.denseModifier}</code> + warning surface.
			</DetectiveBanner>
		</div>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="mdc-heading">
		<h2 id="mdc-heading" class="ds-type-section">Modal, drawer & confirm (P74-08)</h2>
		<p class="ds-type-meta max-w-3xl">
			Same overlay engines as the app — <code class="ds-type-mono">{DS_OVERLAY_CLASSES.backdrop}</code>,
			<code class="ds-type-mono">{DS_MODAL_CLASSES.panel}</code>,
			<code class="ds-type-mono">{DS_DRAWER_CLASSES.panel}</code>,
			<code class="ds-type-mono">{DS_CONFIRM_CLASSES.panel}</code>. Open each sample; destructive confirm uses
			<code class="ds-type-mono">{DS_CONFIRM_CLASSES.destructiveModifier}</code> + DS buttons.
		</p>
		<div class="flex flex-wrap gap-2">
			<button type="button" class={DS_BTN_CLASSES.secondary} onclick={() => (showModalDemo = true)}>Open modal</button>
			<button type="button" class={DS_BTN_CLASSES.secondary} onclick={() => (showDrawerDemo = true)}>Open drawer</button>
			<button type="button" class={DS_BTN_CLASSES.secondary} onclick={() => (showConfirmDemo = true)}>Open confirm</button>
			<button type="button" class={DS_BTN_CLASSES.danger} onclick={() => (showDestructiveDemo = true)}>
				Open destructive confirm
			</button>
		</div>
	</section>

	<DetectiveModal bind:show={showModalDemo} size="sm">
		<div class="p-4">
			<p class="ds-type-body">Generic modal content — title/actions live in the slot for migration flexibility.</p>
			<button type="button" class="{DS_BTN_CLASSES.primary} mt-3" onclick={() => (showModalDemo = false)}>Close</button>
		</div>
	</DetectiveModal>

	<DetectiveDrawer bind:show={showDrawerDemo}>
		<div class="p-4">
			<p class="ds-type-body">Generic bottom-sheet / drawer body.</p>
			<button type="button" class="{DS_BTN_CLASSES.secondary} mt-3" onclick={() => (showDrawerDemo = false)}>Close</button>
		</div>
	</DetectiveDrawer>

	<ConfirmDialog
		bind:show={showConfirmDemo}
		title="Confirm action"
		message="Proceed with this **generic** operation?"
		onConfirm={() => undefined}
	/>

	<ConfirmDialog
		bind:show={showDestructiveDemo}
		destructive={true}
		severityHint="This operation cannot be reversed."
		title="Remove item"
		message="Confirm removal of the selected record."
		confirmLabel="Delete"
		onConfirm={() => undefined}
	/>

	<section class="flex flex-col gap-3" aria-labelledby="aib-heading">
		<h2 id="aib-heading" class="ds-type-section">Ask integrity / degraded (P74-09)</h2>
		<p class="ds-type-meta max-w-3xl">
			Phase 33 read-time presentation — <code class="ds-type-mono">{DS_ASK_INTEGRITY_CLASSES.root}</code> + variant
			(<code class="ds-type-mono">{DS_ASK_INTEGRITY_CLASSES.supported}</code>,
			<code class="ds-type-mono">{DS_ASK_INTEGRITY_CLASSES.degraded}</code>,
			<code class="ds-type-mono">{DS_ASK_INTEGRITY_CLASSES.notApplicable}</code>). Governance copy from
			<code class="ds-type-mono">askIntegrityUi</code>; optional <code class="ds-type-mono">detail</code> slot for audit/meta.
		</p>
		<div class="flex max-w-2xl flex-col gap-2">
			<DetectiveAskIntegrityBanner integrityPresentation="SUPPORTED" />
			<DetectiveAskIntegrityBanner integrityPresentation="DEGRADED" />
			<DetectiveAskIntegrityBanner integrityPresentation="NOT_APPLICABLE" />
			<DetectiveAskIntegrityBanner integrityPresentation="DEGRADED">
				<svelte:fragment slot="detail">
					<span class="ds-type-mono">detail · request_id=00000000-0000-0000-0000-000000000000</span>
				</svelte:fragment>
			</DetectiveAskIntegrityBanner>
		</div>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="type-heading">
		<h2 id="type-heading" class="ds-type-section">Typography roles (P74-03)</h2>
		<div class="flex flex-col gap-3 rounded-lg border p-4" style:border-color="var(--ds-border-default)">
			{#each typeSamples as row}
				<div class="flex flex-col gap-1 border-b border-dashed pb-3 last:border-0 last:pb-0" style:border-color="var(--ds-border-subtle)">
					<span class="ds-type-label">{row.label}</span>
					<div class={row.className}>{row.sample}</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="stat-heading">
		<h2 id="stat-heading" class="ds-type-section">Semantic status (token-backed)</h2>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each statusSurfaces as row}
				<div class="flex flex-col gap-2 rounded-lg p-3 {row.className}">
					<span class="ds-type-meta" style:color="inherit">{row.label}</span>
					<p class="ds-status-copy">Token-backed surface; no raw palette in CSS.</p>
				</div>
			{/each}
		</div>
		<div class="flex flex-wrap gap-4">
			{#each statusText as row}
				<span class="ds-type-body {row.className}">{row.label} text</span>
			{/each}
		</div>
	</section>
</div>
