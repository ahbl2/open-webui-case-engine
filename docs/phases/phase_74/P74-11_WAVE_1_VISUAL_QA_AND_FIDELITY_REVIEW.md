# P74-11 — Wave 1 visual QA & fidelity review

**Status:** **COMPLETE** (Phase 74 companion execution artifact)  
**Companion repo:** `open-webui-case-engine`  
**Program tracking:** [PHASE_74_ROADMAP.md](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) · [PHASE_74_TASK_TRACKER.md](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_TASK_TRACKER.md)

**Source-of-truth inputs:**

- [FRONTEND_DESIGN_LANGUAGE.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_DESIGN_LANGUAGE.md)
- [FRONTEND_VISUAL_FIDELITY_BENCHMARK.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_VISUAL_FIDELITY_BENCHMARK.md) (§3 expectation, §4 deviation rules)
- [PHASE_74_ROADMAP.md §5–7](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) (success criteria, guardrails)
- [P74-01 Wave 1 charter](./P74-01_WAVE_1_SCOPE_CHARTER_AND_INVENTORY_MAPPING.md)
- [P74-10 Primitive-layer migration boundary](./P74-10_PRIMITIVE_LAYER_MIGRATION_BOUNDARY.md)
- Runtime DS layers: `src/lib/styles/detective*.css`, `src/lib/case/detectivePrimitiveFoundation.ts`, `src/app.css` import order
- **Validation surface:** `src/routes/dev/detective-tokens/+page.svelte` (`/dev/detective-tokens`, dev-only)

**Review method (current implementation state):**

1. **Code + CSS review** of Wave 1 deliverables (P74-02 … P74-10) for token naming, semantic discipline, and single dialect per role (`DS_*` / `ds-*`).
2. **Dev harness** `/dev/detective-tokens`: exercise all primitive families with **`html.dark`** toggled on (page control) — aligns with **dark-first** design language and benchmark posture for the dedicated workspace aesthetic.
3. **Benchmark imagery** in [docs/frontend-redesign/Images/](../../../../DetectiveCaseEngine/docs/frontend-redesign/Images/): **not** pixel-compared in this ticket. Wave 1 does **not** ship app/case shell chrome (Phase 74 §4); benchmark **layout density / shell / full composition** targets apply primarily to **later waves**. This review judges **primitive-layer** readiness, not full-page parity to mockups.

---

## 1. Verdict (Wave 1 primitive foundation)

**Pass for Wave 1 charter.** The DS primitive stack is **coherent**, **token-backed**, and **operationally dense** (readable hierarchy without generic SaaS whitespace inflation). It satisfies [PHASE_74_ROADMAP §5](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) for foundation work and documents **expected** **gaps** where Wave 1 scope explicitly excludes shell/pages.

**Not in scope for this pass:** production route-level visual parity, Operator Command Center layout, GNAV/sidebar composition — **Wave 2+** per roadmap.

---

## 2. Phase 74 / Wave 1 success criteria ([roadmap §5](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md))

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | P73-03 §3 Core foundational + feedback families implemented or waived | Implemented: tokens, type/status, controls, surfaces/scroll, empty/loading/skeleton, error/banner/toast, modal/drawer/confirm, Ask integrity banner; migration boundary P74-10. **No** governance waiver required. |
| 2 | No parallel dialect for same semantic roles (SIP alignment) | Single `DS_*` map in `detectivePrimitiveFoundation.ts`; legacy `common/*` remains for coexistence **outside** new DS-class paths — [P74-10](./P74-10_PRIMITIVE_LAYER_MIGRATION_BOUNDARY.md). |
| 3 | Fidelity review: alignment or justified deviations per [benchmark §4](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_VISUAL_FIDELITY_BENCHMARK.md) | This document §5–6. |
| 4 | Migration scaffolding for strangler / Wave 2 | [P74-10](./P74-10_PRIMITIVE_LAYER_MIGRATION_BOUNDARY.md), `detectivePrimitiveAdoption.ts`. |
| 5 | P74-12 closeout | **Out of scope** for P74-11 — next ticket. |

---

## 3. Design language alignment ([FRONTEND_DESIGN_LANGUAGE.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_DESIGN_LANGUAGE.md))

