# Local dev: port 8080 is fixed. No auto-fallback to 8081.
# Default includes LAN UI (see repo root .env — load_dotenv also applies if vars unset in shell).
export CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-http://localhost:5173;http://localhost:8080;http://localhost:3001;http://192.168.1.194:3001}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
node "$ROOT_DIR/scripts/check-ports.js" 8080 || exit 1

exec "${VENV_PYTHON}" -m uvicorn open_webui.main:app --port 8080 --host 0.0.0.0 --forwarded-allow-ips '*' --reload
