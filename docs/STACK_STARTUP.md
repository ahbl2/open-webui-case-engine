# Stack startup (dev)

Port layout for the Case Engine + Open WebUI dev stack:

| Service | Port | Notes |
|---------|------|-------|
| Open WebUI frontend (Vite) | 3001 | `npm run dev` from repo root |
| Open WebUI Python backend (uvicorn) | 8080 | Fixed; no auto-fallback |
| Detective Case Engine API | 3010 | Separate repo; required for case/thread features |

**All three services are required.** If Case Engine (3010) is down, the app routes to `/access-unavailable`.

## Port doctrine (fail-fast)

All Detective Stack service ports are fixed; no service may auto-fallback to another port. Ports are **fixed infrastructure**. If a required port is occupied, startup **fails immediately** with a clear error.

- **Before starting**: run `npm run check-ports` to verify 3001, 3010, 8080 are free.
- **If a port is in use**: stop the conflicting process (e.g. code-server on 8080) or reconfigure that service, then retry.
- **Backend** (`backend/dev.sh`): checks 8080 before starting; exits with a clear message if occupied.
- **Uvicorn workers**: use **one worker** for local dev unless `WEBSOCKET_MANAGER=redis` (see `backend/dev.sh` / `open_webui/env.py`). Multiple workers with the default in-memory Socket.IO break Engine.IO sessions.
- **Frontend**: Vite uses `strictPort: true` on 3001—exits instead of trying 3002.

## Clean startup order

1. Start **Case Engine** (from DetectiveCaseEngine repo):  
   `DB_PATH=... FILE_STORAGE_PATH=... npm run dev` (listens on 3010).
2. Start **Open WebUI backend**: from this repo, `backend/dev.sh` (listens on 8080).
3. Start **Open WebUI frontend**: from this repo, `npm run dev` (3001).

Frontend proxies: `/case-api` → Case Engine (3010); `/api`, `/ollama`, `/ws`, etc. → backend (port from `PUBLIC_WEBUI_BACKEND_PORT` or `WEBUI_BACKEND_PORT` in `.env`, typically 8080). Copy `.env.example` to `.env`. **Socket.IO in the browser** targets the **Vite origin (3001)** by default; Vite forwards `/ws` to the backend. See **Realtime (WebSocket)** below.

### Dev login & QA account (P20-PRE-01)

- **Browser:** sign up at `http://localhost:3001` (first user = Open WebUI admin). After login, the app resolves Case Engine auth via `POST /auth/owui/browser-resolve` (proxied to **3010**). On a **fresh** Case Engine SQLite file (`case_engine_users` empty), the first resolution creates an **active** Case Engine–linked admin profile automatically — **no manual DB edits**.
- **Recommended dev-only credentials** (documentation only; not enforced): e.g. email `dev@local.test` / password `DevLocalOnly!` for repeatable QA notes.
- **Case Engine REST users** (`cid_user`/`cid`, etc.) are for **`POST /auth/login` on 3010** and automated tests, not the OWUI password. Full table and troubleshooting: sibling repo [DetectiveCaseEngine `LOCAL_STACK_RUNBOOK.md`](../DetectiveCaseEngine/docs/operations/LOCAL_STACK_RUNBOOK.md#dev-login--seed-accounts-p20-pre-01) (adjust path if your layout differs).

**Backend CORS (local):** set `CORS_ALLOW_ORIGIN` to include `http://localhost:3001` and `http://localhost:8080` when not using `*` — see `.env.example`.

**P20-PRE-01:** If Case Engine `browser-resolve` fails with an HTTP-classified error (not pure network failure), the app redirects to **`/access-unavailable`** — the main shell does not load without a successful Case Engine linkage decision.

## Realtime (WebSocket)

The **Socket.IO server** (Engine.IO) runs on the **Open WebUI Python backend** (uvicorn, port **8080** in this stack). The HTTP path is **`/ws/socket.io`**. Canonical constant: `SOCKET_IO_SERVER_PATH` in `src/lib/socketOrigin.ts` (must match the server).

**What the browser connects to (dev, Vite on 3001):**

- **Default:** `undefined` origin in `resolveSocketIoOrigin` → the Socket.IO client uses the **same origin as the page** (e.g. `http://localhost:3001` or `http://192.168.1.194:3001`). The URL is therefore **`ws://<that-host>:3001/ws/socket.io?...`** (or `wss:` if the page is HTTPS).
- **Vite** proxies **`/ws`** (including WebSocket upgrade) to **`http://127.0.0.1:<PUBLIC_WEBUI_BACKEND_PORT>`** (see `vite.config.ts`). So the Python process can keep listening on **localhost:8080**; you do **not** need port 8080 reachable from other machines on the LAN for Socket.IO — only port **3001** (Vite) must be reachable.

**Optional override:** set **`PUBLIC_WS_URL`** to a full origin (no path) only if you deliberately bypass Vite for Socket.IO (unusual in local dev). Leave it **unset** for normal Detective stack dev.

**Separate concern — Vite proxy target:** **`PUBLIC_WEBUI_BACKEND_PORT`** (or **`WEBUI_BACKEND_PORT`**) tells **Vite** which port to forward `/api`, `/ws`, etc. to. It does **not** set the browser’s Socket.IO origin when `PUBLIC_WS_URL` is unset. Typical value: `8080`.

**Verify in the browser:** DevTools → **Network** → **WS**; you should see the socket to **`ws://<page-host>:3001/ws/socket.io`** (same host as the address bar), not to `:8080` unless you set `PUBLIC_WS_URL` to an `8080` origin. Console `[WS-DIAG] socket.io init` shows resolved `url` (`undefined (same-origin)` is correct for default dev).

**Wrong vs right:** If the page is `http://192.168.1.194:3001` but the client tried `ws://192.168.1.194:8080/...`, that was **misrouting** (backend often only listens on `127.0.0.1:8080`, so LAN clients cannot reach it). Default same-origin + Vite proxy fixes that.
