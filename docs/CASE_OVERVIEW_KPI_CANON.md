# Case overview KPI band — canonical colors and icons

**Status:** Canonical for the case **Summary** top metrics row and for **visual consistency** on the associated case workspace areas (pages, section headers, list row accents, empty states).

**Source of truth (implementation):** `src/lib/components/case/CaseOverviewSummaryCards.svelte`  
**Styles:** `ds-occ-kpi-card` + `ds-occ-kpi-card--{variant}` in `src/lib/styles/detectiveSurfaces.css` (`--occ-kpi-accent` per variant).

When building UI for these domains elsewhere, **reuse the same CSS variant** and the **same Heroicon** (24×24 **outline** from `heroicons-svelte/24/outline`, matching the summary tiles) unless a ticket explicitly changes the system.

| # | Domain (summary label) | CSS variant | Accent hex (reference) | Heroicon (outline 24) | Typical case routes |
|---|-------------------------|-------------|------------------------|-------------------------|---------------------|
| 1 | Timeline entries | `ds-occ-kpi-card--blue` | `#3b82f6` | `CalendarDaysIcon` | `/case/[id]/timeline` |
| 2 | Notebook notes | `ds-occ-kpi-card--cyan` | `#06b6d4` | `BookOpenIcon` | `/case/[id]/notes` |
| 3 | Files / evidence | `ds-occ-kpi-card--green` | `#22c55e` | `FolderIcon` | `/case/[id]/files` |
| 4 | Entities | `ds-occ-kpi-card--violet` | `#8b5cf6` | `UserGroupIcon` | `/case/[id]/entities` |
| 5 | Workflow tasks | `ds-occ-kpi-card--yellow` | `#eab308` | `ClipboardDocumentListIcon` | `/case/[id]/workflow`, `/case/[id]/tasks`, `/case/[id]/case-workflow` (use the route that matches the feature) |
| 6 | Pending proposals | `ds-occ-kpi-card--rose` | `#f43f5e` | `DocumentTextIcon` | `/case/[id]/proposals` |
| 7 | Warrants / drafts | `ds-occ-kpi-card--orange` | `#ea580c` | `ShieldCheckIcon` | `/case/[id]/warrants` |

**Notes**

- **Do not** swap colors between rows (e.g. yellow vs rose) — they are chosen to stay distinguishable (workflow vs proposals vs warrants).
- The **Operator Command Center** home row (`OccSummaryKpiTiles.svelte`) is a **different** four-slot workspace summary (active cases, reviews, tasks due, alerts) using OCC solid icon components; it is **not** this seven-domain mapping.
