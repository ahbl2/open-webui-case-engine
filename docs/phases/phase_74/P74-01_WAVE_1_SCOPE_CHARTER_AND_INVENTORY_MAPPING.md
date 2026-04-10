# P74-01 — Wave 1 Scope Charter + P73-03 Inventory Mapping

**Status:** **COMPLETE** (Phase 74 companion execution artifact)  
**Companion repo:** `open-webui-case-engine` (this file)  
**Program tracking:** [PHASE_74_ROADMAP.md](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) · [PHASE_74_TASK_TRACKER.md](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_TASK_TRACKER.md) (DetectiveCaseEngine)

**Source-of-truth inputs (read-only):**

- [PHASE_74_ROADMAP.md](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) — Wave 1 scope / non-goals / ticket ladder  
- [PHASE_74_TASK_TRACKER.md](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_TASK_TRACKER.md)  
- [P73-03_SHARED_COMPONENT_PRIMITIVE_INVENTORY_PLAN.md](../../../../DetectiveCaseEngine/docs/phases/phase_73/P73-03_SHARED_COMPONENT_PRIMITIVE_INVENTORY_PLAN.md) — §3 inventory taxonomy (unchanged)  
- [P73-02_FRONTEND_TECHNICAL_ARCHITECTURE_BOUNDARY_PLAN.md](../../../../DetectiveCaseEngine/docs/phases/phase_73/P73-02_FRONTEND_TECHNICAL_ARCHITECTURE_BOUNDARY_PLAN.md) — layering (shared primitive layer below shell/pages)  
- [FRONTEND_VISUAL_FIDELITY_BENCHMARK.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_VISUAL_FIDELITY_BENCHMARK.md) — acceptance posture for visual work (P74-11)

**Guardrails (this ticket):** Documentation and mapping only. No Wave 2 shell/page work. No redesign of P73-03 taxonomy. No token/theme/component implementation beyond what P74-02+ tickets charter (minimal scaffold placeholders only if a later ticket explicitly adds them).

---

## 1. Wave 1 implementation charter

### 1.1 Objective

Establish a **concrete runtime baseline** in this repo for **Phase 74 Wave 1** — **foundation primitives and feedback patterns** per [P73-05 Wave 1](../../../../DetectiveCaseEngine/docs/phases/phase_73/P73-05_IMPLEMENTATION_SEQUENCING_BUILD_WAVES_PLAN.md) and [PHASE_74_ROADMAP.md §3](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) — so later tickets (P74-02 … P74-12) have **agreed target locations**, **reuse posture**, and **no parallel dialect** for the same semantic roles.

### 1.2 Target primitive / component families (Wave 1)

Aligned to [PHASE_74_ROADMAP §3–6](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) and P73-03 **Core** rows in **foundational**, **layout** (subset), and **feedback / status** categories:

| Family | Phase 74 ticket anchor | Notes |
|--------|------------------------|--------|
| Design tokens / theme / dark-first alignment | **P74-02** | Formalize and align `--ce-l-*` and global theme with [FRONTEND_DESIGN_LANGUAGE.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_DESIGN_LANGUAGE.md) + benchmark |
| Typography roles + semantic status color application | **P74-03** | Map to P73-03: Semantic status presentation + Typography roles |
| Buttons, badges, chips, tooltip triggers | **P74-04** | Foundational controls; single variant system |
| Panel / surface / card shell + bounded scroll | **P74-05** | Primary/secondary surfaces; bounded content region — **not** app/case shell (Wave 2–3) |
| Empty / loading / skeleton | **P74-06** | RBAC-aware hooks per [UI_RBAC_AND_VISIBILITY_GUIDELINES.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/UI_RBAC_AND_VISIBILITY_GUIDELINES.md) |
| Error / banner / retry + toast / non-blocking notice | **P74-07** | Align with [SHARED_INTERACTION_PATTERNS.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/SHARED_INTERACTION_PATTERNS.md) |
| Modal shell + drawer/sheet + destructive confirm | **P74-08** | Primitives + patterns; not production page rewires except smoke |
| Ask integrity / degraded-mode banner (Phase 33 contract) | **P74-09** | Evolve existing Case Engine Ask UI toward inventory + benchmark |
| Primitive-layer migration scaffolding (flags / module boundary) | **P74-10** | Per [P73-04](../../../../DetectiveCaseEngine/docs/phases/phase_73/P73-04_MIGRATION_COEXISTENCE_CUTOVER_STRATEGY.md) Hybrid D |
| Wave 1 visual QA + benchmark fidelity review | **P74-11** | Evidence vs [FRONTEND_VISUAL_FIDELITY_BENCHMARK.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_VISUAL_FIDELITY_BENCHMARK.md) |
| Phase closeout | **P74-12** | [PHASE_74_COMPLETION.md](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_COMPLETION.md) (when chartered) |

