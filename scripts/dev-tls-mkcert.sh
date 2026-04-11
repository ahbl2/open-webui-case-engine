#!/usr/bin/env bash
# Trusted local HTTPS for Vite dev (mkcert local CA — browsers trust after `mkcert -install`).
#
# Use this when you want https://localhost:3001 (and optional LAN) WITHOUT ERR_CERT_AUTHORITY_INVALID.
# Self-signed certs from ./scripts/dev-tls-cert.sh always trigger a warning unless you manually trust each cert.
#
# Prerequisites: https://github.com/FiloSottile/mkcert
#
# Usage:
#   ./scripts/dev-tls-mkcert.sh
#   ./scripts/dev-tls-mkcert.sh 192.168.1.193
#
# Then set DEV_HTTPS_KEY_FILE / DEV_HTTPS_CERT_FILE in .env to the printed paths and restart:
#   npm run dev -- --host 0.0.0.0

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="$ROOT/certs"
mkdir -p "$OUT"

KEY="$OUT/mkcert-dev-key.pem"
CERT="$OUT/mkcert-dev-cert.pem"

if ! command -v mkcert >/dev/null 2>&1; then
	echo "mkcert not found. Install: https://github.com/FiloSottile/mkcert#installation" >&2
	echo "Fallback (untrusted CA warning): ./scripts/dev-tls-cert.sh [LAN-IP]" >&2
	exit 1
fi

# Before first use (once per machine), install mkcert's local CA so browsers trust leaf certs:
#   mkcert -install
# (May prompt for sudo on Linux.) Do not commit CA files; they live under ~/.local/share/mkcert/.

NAMES=(localhost 127.0.0.1 ::1)
for arg in "$@"; do
	if [[ -n "${arg// }" ]]; then
		NAMES+=("$arg")
	fi
done

mkcert -key-file "$KEY" -cert-file "$CERT" "${NAMES[@]}"

chmod 600 "$KEY"
echo "Wrote (trusted while mkcert CA is installed):"
echo "  $KEY"
echo "  $CERT"
echo ""
echo "Add to open-webui-case-engine .env (absolute paths):"
echo "  DEV_HTTPS_KEY_FILE=$KEY"
echo "  DEV_HTTPS_CERT_FILE=$CERT"
echo ""
echo "Restart: npm run dev -- --host 0.0.0.0"
echo "Open:    https://localhost:3001"
echo ""
echo "If CORS_ALLOW_ORIGIN is a fixed list, add each https://<host>:3001 you use."
