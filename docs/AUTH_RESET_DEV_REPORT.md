# Auth Reset Execution Report — 2026-03-19

## 1. Blast radius (script only touches auth-related state)

**OWUI** (`backend/data/webui.db`):
- `oauth_session` — DELETE (stale OAuth tokens)
- `auth` — DELETE (email/password credentials)
- `user` — DELETE (OWUI user accounts)

**Case Engine** (`DB_PATH`):
- `case_engine_user_capabilities` — DELETE
- `case_engine_user_unit_assignments` — DELETE
- `case_engine_users` — DELETE

**Not touched:** Schema, migrations, cases, timeline_entries, files, thread registry, Case Engine legacy `users`, OWUI chat/file/model/knowledge tables.

---

## 2. Files/DBs backed up

| File | Location |
|------|----------|
| OWUI DB | `.auth-reset-backups/webui-20260319-092353.db` |
| Case Engine DB | `.auth-reset-backups/case-engine-20260319-092353.db` |
| config.json | (not present; would be `config-20260319-092353.json`) |

---

## 3. Exact tables changed

| DB | Table | Action |
|----|-------|--------|
| OWUI | `oauth_session` | DELETE all rows |
| OWUI | `auth` | DELETE all rows |
| OWUI | `"user"` | DELETE all rows |
| Case Engine | `case_engine_user_capabilities` | DELETE all rows |
| Case Engine | `case_engine_user_unit_assignments` | DELETE all rows |
| Case Engine | `case_engine_users` | DELETE all rows |

---

## 4. What was removed

- All OWUI users, auth credentials, OAuth sessions
- All OWUI → Case Engine user mappings (case_engine_users and related)

---

## 5. What was preserved

- Case Engine: `users` (3 legacy: admin, cid_user, siu_user), `cases` (3), `timeline_entries` (5), schema, migrations
- OWUI: chat, file, model, knowledge, folder, tag tables (and schema)
- All migrations intact (verified via `verify-migrations.js`)

---

## 6. Browser cleanup steps (REQUIRED)

1. Open **http://localhost:3001**
2. Open DevTools (F12)
3. **Application** (Chrome) or **Storage** (Firefox)
4. **Local Storage** → `http://localhost:3001` → Right‑click → Clear
5. **Session Storage** → `http://localhost:3001` → Clear
6. **Cookies** → `http://localhost:3001` → Remove all
7. Close DevTools and refresh, or use an incognito/private window

---

## 7. Service start order

Services were already running. If you need to restart:

1. **Case Engine** (port 3010):
   ```bash
   cd /home/aaron/dev/DetectiveCaseEngine
   DB_PATH=/tmp/case-engine/data/case.db FILE_STORAGE_PATH=/tmp/case-engine/files npm run dev
   ```

2. **OWUI backend** (port 8080):
   ```bash
   cd /home/aaron/dev/open-webui-case-engine
   ./backend/dev.sh
   ```

3. **Frontend** (port 3001):
   ```bash
   cd /home/aaron/dev/open-webui-case-engine
   npm run dev
   ```

---

## 8. Admin recreation steps

### Step 1: Create OWUI admin

1. Open **http://localhost:3001**
2. You should see the **initial signup** screen (no users)
3. Enter email, password, name → Create
4. Sign in

### Step 2: Case Engine access (legacy Connect recovery path)

1. In the sidebar, under **Cases**, click **Connect to Case Engine**
2. Use legacy credentials: **admin** / **admin123**
3. Click Connect
4. Token and case list should load

### Step 3: Verify flows

- **My Desktop** loads
- **Cases** list shows
- No “authorization service could not be reached” error
- Create a new personal chat → it loads without spinner
- Open an existing thread if applicable

---

## 9. Validation results

| Check | Result |
|-------|--------|
| OWUI user/auth/oauth cleared | ✓ user=0, auth=0, oauth_session=0 |
| Case Engine mapping cleared | ✓ case_engine_* tables all 0 |
| Legacy users preserved | ✓ users=3 |
| Case data preserved | ✓ cases=3, timeline_entries=5 |
| Schema intact | ✓ OWUI 35 tables, CE 42 tables |
| Migrations OK | ✓ `verify-migrations.js` passed |

---

## 10. Remaining issues classification

If problems persist after reset and browser cleanup:

| Symptom | Likely cause |
|---------|--------------|
| Still “authorization service could not be reached” | Stale browser localStorage/cookies; Case Engine not reachable (port 3010, proxy) |
| Initial signup not shown | `ENABLE_INITIAL_ADMIN_SIGNUP` may be false |
| browser-resolve returns denied_no_profile | No OWUI→CE mapping; use Connect with admin/admin123 or activate-user |
| Spinner on chat load | Separate chat/thread load issue, not auth |
| WebSocket errors | Separate WebSocket configuration, not auth |
