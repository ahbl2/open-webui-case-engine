#!/usr/bin/env bash
#
# DEV-ONLY: Auth reset for Detective Stack
#
# Clears stale OWUI + Case Engine auth/user/session state so you can recreate
# admin cleanly. Preserves case/thread/timeline/file data.
#
# Usage:
#   ./scripts/auth-reset-dev.sh
#
# Requires: DB_PATH, FILE_STORAGE_PATH (Case Engine); DATA_DIR or backend/data (OWUI)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/.auth-reset-backups}"

echo "[auth-reset] DEV auth reset — $(date -Iseconds)"
echo ""

# ─── Paths ─────────────────────────────────────────────────────────────────
# OWUI: backend/data/webui.db (or DATA_DIR from env)
OWUI_DATA_DIR="${DATA_DIR:-$ROOT_DIR/backend/data}"
OWUI_DB="${OWUI_DATA_DIR}/webui.db"

# Case Engine: DB_PATH required
CE_DB="${DB_PATH:-}"
if [[ -z "${CE_DB}" ]]; then
  echo "ERROR: DB_PATH must be set (Case Engine DB path)"
  echo "  Example: DB_PATH=/tmp/case-engine/data/case.db ./scripts/auth-reset-dev.sh"
  exit 1
fi

if [[ ! -f "$CE_DB" ]]; then
  echo "ERROR: Case Engine DB not found: $CE_DB"
  exit 1
fi

# ─── Backups ───────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
echo "[auth-reset] Creating timestamped backups in $BACKUP_DIR"

if [[ -f "$OWUI_DB" ]]; then
  OWUI_BACKUP="$BACKUP_DIR/webui-$TS.db"
  cp -a "$OWUI_DB" "$OWUI_BACKUP"
  echo "  Backed up OWUI: $OWUI_BACKUP"
else
  echo "  WARN: OWUI DB not found at $OWUI_DB (will skip OWUI reset)"
  OWUI_DB=""
fi

CE_BACKUP="$BACKUP_DIR/case-engine-$TS.db"
cp -a "$CE_DB" "$CE_BACKUP"
echo "  Backed up Case Engine: $CE_BACKUP"

# OWUI config.json if present
if [[ -n "$OWUI_DATA_DIR" && -f "$OWUI_DATA_DIR/config.json" ]]; then
  cp -a "$OWUI_DATA_DIR/config.json" "$BACKUP_DIR/config-$TS.json"
  echo "  Backed up config: $BACKUP_DIR/config-$TS.json"
fi

echo ""

# ─── SQL runner (sqlite3 CLI or Python fallback) ────────────────────────────
run_sql_owui() {
  local db="$1"
  if command -v sqlite3 &>/dev/null; then
    sqlite3 "$db" "DELETE FROM oauth_session; DELETE FROM auth; DELETE FROM \"user\";"
  else
    python3 -c "
import sqlite3
conn = sqlite3.connect('$db')
conn.execute('DELETE FROM oauth_session')
conn.execute('DELETE FROM auth')
conn.execute('DELETE FROM \"user\"')
conn.commit()
conn.close()
"
  fi
}
run_sql_ce() {
  local db="$1"
  if command -v sqlite3 &>/dev/null; then
    sqlite3 "$db" "DELETE FROM case_engine_user_capabilities; DELETE FROM case_engine_user_unit_assignments; DELETE FROM case_engine_users;"
  else
    python3 -c "
import sqlite3
conn = sqlite3.connect('$db')
conn.execute('DELETE FROM case_engine_user_capabilities')
conn.execute('DELETE FROM case_engine_user_unit_assignments')
conn.execute('DELETE FROM case_engine_users')
conn.commit()
conn.close()
"
  fi
}

# ─── OWUI reset (auth, user, oauth_session) ─────────────────────────────────
if [[ -n "$OWUI_DB" && -f "$OWUI_DB" ]]; then
  echo "[auth-reset] Resetting OWUI auth state..."
  run_sql_owui "$OWUI_DB"
  echo "  Cleared: oauth_session, auth, user"
  echo ""
fi

# ─── Case Engine reset (OWUI mapping only) ──────────────────────────────────
echo "[auth-reset] Resetting Case Engine OWUI mapping..."
run_sql_ce "$CE_DB"
echo "  Cleared: case_engine_users, case_engine_user_unit_assignments, case_engine_user_capabilities"
echo ""

# ─── Redis (if used) ────────────────────────────────────────────────────────
REDIS_URL="${REDIS_URL:-}"
if [[ -n "$REDIS_URL" ]]; then
  echo "[auth-reset] Redis detected. Session keys are under 'session:' prefix."
  echo "  To clear Redis sessions: redis-cli KEYS 'session:*' | xargs redis-cli DEL"
  echo "  (Skipping Redis — run manually if needed)"
  echo ""
fi

echo "[auth-reset] Done."
echo ""
echo "Next steps:"
echo "  1. Stop all services (Case Engine, OWUI backend, frontend)."
echo "  2. Clear browser: localStorage (F12 → Application → Local Storage), cookies for localhost."
echo "  3. Start Case Engine, then OWUI backend, then frontend."
echo "  4. Open http://localhost:3001 — you should see the initial signup page."
echo "  5. Create a new admin account (email, password)."
echo "  6. After login, use 'Connect to Case Engine' with bootstrap_admin: true (or approve via API)."
echo ""
echo "Backups: $BACKUP_DIR"
echo "  To restore OWUI: cp $BACKUP_DIR/webui-$TS.db $OWUI_DB"
echo "  To restore Case Engine: cp $BACKUP_DIR/case-engine-$TS.db $CE_DB"