### 1.3 Planned source directories / organization

**Existing (keep as anchors):**

| Path | Role |
|------|------|
| `src/app.css` | Global imports; currently imports `src/lib/styles/caseWorkspaceTierL.css` |
| `src/lib/styles/caseWorkspaceTierL.css` | Tier L Case Workspace CSS variables (`--ce-l-*`); P70/P71 lineage; **P74-02** extends/aligns |
| `src/lib/case/caseWorkspaceTierL.ts` | Exported `CE_L_VARS` list; contract test ensures CSS parity |
| `src/lib/components/common/` | Upstream Open WebUI shared widgets (Modal, Drawer, Tooltip, Badge, Spinner, …) — **legacy + reuse**; **not** automatically the final “Detective primitive” API |
| `src/lib/components/case/` | Case Engine integration UI; several patterns **foreshadow** inventory rows but are **feature-colored** |

**Recommended for Wave 1 runtime build (P74-02+ — implementation tickets, not this charter):**

| Path | Role |
|------|------|
| `src/lib/components/primitives/` **(new)** | **Canonical home** for Detective-aligned primitive APIs that **must not** fork semantics with ad hoc copies. Subfolders optional: `feedback/`, `layout/`, `controls/` — **exact structure left to P74-02/P74-10** to avoid premature scaffolding. |
| `src/lib/styles/` | Token layers, imports, and any `primitive-` or `ds-` prefixed files as needed **under P74-02** |

**Strangler rule:** New primitives **compose** or **wrap** `common/` where sensible; **replace** usage gradually per route/feature in later phases — **P74-10** documents flags/boundaries. **Do not** bulk-move upstream `common/` in Wave 1.

### 1.4 Explicit Wave 1 boundary (non-goals)

Per [PHASE_74_ROADMAP §4](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md):

- **No** app shell layout frame, **no** full GNAV/OCC productization as Wave 1 deliverables.  
- **No** case workspace shell (identity strip, case tab strip as production shell).  
- **No** domain composites (timeline feed card, files grid, proposals review queue) as Wave 1 **new** work — except **reusing** existing case tab code as-is until later waves.  
- **No** Case Engine backend/schema/API changes.

---

## 2. Existing companion repo UI / primitive audit

**Method:** Inventory of `src/lib/components/common/`, `src/lib/components/case/`, global styles, and cross-cutting usage. **Posture** is **Wave 1–relevant** only; upstream OWUI components are **not** deprecated en masse.

