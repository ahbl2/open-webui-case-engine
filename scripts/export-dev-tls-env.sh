#!/usr/bin/env bash
# Open WebUI repo only: sets PEM paths + Vite proxy flags (CASE_ENGINE_HTTPS, OWUI_BACKEND_HTTPS).
# Does not start Case Engine; DetectiveCaseEngine uses its own env (see that repo's LOCAL_HTTPS_DEV.md).
#
# Usage (bash/Git Bash/WSL): ./scripts/dev-tls-mkcert.sh && source ./scripts/export-dev-tls-env.sh
#
# Custom PEM paths:
#   export DEV_HTTPS_KEY_FILE=/abs/path/key.pem
#   export DEV_HTTPS_CERT_FILE=/abs/path/cert.pem
#   source ./scripts/export-dev-tls-env.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_KEY="$ROOT/certs/mkcert-dev-key.pem"
DEFAULT_CERT="$ROOT/certs/mkcert-dev-cert.pem"

if [[ -z "${DEV_HTTPS_KEY_FILE:-}" || -z "${DEV_HTTPS_CERT_FILE:-}" ]]; then
	if [[ -f "$DEFAULT_KEY" && -f "$DEFAULT_CERT" ]]; then
		export DEV_HTTPS_KEY_FILE="$DEFAULT_KEY"
		export DEV_HTTPS_CERT_FILE="$DEFAULT_CERT"
	else
		echo "export-dev-tls-env: no DEV_HTTPS_KEY_FILE/DEV_HTTPS_CERT_FILE and no $DEFAULT_KEY" >&2
		echo "Run: ./scripts/dev-tls-mkcert.sh (or dev-tls-cert.sh) first." >&2
		return 1 2>/dev/null || exit 1
	fi
fi

export CASE_ENGINE_HTTPS="${CASE_ENGINE_HTTPS:-1}"
export OWUI_BACKEND_HTTPS="${OWUI_BACKEND_HTTPS:-1}"

echo "export-dev-tls-env: TLS files + proxy flags for full HTTPS stack"
echo "  DEV_HTTPS_KEY_FILE=$DEV_HTTPS_KEY_FILE"
echo "  DEV_HTTPS_CERT_FILE=$DEV_HTTPS_CERT_FILE"
echo "  CASE_ENGINE_HTTPS=$CASE_ENGINE_HTTPS  (Vite → Case Engine proxy)"
echo "  OWUI_BACKEND_HTTPS=$OWUI_BACKEND_HTTPS  (Vite → Python proxy)"
