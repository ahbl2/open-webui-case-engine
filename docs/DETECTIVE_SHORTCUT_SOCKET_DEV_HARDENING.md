# Detective stack: keyboard shortcut safety + Socket.IO dev guardrails

**Status:** Implemented  
**Repos:** `open-webui-case-engine`  
**Related:** [STACK_STARTUP.md](./STACK_STARTUP.md) (Socket.IO / `PUBLIC_WS_URL`). **Case Engine** (sibling repo *DetectiveCaseEngine*): `docs/operations/DEV_PERSISTENT_DATA_PATHS.md` — persistent local SQLite paths; separate from this UI change.

---

## 1. Summary

Two production-facing hardening changes for long-term maintainability:

1. **Global keyboard shortcuts** — prevent uncaught exceptions on every `keydown` when shortcut definitions are malformed or contain non-string / empty entries.
2. **Socket.IO in dev** — detect a common misconfiguration (`PUBLIC_WS_URL` pointing at the wrong origin vs the Vite page) and emit a **one-time** console warning with fix guidance.

---

## 2. Keyboard shortcuts (`isShortcutMatch`)

### Problem

`(app)/+layout.svelte` registered a document-level `keydown` handler that called `isShortcutMatch`. The helper did `keys.map((k) => k.toLowerCase())` without validating each `k`. Any **`undefined`**, **hole in a sparse array**, or **non-string** in `shortcut.keys` caused:

`TypeError: Cannot read properties of undefined (reading 'toLowerCase')`

That broke the handler for **all** subsequent shortcut logic and polluted the console during normal typing.

### Solution

- **Extract** matching logic to **`src/lib/utils/isShortcutMatch.ts`** with a small public API:
  - Require `Array.isArray(shortcut.keys)`.
  - **Filter** to non-empty **strings** only before `.toLowerCase()`.
  - Use **`(event.key ?? '').toLowerCase()`** for the pressed key.
- **Import** the helper from **`src/routes/(app)/+layout.svelte`** (no inline duplicate).
- **Tests:** **`src/lib/utils/isShortcutMatch.test.ts`** (Vitest), included in **`npm run test:p20-pre`**.

### Files

| File | Role |
|------|------|
| `src/lib/utils/isShortcutMatch.ts` | Pure matcher; safe on bad input |
| `src/lib/utils/isShortcutMatch.test.ts` | Regression tests |
| `src/routes/(app)/+layout.svelte` | Uses imported `isShortcutMatch` |
| `package.json` | `test:p20-pre` includes `isShortcutMatch.test.ts` |

---

## 3. Socket.IO dev warning (`PUBLIC_WS_URL` mismatch)

### Problem

In the standard Detective dev stack, the browser should use **same origin as the Vite page** (e.g. `https://192.168.x.x:3001`) so **Vite proxies `/ws`** to Python on **127.0.0.1:8080**. Setting **`PUBLIC_WS_URL`** to a **different port** (e.g. `3000`) or to the **backend port (`8080`)** breaks Engine.IO (CORS, 400 on POST, or unreachable host). This is easy to misconfigure in `.env` and hard to diagnose.

### Solution

In **`src/lib/socket.ts`**, before the first `io()`:

- Only when **`import.meta.env.DEV`** and **`getSocketIoOrigin()`** returns a non-empty explicit origin:
  - Compare **protocol**, **hostname**, and **effective port** (treating default 80/443 when `URL.port` is empty) to **`window.location`**.
  - If they differ, **`console.warn` once** with actionable text: prefer **unsetting** `PUBLIC_WS_URL`, or set it to the **exact browser origin**; do **not** point at **8080** in the default stack.

Invalid `PUBLIC_WS_URL` values also trigger a one-time parse warning.

### Files

| File | Role |
|------|------|
| `src/lib/socket.ts` | `warnDevIfPublicWsUrlMismatchesPage()` before `io()` |

---

## 4. Configuration documentation

| File | Change |
|------|--------|
| `.env.example` | Expanded **Browser Socket.IO** section: long-term default = **unset** `PUBLIC_WS_URL`; never use backend `:8080` for standard dev; example LAN origin only if override is required |
| `docs/STACK_STARTUP.md` | Note dev **`[socket] PUBLIC_WS_URL does not match`** warning and pointer to `src/lib/socket.ts` |

---

## 5. Validation

```bash
npm run test:p20-pre
```

Confirms **`isShortcutMatch`** tests run with the P20-pre regression bundle.

Manual dev check:

1. Open app on Vite origin; with **wrong** `PUBLIC_WS_URL`, confirm **one** console warning on first socket connect.
2. Type in the app; no **`toLowerCase`** errors from `(app)/+layout` shortcuts.

---

## 6. Git history (reference)

Look for commits on `main` with messages mentioning **shortcut**, **`isShortcutMatch`**, **socket**, **`PUBLIC_WS_URL`**, and **long-term maintainability** (e.g. `refactor(ux): harden shortcuts + socket dev config…`).
