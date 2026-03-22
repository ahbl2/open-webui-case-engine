# Local dev: port 8080 is fixed. No auto-fallback to 8081.
# Default includes LAN UI (see repo root .env — load_dotenv also applies if vars unset in shell).
# IMPORTANT: Do not hardcode CORS_ALLOW_ORIGIN as an inline env var in shell commands that invoke
# this script or uvicorn directly. Inline vars override .env and silently narrow the allowlist.
# Symptom: polling GET succeeds (browser omits Origin on same-origin GET), polling POST returns 400
# (browser always sends Origin on POST), Engine.IO rejects → reconnect storm.
# The ${:-} form below is safe: it only sets the default when CORS_ALLOW_ORIGIN is unset in the shell.
export CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-http://localhost:5173;http://localhost:8080;http://localhost:3001;http://192.168.1.194:3001}"

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
