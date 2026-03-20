# Dev Auth Reset (Targeted)

**DEV-ONLY** — Clears stale OWUI and Case Engine auth/user/session state so you can recreate the admin cleanly. Preserves case, thread, timeline, and file data.

## When to use

- "Case Engine authorization service could not be reached"
- Intermittent auth/authorization failures
- Signed-in UI that behaves inconsistently
- Legacy/old WebUI auth state conflicting with newer user model

## What gets reset

### Open WebUI (backend/data/webui.db)

| Table           | Action  | Purpose                        |
|-----------------|---------|--------------------------------|
| `oauth_session` | DELETE  | Stale OAuth tokens             |
| `auth`          | DELETE  | Email/password credentials     |
| `user`          | DELETE  | OWUI user accounts             |

**Preserved:** chat, file, model, knowledge, folder, tag, etc.

### Case Engine (DB_PATH)

| Table                           | Action  | Purpose                       |
|---------------------------------|---------|-------------------------------|
| `case_engine_users`             | DELETE  | OWUI→Case Engine mapping      |
| `case_engine_user_unit_assignments` | DELETE | Unit assignments (CID/SIU) |
| `case_engine_user_capabilities` | DELETE  | Capability grants             |

**Preserved:** users (legacy direct login), cases, timeline_entries, entry_versions, audit_log, files, thread associations, etc.

## What does NOT get reset

- Case Engine legacy `users` (admin, cid_user, siu_user) — direct login remains
- Case data, timeline, entries, files
- OWUI chat content (rows remain; user_id will be orphaned until new admin)
- Redis sessions (cleared manually if needed)
- Migrations, schema

---

## Run the reset

### 1. Stop all services

Stop Case Engine, OWUI backend, and frontend dev servers.

### 2. Set env and run script

```bash
cd /path/to/open-webui-case-engine

# Required: Case Engine DB path
export DB_PATH=/tmp/case-engine/data/case.db

# Optional: override OWUI data dir (default: backend/data)
# export DATA_DIR=/path/to/backend/data

./scripts/auth-reset-dev.sh
```

The script will:

1. Create timestamped backups in `.auth-reset-backups/`
2. Clear OWUI auth/user/oauth_session
3. Clear Case Engine case_engine_* mapping tables

### 3. Clear browser state

**Required** — stale tokens and cookies cause inconsistent behavior.

1. Open DevTools (F12)
2. **Application** (Chrome) or **Storage** (Firefox)
3. **Local Storage** → `http://localhost:3001` → Clear
4. **Cookies** → `http://localhost:3001` → Remove all
5. Optionally: **Session Storage** → Clear

Or use a private/incognito window for the first login after reset.

### 4. Start services

1. **Case Engine**
   ```bash
   cd /path/to/DetectiveCaseEngine
   DB_PATH=/tmp/case-engine/data/case.db FILE_STORAGE_PATH=/tmp/case-engine/files npm run dev
   ```

2. **OWUI backend**
   ```bash
   cd /path/to/open-webui-case-engine
   ./backend/dev.sh
   ```

3. **Frontend**
   ```bash
   cd /path/to/open-webui-case-engine
   npm run dev
   ```

### 5. Recreate admin

1. Open **http://localhost:3001**
2. You should see the **initial signup page** (no users)
3. Create admin: email, password, name
4. Sign in

### 6. Case Engine access (normal vs recovery)

**Normal flow:** With bootstrap or activate-user, OWUI login triggers transparent `browser-resolve`; no Connect step. **Recovery paths** below:

**Path A — OWUI → Case Engine mapping (bootstrap admin):**

1. Set `ALLOW_BOOTSTRAP_ADMIN=true` in the Case Engine process before starting.
2. Restart Case Engine.
3. After OWUI login, the app layout calls `browser-resolve`. With bootstrap allowed and no admin in `case_engine_users`, the first OWUI admin is auto-created and approved.
4. **Note:** The frontend does not currently pass `bootstrap_admin: true`; bootstrap works only when Case Engine creates the first admin automatically (no existing admin rows).

**Path B — Legacy direct login (Connect modal):**

1. In the sidebar under Cases, click **Connect to Case Engine**.
2. Enter legacy credentials: `admin` / `admin123` (from Case Engine `users` table, preserved by reset).
3. This uses `POST /auth/login` (direct Case Engine auth) and stores the token.
4. My Desktop, cases, and thread features work. Identity is the legacy Case Engine admin, not the OWUI admin.

**Path C — Use activate-user script (for OWUI-first mapping):**

1. From DetectiveCaseEngine, get the new OWUI user ID (from open-webui-case-engine): `python3 -c "import sqlite3; r=sqlite3.connect('../open-webui-case-engine/backend/data/webui.db').execute('SELECT id FROM \"user\" WHERE email=?',('your@email.com',)).fetchone(); print(r[0] if r else 'not found')"`
2. Create profile: `cd DetectiveCaseEngine && DB_PATH=/tmp/case-engine/data/case.db node scripts/activate-user.js create "<owui_user_id>" your@email.com`
3. Approve: `DB_PATH=/tmp/case-engine/data/case.db node scripts/activate-user.js activate-email your@email.com`
4. Log out and back in so `browser-resolve` runs again; you should get `active` with token.

### 7. Verify single active identity

- Only one admin account in OWUI
- Only one active row in `case_engine_users` (if you use OWUI-based Case Engine access)
- No stale tokens in localStorage

---

## Restore from backup

```bash
# Restore OWUI
cp .auth-reset-backups/webui-YYYYMMDD-HHMMSS.db backend/data/webui.db

# Restore Case Engine (use your DB_PATH)
cp .auth-reset-backups/case-engine-YYYYMMDD-HHMMSS.db /tmp/case-engine/data/case.db
```

---

## Redis sessions (optional)

If you use Redis for OWUI sessions and see stale behavior:

```bash
# List session keys
redis-cli KEYS 'session:*'

# Delete all session keys (replace with your Redis URL if needed)
redis-cli KEYS 'session:*' | xargs -r redis-cli DEL
```

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| "DB_PATH must be set" | Export DB_PATH before running the script |
| OWUI DB not found | Set DATA_DIR or ensure `backend/data/webui.db` exists |
| Still seeing old admin | Clear browser localStorage and cookies |
| "Bootstrap admin is already initialized" | case_engine_users still has rows; re-run reset or manually delete |
| Initial signup not shown | ENABLE_INITIAL_ADMIN_SIGNUP may be false; set in .env if needed |
