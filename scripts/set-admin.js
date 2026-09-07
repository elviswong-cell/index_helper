#!/usr/bin/env node
/**
 * Grants (or revokes) the Firebase Auth custom claim `{ admin: true }` that
 * firestore.rules / storage.rules check via `request.auth.token.admin`.
 *
 * NEXT_PUBLIC_ADMIN_UIDS (see .env.example) only controls what the app's UI
 * shows — it is NOT a security boundary. Firestore and Storage still deny
 * reads/writes for any UID whose ID token lacks this claim, which is why
 * /admin/tutors (and other /admin pages) can show "Failed to load" / 0
 * results even when signed in as a UID listed in NEXT_PUBLIC_ADMIN_UIDS.
 * Run this once per admin UID, then have them sign out and back in.
 *
 * Usage:
 *   node scripts/set-admin.js <uid> [<uid2> ...]
 *   node scripts/set-admin.js                 # defaults to NEXT_PUBLIC_ADMIN_UIDS from .env.local
 *   node scripts/set-admin.js --revoke <uid>   # remove the claim instead
 *   node scripts/set-admin.js --check          # write nothing; list who currently holds the claim
 *   node scripts/set-admin.js --check <uid>    # write nothing; show one UID's email and claims
 *
 * Credentials (same as mcp-server, see mcp-server/README.md), set one of:
 *   FIREBASE_SERVICE_ACCOUNT_JSON   the service-account key JSON, raw or base64
 *   GOOGLE_APPLICATION_CREDENTIALS  path to the key file (SDK's default lookup)
 *
 * Get a key: Firebase Console → Project settings → Service accounts →
 * Generate new private key. Treat it as a master credential — keep it out
 * of git and out of NEXT_PUBLIC_* env vars.
 */

const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    out[key] = rawValue.replace(/^["']|["']$/g, "");
  }
  return out;
}

function loadApp() {
  const { cert, getApps, initializeApp } = require("firebase-admin/app");
  if (getApps().length > 0) return getApps()[0];

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    const raw = inline.trim().startsWith("{")
      ? inline
      : Buffer.from(inline, "base64").toString("utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (or valid base64-encoded JSON). " +
          `Parse error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return initializeApp({ credential: cert(parsed) });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // applicationDefault() reads this env var itself.
    return initializeApp();
  }

  throw new Error(
    "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON (the service " +
      "account key JSON, raw or base64) or GOOGLE_APPLICATION_CREDENTIALS (a path to " +
      "the key file). See the comment at the top of this script.",
  );
}

/**
 * Read-only: print who holds the admin claim. With no UIDs, walks every
 * Firebase Auth user, so you can see at a glance whether the claim landed on
 * the account you actually sign in with.
 */
async function report(auth, uids) {
  if (uids.length > 0) {
    for (const uid of uids) {
      const user = await auth.getUser(uid).catch(() => null);
      if (!user) {
        console.log(`${uid}: no such Firebase Auth user`);
        continue;
      }
      const claims = user.customClaims ?? {};
      console.log(
        `${claims.admin === true ? "admin" : "  -  "}  ${uid}  ${user.email ?? "(no email)"}  ` +
          `claims=${JSON.stringify(claims)}`,
      );
    }
    return;
  }

  let pageToken;
  let total = 0;
  let admins = 0;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      total += 1;
      const claims = user.customClaims ?? {};
      if (claims.admin === true) admins += 1;
      console.log(
        `${claims.admin === true ? "admin" : "  -  "}  ${user.uid}  ${user.email ?? "(no email)"}  ` +
          `claims=${JSON.stringify(claims)}`,
      );
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`\n${admins} of ${total} users hold the admin claim.`);
  if (admins === 0) {
    console.log(
      "Nobody has it — /admin pages will fail to load for everyone until you " +
        "run this script without --check for the right UID.",
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const check = args.includes("--check");
  const explicitUids = args.filter((a) => !a.startsWith("--"));

  const env = loadEnvLocal();
  const targets = explicitUids.length
    ? explicitUids
    : (env.NEXT_PUBLIC_ADMIN_UIDS ?? process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  if (targets.length === 0 && !check) {
    console.error(
      "No UIDs given and none found in NEXT_PUBLIC_ADMIN_UIDS (.env.local).\n" +
        "Usage: node scripts/set-admin.js <uid> [<uid2> ...]",
    );
    process.exitCode = 1;
    return;
  }

  loadApp();
  const { getAuth } = require("firebase-admin/auth");
  const auth = getAuth();

  if (check) {
    await report(auth, targets);
    return;
  }

  let succeeded = 0;
  let failed = 0;
  for (const uid of targets) {
    const user = await auth.getUser(uid).catch(() => null);
    if (!user) {
      console.error(`✗ ${uid}: no such Firebase Auth user`);
      failed += 1;
      continue;
    }
    const claims = { ...(user.customClaims ?? {}) };
    if (revoke) delete claims.admin;
    else claims.admin = true;
    await auth.setCustomUserClaims(uid, claims);

    // Read the user back so the output is proof of the stored state rather
    // than an echo of what we just sent.
    const after = await auth.getUser(uid);
    const stored = after.customClaims ?? {};
    const ok = revoke ? !stored.admin : stored.admin === true;
    if (!ok) {
      console.error(
        `✗ ${uid}: write reported success but the stored claims are ` +
          `${JSON.stringify(stored)}`,
      );
      failed += 1;
      continue;
    }
    succeeded += 1;
    console.log(
      `${revoke ? "✓ revoked" : "✓ granted"} admin claim for ${uid}` +
        (after.email ? ` (${after.email})` : "") +
        ` — claims now ${JSON.stringify(stored)}`,
    );
  }

  if (failed > 0) {
    console.error(
      `\n${failed} of ${targets.length} failed${succeeded ? `, ${succeeded} succeeded` : ""}. ` +
        "Nothing will change for a UID listed above with ✗.",
    );
    process.exitCode = 1;
  }
  if (succeeded > 0) {
    console.log(
      "\nSign out and back in as each affected user — custom claims are read " +
        "from the ID token, which does not update until it is reissued.",
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
