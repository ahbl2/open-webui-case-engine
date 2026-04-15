#!/usr/bin/env bash
# Print how to run Case Engine, Python, and Vite with HTTPS (TLS on each listener).
# Certs: ./scripts/dev-tls-mkcert.sh  (requires mkcert -install once)

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DEV_HTTPS_KEY_FILE="${DEV_HTTPS_KEY_FILE:-$ROOT/certs/mkcert-dev-key.pem}"
export DEV_HTTPS_CERT_FILE="${DEV_HTTPS_CERT_FILE:-$ROOT/certs/mkcert-dev-cert.pem}"

if [[ ! -f "$DEV_HTTPS_KEY_FILE" || ! -f "$DEV_HTTPS_CERT_FILE" ]]; then
	echo "Missing TLS files. Generate with:" >&2
	echo "  cd $ROOT && ./scripts/dev-tls-mkcert.sh [optional-LAN-IP]" >&2
	exit 1
fi

cat <<EOF
# Full HTTPS stack — orchestration only (three processes). Case Engine is started FROM ITS OWN REPO.

# Terminal A — Case Engine (3010, HTTPS) — DetectiveCaseEngine checkout (paths below are absolute):
cd <YOUR_DETECTIVE_CASE_ENGINE_CLONE>
export CASE_ENGINE_TLS_KEY_FILE=$DEV_HTTPS_KEY_FILE
export CASE_ENGINE_TLS_CERT_FILE=$DEV_HTTPS_CERT_FILE
# or: export DEV_HTTPS_KEY_FILE / DEV_HTTPS_CERT_FILE to the same paths
npm run dev:https

# Terminal B — Open WebUI Python (8080, HTTPS)
cd $ROOT
export DEV_HTTPS_KEY_FILE=$DEV_HTTPS_KEY_FILE
export DEV_HTTPS_CERT_FILE=$DEV_HTTPS_CERT_FILE
./backend/dev-https.sh

# Terminal C — Vite (3001, HTTPS) — proxies to https://127.0.0.1:3010 and :8080 when flags set
cd $ROOT
source scripts/export-dev-tls-env.sh
npm run dev:https

# Browser: https://localhost:3001
# Ollama (11434) stays HTTP unless you configure it separately.
EOF