| Item / area | Location(s) | Posture | Notes |
|-------------|-------------|---------|--------|
| Tier L CSS variables (`--ce-l-*`) | `src/lib/styles/caseWorkspaceTierL.css`, `src/lib/case/caseWorkspaceTierL.ts` | **Extend / refactor** | Foundation for tokens; P74-02 aligns naming and coverage with design language + dark-first |
| Global app styling | `src/app.css`, Tailwind config (repo root) | **Extend** | P74-02 coordinates with token layer |
| **Modal** | `common/Modal.svelte` | **Reuse / wrap** | Focus trap, sizes; OWUI visual dialect (`bg-white/95 dark:…`). P74-08 may wrap or add Detective variant **without** a second focus/keyboard contract |
| **Drawer** | `common/Drawer.svelte` | **Reuse / wrap** | Same as modal |
| **Confirm** | `common/ConfirmDialog.svelte` | **Extend / wrap** | i18n-coupled; P74-08 aligns destructive copy pattern with SIP |
| **Tooltip** | `common/Tooltip.svelte` | **Reuse / extend** | Dense chrome affordance |
| **Badge** | `common/Badge.svelte` | **Reuse / extend** | P74-04 unifies with chips/tags per design language |
| **Spinner / Loader** | `common/Spinner.svelte`, `common/Loader.svelte` | **Reuse / extend** | `CaseLoadingState` already uses Spinner + `--ce-l-loading-fg` |
| **Banner** (generic) | `common/Banner.svelte` | **Reuse / extend** | P74-07 / P74-09 may specialize for error vs integrity |
| **Tags / Tag*** | `common/Tags/*` | **Reuse / extend** | Overlaps P73-03 chip/tag row |
| **Pagination** | `common/Pagination.svelte` | **Ignore for Wave 1** | Wave 4+ data-display focus |
| **Sidebar** (generic) | `common/Sidebar.svelte` | **Ignore for Wave 1** | Wave 2 GNAV shell |
| **Case empty state** | `case/CaseEmptyState.svelte` | **Extend / refactor** | Strong candidate to **back** new empty primitive or move shared shell to `primitives/` in P74-06 |
| **Case error state** | `case/CaseErrorState.svelte` | **Extend / refactor** | Retry + honest errors; P74-07 |
| **Case loading** | `case/CaseLoadingState.svelte` | **Extend** | Thin wrapper — align with skeleton policy in P74-06 |
| **Bounded content region** | `case/CaseWorkspaceContentRegion.svelte` | **Reuse / extend** | Already encodes P70/P71 scroll discipline; P73-02 “bounded scroll” — keep as layout primitive or alias under `primitives/layout` in P74-05 |
| **Ask integrity banner** | `case/CaseEngineAskIntegrityBanner.svelte` | **Extend** | P74-09 aligns with inventory + Phase 33 |
| **Ask structured sections** | `case/CaseEngineAskStructuredSections.svelte` | **Reuse / extend** | Presentation of facts/inferences |
| **Toast / notifications** | `svelte-sonner` (`Toaster` in `routes/+layout.svelte`), `NotificationToast.svelte` | **Reuse / wrap** | P74-07: single non-blocking notice family; avoid parallel toast systems |
| **Feature-heavy case components** | Timeline cards, files tab, proposals, notes, etc. | **Ignore for Wave 1 primitive build** | **Later waves**; may **consume** new primitives when migrated |

---

## 3. P73-03 §3 inventory → Wave 1 runtime mapping

**Legend:** **W1** = in scope Phase 74 Wave 1 (per roadmap) · **Later** = Wave 2+ or post–Wave 1 phase · **Satisfied (partial)** = existing implementation acceptable as interim; still subject to P74-02–P74-11 alignment · **N/A** = out of product scope for this mapping row

| P73-03 §3 row (name) | Wave 1 | Runtime target / disposition |
|---------------------|--------|------------------------------|
| Semantic status presentation | **W1** | P74-03; tokens + components |
| Typography roles | **W1** | P74-03 |
| Button variants | **W1** | P74-04 |
| Chip / tag / compact filter | **W1** | P74-04 (align with `Tags` / new primitive) |
| Count / status badge | **W1** | P74-04 |
| Tooltip / icon label affordance | **W1** | P74-04 |
| App shell layout frame | **Later** | Phase 74 **non-goal**; P73-05 Wave 2 |
| Top utility bar cluster | **Later** | Wave 2 |
| Primary / secondary panel | **W1** | P74-05 |
| Bounded scroll / content region | **W1** | P74-05; **Satisfied (partial):** `CaseWorkspaceContentRegion` |
| Case identity strip | **Later** | Wave 3 |
| Case primary tab strip | **Later** | Wave 3 |
| App sidebar nav item | **Later** | Wave 2 |
| Page local toolbar | **Later** | Page composites; primitives feed it in W1 |
| Breadcrumb band | **Later** | Secondary per P73-03 |
| Command palette shell | **Later** | Secondary / Wave 7 |
| Global search results panel | **Later** | Wave 7 |
| Master/detail split layout | **Later** | Wave 4+ (uses W1 surfaces) |
| Right rail / secondary panel (collapsible) | **Later** | Secondary |
| Dense operational table | **Later** | Wave 4+ |
| Table toolbar | **Later** | Wave 4+ |
| Row actions | **Later** | Wave 4+ |
| Row selection | **Later** | Wave 4+ |
| Pagination | **Later** | Wave 4+ |
| Load more / infinite | **Later** | Secondary |
| Feed / timeline entry card | **Later** | Wave 4+ |
| Date / group header | **Later** | Secondary |
| Compare / diff layout | **Later** | Wave 5 |
| Review action bar | **Later** | Wave 5 |
| Provenance band | **Later** | Wave 5 |
| Modal shell | **W1** | P74-08; **Satisfied (partial):** `common/Modal` |
| Drawer / sheet shell | **W1** | P74-08; **Satisfied (partial):** `common/Drawer` |
| Destructive confirmation dialog | **W1** | P74-08; **Satisfied (partial):** `ConfirmDialog` |
| Toast / non-blocking notice | **W1** | P74-07; **Satisfied (partial):** sonner + `NotificationToast` |
| Inline / banner error (+ retry) | **W1** | P74-07; **Satisfied (partial):** `CaseErrorState` / `Banner` |
| Empty state | **W1** | P74-06; **Satisfied (partial):** `CaseEmptyState` |
| Loading state (skeleton / spinner) | **W1** | P74-06; **Satisfied (partial):** `CaseLoadingState` + Spinner |
| Integrity / degraded-mode banner | **W1** | P74-09; **Satisfied (partial):** `CaseEngineAskIntegrityBanner` |
| Form section / field group | **Later** | Wave 5 Notes / forms |
| Autosave / save status | **Later** | Secondary |
| Unsaved navigation guard | **Later** | Secondary |
| Bulk action bar | **Later** | Wave 4–6 |
| File row + preview, Entity card, Workflow lane, Activity row, AI workspace chrome, Notes editor shell, OCC tile, Case overview module | **Later** | Domain composites — **not** Wave 1 new build |