| Theme | Assessment |
|-------|------------|
| Tactical / intelligence-center | Dark theme tokens (`html.dark`) deliver deep canvas, restrained elevation shadows, cool chrome — consistent with “command center” tone. |
| Dark-first | **Primary** evaluation path: `html.dark` + dev toggle. `:root` light tokens exist for OWUI coexistence — **not** a design-language violation; **documented** under §6. |
| Dense but readable | Typography scale (`--ds-type-*`, `.ds-type-*`) and spacing tokens (`--ds-space-*`) support scanable, tight layouts in dev panels. |
| Single primary accent | `--ds-accent` / `--ds-interactive` used consistently; semantic status colors reserved for status surfaces (see `detectiveSemanticStatus.css`). |
| Surface hierarchy | Primary / muted / elevated panels and cards (`DS_PANEL_CLASSES`, `DS_SURFACE_CLASSES`, `DS_CARD_CLASSES`) map to DL primary vs nested panels. |
| Focus | `--ds-focus-ring` defined; modal/drawer reuse existing focus-trap engines (P74-08). |

---

## 4. Benchmark alignment ([FRONTEND_VISUAL_FIDELITY_BENCHMARK.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_VISUAL_FIDELITY_BENCHMARK.md))

| Benchmark dimension (§3) | Wave 1 assessment |
|--------------------------|-------------------|
| Layout density and composition | **Primitives** support dense composition; **full** benchmark composition (multi-column shell, rails) is **Wave 2+**, not required here. |
| Panel hierarchy | **Supported** at primitive level (primary vs muted vs card stack in dev harness). |
| Shell / chrome styling | **Explicitly out of scope** for Phase 74 Wave 1 ([PHASE_74_ROADMAP §4](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md)). **Gap is chartered**, not an unrecorded downgrade. |
| Premium polish | Shadows, borders, and type scale read as restrained “high-trust” rather than consumer fluff — aligned when `html.dark` is on. |
| Spacing / contrast | Tokenized steps; no systematic “flattening” observed in DS layers. |

---

## 5. Per-family review (P74-02 … P74-09 + P74-10)

| Family | Strengths | Drift / follow-up (not blocking Wave 1) |
|--------|-----------|----------------------------------------|
| **Tokens / theme (P74-02)** | Full light+dark surfaces; Tier L bridge via `caseWorkspaceTierL.css` preserved. | Production routes still mix Tailwind until strangler tickets touch them. |
| **Typography / status (P74-03)** | Clear role ladder (display → mono); semantic status surfaces + text classes. | — |
| **Buttons / badges / chips / tooltips (P74-04)** | Single variant set; `DetectiveTooltip` token-backed. | — |
| **Surfaces / scroll (P74-05)** | `ds-scroll-*` unlayered per P71-FU6 note; panel + section headers. | Tier L `ce-l-content-region` remains case-route contract — intentional. |
| **Empty / loading / skeleton (P74-06)** | Framed + compact patterns; skeleton shimmer structural. | — |
| **Error / banner / toast (P74-07)** | `ds-error*`, `DetectiveBanner`, `ds-toast` on `NotificationToast`; retry uses DS secondary button. | Toasts still use svelte-sonner engine — presentation only DS-aligned (as intended). |
| **Modal / drawer / confirm (P74-08)** | Shared overlay engines; destructive confirm + `severityHint`. | — |
| **Ask integrity (P74-09)** | Variants for SUPPORTED / DEGRADED / NOT_APPLICABLE; optional detail slot. | — |
| **Migration boundary (P74-10)** | Version + CSS import contract tests; `AGENTS.md` pointer. | — |

---

## 6. Documented deviations & gaps ([benchmark §4](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_VISUAL_FIDELITY_BENCHMARK.md))

| Item | Category | Notes |
|------|----------|-------|
| **Light theme `:root` block** in `detectiveDesignTokens.css` | Coexistence / architecture | OWUI fork defaults; DS provides both themes. **Benchmark “premium command-center”** evaluation assumes **dark** (`html.dark`) per design language **dark-first** posture. |
| **No automated pixel diff** vs `docs/frontend-redesign/Images/*` | Process / scope | Manual/code review + dev harness only. Full imagery diff reserved for page/shell work or explicit QA tooling in later phases. |
| **Shell / OCC / GNAV not built** | Roadmap non-goal | [PHASE_74_ROADMAP §4](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) — **not** a §4 “excuse” for primitive downgrade; primitives are input to later waves. |

**No material primitive-layer downgrade** identified that would require §4 justification beyond the table above.

---

## 7. Minimal runtime changes in P74-11

**None required** for benchmark/design-language alignment beyond documentation and cross-references. No new primitive families, no broad CSS refactors.

---

## 8. References

- Dev harness: `/dev/detective-tokens`
- Adoption rules: [P74-10](./P74-10_PRIMITIVE_LAYER_MIGRATION_BOUNDARY.md)
- Benchmark governance: [FRONTEND_VISUAL_FIDELITY_BENCHMARK.md §4](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_VISUAL_FIDELITY_BENCHMARK.md)
