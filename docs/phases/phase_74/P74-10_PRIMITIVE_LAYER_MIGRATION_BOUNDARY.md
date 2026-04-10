# P74-10 — Primitive-layer migration boundary (Wave 1)

**Status:** implementation-facing (companion repo)  
**Phase:** [Phase 74](../../../../DetectiveCaseEngine/docs/phases/phase_74/PHASE_74_ROADMAP.md) — Wave 1 foundation only  
**Aligns with:** [P73-04 Migration / coexistence / cutover](../../../../DetectiveCaseEngine/docs/phases/phase_73/P73-04_MIGRATION_COEXISTENCE_CUTOVER_STRATEGY.md) (strangler / hybrid), [P73-05 waves](../../../../DetectiveCaseEngine/docs/phases/phase_73/P73-05_IMPLEMENTATION_SEQUENCING_BUILD_WAVES_PLAN.md) (Wave 1 = primitives, not product shell)

---

## 1. Purpose

Define **where** Detective Design System (DS) primitives live, **when** new UI work must use them, **when** legacy OWUI/common patterns may remain, and **how** to adopt incrementally without a second “design dialect” or a big-bang rewrite.

**Non-goals:**

- No Wave 2 shell or page implementation charter (that stays out of Phase 74).
- No mass conversion of existing routes “because DS exists.”
- No runtime feature-flag framework for primitives — adoption is **strangler-style** by **ticket** and **touch surface**.

---

## 2. Where primitives live (canonical paths)

| Concern | Location |
|--------|----------|
| **`--ds-*` tokens** | `src/lib/styles/detectiveDesignTokens.css` (+ theme roots); TS mirror: `src/lib/case/detectiveDesignTokens.ts` |
| **Class maps / `DS_*` contracts** | `src/lib/case/detectivePrimitiveFoundation.ts` |
| **Layered DS CSS** | `src/lib/styles/detective*.css` (see `DETECTIVE_DS_STYLE_IMPORT_ORDER` in `detectivePrimitiveAdoption.ts`) |
| **Global load order** | `src/app.css` — DS `@import` block must stay ordered (tokens → type → status → … → Tier L) |
| **Thin primitive wrappers** | `src/lib/components/primitives/*` (e.g. `DetectiveTooltip`, `DetectiveModal`) — optional entry points |
| **Case-integrated shells** | `src/lib/components/case/*` — may wrap primitives; domain copy stays here |
| **Shared OWUI legacy** | `src/lib/components/common/*` (e.g. `Modal`, `Drawer`) — **aligned** where Phase 74 tickets touched them; not all at once |

---

## 3. When new work must use DS primitives

- **New UI** in case workspace, chat-adjacent surfaces, or shared components **touched by an explicit ticket** should use **`DS_*` classes** from `detectivePrimitiveFoundation.ts` and token-backed CSS — **not** ad hoc Tailwind palette tokens (`bg-emerald-*`, `dark:bg-gray-850`, etc.) for the same concern.
- **New “banner / empty / error / modal / integrity”** presentation should use the **existing Phase 74 families** (`ds-*` prefixes) rather than inventing parallel class names.
- **Benchmark alignment:** follow [FRONTEND_VISUAL_FIDELITY_BENCHMARK.md](../../../../DetectiveCaseEngine/docs/frontend-redesign/FRONTEND_VISUAL_FIDELITY_BENCHMARK.md) for material deviations; document intentional exceptions in the ticket or phase notes.

---

## 4. When legacy / common may still be used

- **Untouched files** remain as-is until a ticket scopes migration — **no drive-by restyles**.
- **Upstream OWUI patterns** may coexist where Phase 74 did not replace them (e.g. some admin pages, third-party layout).
- **Full `className` overrides** on shared components (e.g. `Modal`) are allowed when required; if the DS shell should apply, include the relevant **`ds-*` panel** classes in the override (see P74-08 notes on `ds-modal-panel`).

---

## 5. Wrappers vs direct imports

- **Prefer** `import { DS_BTN_CLASSES, … } from '$lib/case/detectivePrimitiveFoundation'` for class strings.
- **Optional** `src/lib/components/primitives/Detective*.svelte` wrappers for stable import paths when a ticket introduces them; **do not** fork behavior — delegate to `case/` or `common/` implementations.
- **Avoid** duplicating the same `ds-*` strings across files when `DS_*` constants exist.

---

## 6. Strangler / rollback / coexistence

- Phase 74 is **additive**: new CSS layers and contracts ship alongside legacy styling.
- **Rollback** is “revert the PR / ticket slice” — no Case Engine schema change; no data migration for UI-only work.
- **Drift prevention:** keep a single **`DETECTIVE_PRIMITIVE_LAYER_VERSION`** in `detectivePrimitiveAdoption.ts`; bump only when the **contract** (exports or required CSS imports) intentionally changes.
- **Tests** in `detectivePrimitiveAdoption.test.ts` (and existing foundation tests) guard import order and class presence — not product behavior.

---

## 7. Drift prevention (practical)

1. **One dialect:** new presentation uses `ds-*` + `DS_*` — not parallel Tailwind-only “Detective themes.”
2. **Contract tests** assert `app.css` includes the DS stylesheet stack in the expected order.
3. **Code review:** flag new hardcoded hex in DS CSS files (existing tests already discourage `#` in layer CSS).

---

## 8. References

- [P74-01 Wave 1 scope charter](./P74-01_WAVE_1_SCOPE_CHARTER_AND_INVENTORY_MAPPING.md)
- [P73-04 Migration / coexistence](../../../../DetectiveCaseEngine/docs/phases/phase_73/P73-04_MIGRATION_COEXISTENCE_CUTOVER_STRATEGY.md)
- Companion `AGENTS.md` (repo root) — short pointer to this doc
