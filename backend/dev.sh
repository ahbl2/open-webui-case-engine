# Local dev: port 8080 is fixed. No auto-fallback to 8081.
#
# Do NOT `export CORS_ALLOW_ORIGIN` here: Python loads repo root `.env` via load_dotenv(), which does
# not override variables already set in the environment. Exporting a default here would ignore `.env`
# and cause LAN Engine.IO POST 400 (Origin not allowed) when `.env` lists your LAN IP but this script
# does not. Set `CORS_ALLOW_ORIGIN` in the repo root `.env` (see `.env.example`).
#
# Do not pass CORS_ALLOW_ORIGIN inline on the shell command either — same override problem (AGENTS.md).

# P27-21: CE_DB_PATH exposes the Case Engine SQLite database for password-reset hierarchy checks.
# Must match DB_PATH used by the Detective Case Engine Node.js service.
# If unset, password-reset hierarchy enforcement is skipped (fail-open) — set this in production.
export CE_DB_PATH="${CE_DB_PATH:-/tmp/case-engine/data/case.db}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
node "$ROOT_DIR/scripts/check-ports.js" 8080 || exit 1

# IMPORTANT:
# Socket.IO (Engine.IO) requires sticky sessions.
# Multiple workers without a shared session store will cause:
# - 400 "Bad Request" on polling POST
# - reconnect loops
# Use a single worker for dev. (--reload runs one process; do not add --workers >1 here.)
exec "${VENV_PYTHON}" -m uvicorn open_webui.main:app --port 8080 --host 0.0.0.0 --forwarded-allow-ips '*' --reload
