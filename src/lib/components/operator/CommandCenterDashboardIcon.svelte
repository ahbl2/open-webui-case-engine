<!--
	P131.5-05 — Neutral inline SVG icons for Command Center dashboard (scanning anchors only; no semantic coloring).
	Presentational only; stroke matches currentColor.
-->
<script lang="ts">
	/** Icon shape — decorative only; must not imply status or priority. */
	export let name: 'folder' | 'clock' | 'list' | 'circle';
	/** Tailwind size classes */
	export let className = 'h-5 w-5';
</script>

{#if name === 'folder'}
	<svg
		class={className}
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.75"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
		/>
	</svg>
{:else if name === 'clock'}
	<svg
		class={className}
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.75"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
		/>
		<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
	</svg>
{:else if name === 'list'}
	<svg
		class={className}
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.75"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.008v.008H3.75v-.008Zm0 5.25h.008v.008H3.75v-.008Zm0 5.25h.008v.008H3.75v-.008Z" />
	</svg>
{:else}
	<!-- circle — neutral ring; not a status indicator -->
	<svg
		class={className}
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.75"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
		/>
	</svg>
{/if}
