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
- **Frontend**: Vite uses `strictPort: true` on 3001—exits instead of trying 3002.

## Clean startup order

1. Start **Case Engine** (from DetectiveCaseEngine repo):  
   `DB_PATH=... FILE_STORAGE_PATH=... npm run dev` (listens on 3010).
2. Start **Open WebUI backend**: from this repo, `backend/dev.sh` (listens on 8080).
3. Start **Open WebUI frontend**: from this repo, `npm run dev` (3001).

Frontend proxies: `/case-api` → Case Engine (3010); `/api`, `/ollama`, `/ws`, etc. → backend (8080). Set `PUBLIC_WEBUI_BACKEND_PORT=8080` in `.env` (or leave unset for default). On startup, the frontend logs its effective proxy targets.

## Realtime (WebSocket)

Socket.IO uses **`path: '/ws/socket.io'`** on the **Open WebUI Python backend** (port **8080**), not on the Vite dev server (3001).

**Client target (resolution order):**

1. **`PUBLIC_WS_URL`** — explicit origin only (no path), e.g. `http://192.168.1.194:8080` for LAN dev when needed.
2. **Dev fallback** — `http://<page-hostname>:<PUBLIC_WEBUI_BACKEND_PORT>` (port defaults to **8080**). So opening the UI at `http://192.168.1.194:3001` connects Socket.IO to `http://192.168.1.194:8080` without relying on the `/ws` Vite proxy.
3. **Production** — same origin as the app (single host); leave `PUBLIC_WS_URL` unset.

The Vite proxy still forwards `/ws` to the backend for other uses; the Socket.IO client no longer depends on same-origin `3001` for the engine URL in dev.
