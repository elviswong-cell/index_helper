# helper-recruitment-mcp-server

An MCP server that gives an LLM (Claude, or any MCP client) admin control
over the [Helper Recruitment](../README.md) platform's data — the same
things the `/admin` pages in the app do, as tool calls instead of clicks.

It talks to Firestore directly via the **Firebase Admin SDK**, which
authenticates as a trusted server and **bypasses the app's Firestore
security rules entirely**. There is no login flow and no `isAdmin` check —
whoever can run this server has full read/write access to every task,
registration, tutor profile, and invoice. Treat its credential as a master
key (see [Security](#security) below).

## What it can do

| Domain | Tools |
| --- | --- |
| **Tasks** | create, update, cancel, reopen, delete, get, list |
| **Registrations** | list applicants for a task, decide (confirm/decline/reserve — per lesson or all at once, with per-lesson capacity enforcement), cancel |
| **Tutors** | list/search, get one profile, delete a profile |
| **Invoices** | list, get, mark paid, mark unpaid, delete |

Each tool's full argument list and return shape is in its MCP `description`
— ask the connected LLM to list tools, or read `src/tools/*.ts`.

Registration decisions reproduce the admin UI's business rules exactly:
confirming a lesson checks that lesson's MT/TA capacity against every other
confirmed applicant first, and the registration's aggregate `status` is
recomputed the same way (`lib/types.ts`'s `aggregateStatus` in the main
app, ported to `src/domain.ts` here). This server does **not** send the
applicant notification emails the admin UI sends after a decision — that's
a deliberate scope cut, not an oversight.

## Setup

### 1. Get a Firebase service-account key

Firebase Console → your project (`minds-56fa1` by default — see the main
app's `.env.example`) → **Project settings → Service accounts → Generate
new private key**. This downloads a JSON file — keep it secret.

### 2. Configure credentials

Copy `.env.example` to `.env` (or set these however your MCP client passes
env vars to a stdio server) and fill in **one** of:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — the key file's contents, pasted as raw
  JSON or base64-encoded (base64 sidesteps env vars that mangle newlines)
- `GOOGLE_APPLICATION_CREDENTIALS` — an absolute path to the key file instead

Also set `ADMIN_UID` — any identifier for "the admin operating this
server"; it's recorded on writes (`createdBy`, `paidBy`) but isn't checked
against real Firebase Auth. You can override it per call instead via each
tool's `admin_uid` parameter.

### 3. Install and build

```bash
cd mcp-server
npm install
npm run build
```

### 4. Register it with your MCP client

For Claude Code, from the repo root:

```bash
claude mcp add helper-recruitment \
  --env FIREBASE_SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)" \
  --env ADMIN_UID=your-uid \
  -- node "$(pwd)/mcp-server/dist/index.js"
```

Or add it by hand to your MCP config (e.g. `.mcp.json`):

```json
{
  "mcpServers": {
    "helper-recruitment": {
      "command": "node",
      "args": ["/absolute/path/to/index_helper/mcp-server/dist/index.js"],
      "env": {
        "FIREBASE_SERVICE_ACCOUNT_JSON": "<paste the key JSON here, or use GOOGLE_APPLICATION_CREDENTIALS instead>",
        "ADMIN_UID": "your-uid"
      }
    }
  }
}
```

### 5. Try it

Ask the connected LLM to list tasks (`helper_recruitment_list_tasks`) — a
read-only call — to confirm the credential works before trying anything
that writes.

## Security

- **This is a master key.** The Admin SDK ignores Firestore security
  rules, so this credential can read or overwrite anything in the
  database — not just what an admin sees through the app's UI.
- **Never commit the key.** `.gitignore` here blocks common
  `*service-account*.json` / `*firebase-adminsdk*.json` filenames and `.env`,
  but double-check before committing if you name the file something else.
- **Run it somewhere you trust.** Anyone with access to wherever this
  server runs (and its env vars) has full admin access to the platform's
  data — tasks, applicants' phone numbers and SCRC files' URLs, bank
  details, invoices.
- **Rotate the key if it ever leaks**: Firebase Console → Project settings
  → Service accounts → find the key → revoke, then generate a new one.
- Prefer scoping the service account's IAM role to just Firestore access
  if your Google Cloud project supports custom roles, rather than using a
  broader default service account.

## Development

```bash
npm run dev     # tsx watch — auto-rebuild on save, runs via stdio
npm run build   # tsc -> dist/
npm run clean   # rm -rf dist
```

`src/types.ts` and `src/domain.ts` mirror the main app's `lib/types.ts` —
if the app's data model or business logic changes, update both.
