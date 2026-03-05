# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Open WebUI (v0.8.8) — self-hosted AI chat platform with a SvelteKit frontend and FastAPI backend. See `README.md` for full feature list.

### Architecture

- **Frontend**: SvelteKit 5 + TailwindCSS 4 + Vite 5 (dev server on port 5173)
- **Backend**: FastAPI + Uvicorn (dev server on port 8080)
- **Database**: SQLite (embedded, zero-config default at `backend/data/webui.db`)
- **Vector DB**: ChromaDB (embedded, zero-config default)

No external services (PostgreSQL, Redis, Ollama) are required for basic development.

### Running the Dev Servers

**Backend** (from repo root):
```bash
cd backend && CORS_ALLOW_ORIGIN="http://localhost:5173;http://localhost:8080" uv run uvicorn open_webui.main:app --port 8080 --host 0.0.0.0 --forwarded-allow-ips '*' --reload
```

**Frontend** (from repo root):
```bash
npm run dev
```

The frontend's `npm run dev` first fetches pyodide packages (`npm run pyodide:fetch`) before starting Vite. This can take ~30 seconds on first run.

### Lint / Test / Build

- **Lint frontend**: `npm run lint:frontend` (ESLint, has many pre-existing errors)
- **Type check**: `npm run lint:types` (svelte-check, has many pre-existing errors)
- **Frontend tests**: `npm run test:frontend` (vitest, currently zero test files)
- **Backend tests**: `uv run pytest backend/open_webui/test/` — integration tests require Docker + PostgreSQL; unit tests (e.g., `test_redis.py`) can run standalone
- **Build frontend**: `npm run build`

### Key Gotchas

- `npm install` requires `--legacy-peer-deps` due to mixed tiptap v2/v3 peer dependency conflicts.
- `uv` is used for Python dependency management (not pip directly). The venv is at `.venv/`.
- The backend `dev.sh` script is a thin wrapper around uvicorn; running uvicorn directly via `uv run` works equivalently.
- First admin account created on a fresh database automatically gets the `admin` role.
- Backend tests importing `AbstractPostgresTest` require Docker-managed PostgreSQL and won't run without Docker.
- The `test_redis.py` test has a pre-existing import error (`MAX_RETRY_COUNT` not exported).
