/**
 * P76-03 — Wave 3 case workspace shell strangler boundary (hybrid migration per P73-04).
 *
 * **Gate:** `PUBLIC_DETECTIVE_WAVE3_CASE_SHELL` (Vite public env, browser + SSR).
 * - **Unset / empty:** Wave 3 governed path **on** (default forward — P76-02 `ds-case-shell*` + `data-region` map).
 * - **`0`, `false`, `off`, `no` (case-insensitive):** **rollback** — pre–P76-02 case shell **root** surface only (Tailwind canvas classes); legacy body/canvas flex classes; **no** `data-region` shell map; chat context rail uses neutral gray borders (pre–P76-02 rail styling).
 * - **`1`, `true`, or any other value:** Wave 3 path **on**.
 *
 * **Independent of:** `PUBLIC_DETECTIVE_WAVE2_APP_SHELL` — app shell / GNAV / OCC are not toggled by this flag.
 *
 * **What is gated:** P76-02 `DS_CASE_SHELL_*` classes, `data-region="case-shell-*"`, Tier-L token styling on optional **shell-level** context rail.
 * **What is not gated:** Tier L `.ce-l-identity-bar` / `.ce-l-tab-strip` (case chrome); Wave 2 `DetectiveAppShellFrame`; P19-05 auth; route `<slot />` content.
 *
 * **Rollback:** set `PUBLIC_DETECTIVE_WAVE3_CASE_SHELL=0` in `.env`, restart Vite.
 * **Sunset:** remove this gate after Wave 3 cutover when `ds-case-shell` is unconditional (program decision).
 */
import { env } from '$env/dynamic/public';

/** Testable parser — default-on when unset (matches product rollout default). */
export function parseWave3CaseShellFlag(v: string | undefined): boolean {
	if (v === undefined || v === '') return true;
	const s = String(v).trim().toLowerCase();
	if (s === '0' || s === 'false' || s === 'off' || s === 'no') return false;
	return true;
}

export function isDetectiveWave3CaseShellEnabled(): boolean {
	return parseWave3CaseShellFlag(env.PUBLIC_DETECTIVE_WAVE3_CASE_SHELL);
}

/** Pre–P76-02 / rollback: root flex chain without DS `ds-case-shell` token surface. */
export const WAVE3_CASE_SHELL_LEGACY_ROOT_CLASS =
	'flex flex-col flex-1 min-h-0 max-h-full w-full min-w-0 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 overflow-hidden';

export const WAVE3_CASE_SHELL_LEGACY_BODY_CLASS = 'flex flex-1 min-h-0 overflow-hidden';

export const WAVE3_CASE_SHELL_LEGACY_CANVAS_COLUMN_CLASS = 'flex flex-col flex-1 min-w-0 min-h-0';

/** Pre–P76-02 optional chat rail (gray borders). */
export const WAVE3_CASE_SHELL_LEGACY_RAIL_CLASS =
	'hidden xl:flex w-56 shrink-0 flex-col border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900';

/** P76-02 governed rail (Tier L chrome tokens). */
export const WAVE3_CASE_SHELL_GOVERNED_RAIL_CLASS =
	'hidden xl:flex w-56 shrink-0 flex-col border-l border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-surface-muted)]';