---

## 4. Structural / migration notes (for P74-02+)

1. **Two stylistic layers:** Upstream OWUI `common/` components often use **Tailwind + `dark:`** directly; Case Workspace Tier L uses **`--ce-l-*`** in **parallel**. Wave 1 **must** converge on **one token-driven presentation** for new Detective primitives (P74-02) while **not** breaking unrelated OWUI surfaces in one PR — **P74-10** owns the strangler story.  
2. **`CE_L_VARS` contract test:** Any new Tier L variable must stay in sync with `caseWorkspaceTierL.css` (`src/lib/case/caseWorkspaceTierL.test.ts`). P74-02 should extend this list deliberately.  
3. **Naming:** Prefix **`ce-l-`** is established for case workspace tier; P74-02 may introduce **`ds-`** or **`det-`** token names **only** if documented in the same ticket — avoid ad hoc third naming family.  
4. **Case components vs primitives:** `CaseEmptyState` / `CaseErrorState` are **good behavioral shells** but live under **`case/`**. P74-06/P74-07 may extract **presentational** subcomponents into `primitives/` while keeping Case Engine–specific copy/wiring in `case/`.  
5. **No bulk rename** of upstream Open WebUI files in Wave 1 — high merge conflict cost; **wrap** or **re-export** from `primitives/` instead.  
6. **Testing:** Vitest contract tests already guard CSS variable lists and some scroll contracts; P74-11 should extend coverage for new primitive exports where fragile.

---

## 5. Guardrail compliance (P74-01)

| Guardrail | Status |
|-----------|--------|
| No primitive styling/components implementation beyond minimal placeholders | **Met** — this artifact is documentation only. |
| No drift into P74-02+ token/theme/component work | **Met** — targets deferred to P74-02 …. |
| No redesign of P73-03 inventory taxonomy | **Met** — table in §3 preserves P73-03 row names and ordering intent. |
| No Wave 2 shell/page work | **Met** — §1.4 and §3 mark shell/navigation rows **Later**. |
| Alignment with P74 roadmap + P73-02 layering | **Met** — §1.2–1.3 reference roadmap tickets and primitive layer below shell. |

---

## 6. Risks / cleanup concerns

| Risk | Mitigation |
|------|------------|
| **Parallel modal/empty/button dialects** if new code bypasses `primitives/` | Code review + P74-10 boundary; prefer imports from `primitives/` for new case surfaces |
| **Merge pain** with upstream OWUI if `common/` is edited heavily | Prefer wrappers in `primitives/`; contribute minimal diffs upstream only when necessary |
| **Token drift** between `--ce-l-*` and Tailwind `dark:` | P74-02 centralizes; document in benchmark review (P74-11) |
| **Ask integrity UI** split between chat and intelligence surfaces | P74-09 ensures one banner primitive contract across surfaces |
| **Toast duplication** if teams add alternate notification APIs | P74-07: standardize on sonner + shared wrapper |

---

**Document control**

| Item | Value |
|------|--------|
| **Type** | Phase 74 Wave 1 — implementation charter + inventory mapping |
| **Supersedes** | — |
| **Review trigger** | Major change to P73-03, P74 roadmap, or repo layout governance |
