#!/usr/bin/env bash
# Dev-only: uvicorn with TLS (--ssl-keyfile / --ssl-certfile). Requires DEV_HTTPS_KEY_FILE and
# DEV_HTTPS_CERT_FILE in the environment (set manually or via ../scripts/export-dev-tls-env.sh).

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_PYTHON="${ROOT_DIR}/.venv/bin/python"
node "$ROOT_DIR/scripts/check-ports.js" 8080 || exit 1

KEY="${DEV_HTTPS_KEY_FILE:-}"
CERT="${DEV_HTTPS_CERT_FILE:-}"
if [[ -z "$KEY" || -z "$CERT" || ! -f "$KEY" || ! -f "$CERT" ]]; then
	echo "dev-https.sh: set DEV_HTTPS_KEY_FILE and DEV_HTTPS_CERT_FILE to existing PEM files." >&2
	echo "  source scripts/export-dev-tls-env.sh" >&2
	exit 1
fi

export CE_DB_PATH="${CE_DB_PATH:-/tmp/case-engine/data/case.db}"

exec "${VENV_PYTHON}" -m uvicorn open_webui.main:app --port 8080 --host 0.0.0.0 \
	--forwarded-allow-ips '*' --reload \
	--ssl-keyfile "$KEY" --ssl-certfile "$CERT"
