#!/usr/bin/env bash
# Generate a self-signed TLS cert for local / LAN Vite HTTPS dev.
# Usage:
#   ./scripts/dev-tls-cert.sh
#   ./scripts/dev-tls-cert.sh 192.168.1.193
# Then set in .env (repo root):
#   DEV_HTTPS_KEY_FILE=<repo>/certs/dev-key.pem
#   DEV_HTTPS_CERT_FILE=<repo>/certs/dev-cert.pem
# Restart: npm run dev -- --host 0.0.0.0
# Open: https://localhost:3001  (trust the cert in your browser / OS once)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="$ROOT/certs"
mkdir -p "$OUT"

KEY="$OUT/dev-key.pem"
CERT="$OUT/dev-cert.pem"

SAN="DNS:localhost,IP:127.0.0.1"
for arg in "$@"; do
	if [[ -n "${arg// }" ]]; then
		SAN+=",IP:${arg}"
	fi
done

if openssl req -help 2>&1 | grep -q -- '-addext'; then
	openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
		-keyout "$KEY" -out "$CERT" \
		-subj "/CN=localhost" \
		-addext "subjectAltName=$SAN"
else
	echo "openssl without -addext; using config file" >&2
	CNF="$(mktemp)"
	trap 'rm -f "$CNF"' EXIT
	{
		echo '[req]'
		echo 'distinguished_name = req_distinguished_name'
		echo 'x509_extensions = v3_req'
		echo 'prompt = no'
		echo '[req_distinguished_name]'
		echo 'CN = localhost'
		echo '[v3_req]'
		echo 'subjectAltName = @alt_names'
		echo '[alt_names]'
		echo 'DNS.1 = localhost'
		echo 'IP.1 = 127.0.0.1'
		i=2
		for arg in "$@"; do
			[[ -z "${arg// }" ]] && continue
			echo "IP.$i = $arg"
			i=$((i + 1))
		done
	} >"$CNF"
	openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
		-keyout "$KEY" -out "$CERT" \
		-config "$CNF" -extensions v3_req
fi

chmod 600 "$KEY"
echo "Wrote:"
echo "  $KEY"
echo "  $CERT"
echo ""
echo "Add to .env (paths must exist when you run Vite):"
echo "  DEV_HTTPS_KEY_FILE=$KEY"
echo "  DEV_HTTPS_CERT_FILE=$CERT"
echo ""
echo "Include https://<host>:3001 in Python CORS_ALLOW_ORIGIN when not using '*'."
