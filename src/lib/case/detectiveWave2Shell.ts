/**
 * P75-03 — Wave 2 app shell strangler boundary (hybrid migration per program P73-04).
 *
 * **Gate:** `PUBLIC_DETECTIVE_WAVE2_APP_SHELL` (Vite public env, browser + SSR).
 * - **Unset / empty:** Wave 2 `DetectiveAppShellFrame` path **on** (default forward).
 * - **`0`, `false`, `off`, `no` (case-insensitive):** legacy main column only — **no** app shell frame (rollback).
 * - **`1`, `true`, or any other value:** Wave 2 path **on**.
 *
 * **What is gated:** (1) P75-02 `DetectiveAppShellFrame` (DS top strip + main regions) for unified-sidebar routes; (2) P75-04-FU **Wave 2 GNAV** inside `DetectiveWorkspaceSidebar` (`DetectiveGnavPrimaryNav` + `DetectiveGnavUtilityCluster` + DS `.ds-gnav-*`). When off, sidebar uses **legacy** pre–Wave-2 nav rows + `UserMenu` only; (3) P75-06-FU **`OperatorCommandCenterFrame` on `/home`** — when off, `/home` uses **legacy** My Desktop layout (no OCC summary band / right rail).
 * **What is not gated:** `DetectiveWorkspaceSidebar` **shell chrome** (header, resize, CasesSection, SearchModal) — only the **Wave 2 GNAV/utility cluster** swaps; Case Engine auth, `(app)/+layout` otherwise, case workspace layout.
 *
 * **Rollback:** set `PUBLIC_DETECTIVE_WAVE2_APP_SHELL=0` in `.env`, rebuild/restart Vite — restores pre–P75-02 main column wrapping **and** pre–P75-04 sidebar primary nav / utility cluster **and** pre–P75-06 `/home` OCC frame (My Desktop-only layout).
 * **Sunset:** remove this gate after Wave 2/3 cutover when the frame is unconditionally default (program decision).
 */
import { env } from '$env/dynamic/public';

/** Testable parser — default-on when unset (matches product rollout default). */
export function parseWave2AppShellFlag(v: string | undefined): boolean {
	if (v === undefined || v === '') return true;
	const s = String(v).trim().toLowerCase();
	if (s === '0' || s === 'false' || s === 'off' || s === 'no') return false;
	return true;
}

export function isDetectiveWave2AppShellEnabled(): boolean {
	return parseWave2AppShellFlag(env.PUBLIC_DETECTIVE_WAVE2_APP_SHELL);
}
