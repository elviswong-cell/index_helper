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

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const explicitUids = args.filter((a) => a !== "--revoke");

  const env = loadEnvLocal();
  const targets = explicitUids.length
    ? explicitUids
    : (env.NEXT_PUBLIC_ADMIN_UIDS ?? process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  if (targets.length === 0) {
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

  let failed = false;
  for (const uid of targets) {
    const user = await auth.getUser(uid).catch(() => null);
    if (!user) {
      console.error(`✗ ${uid}: no such Firebase Auth user`);
      failed = true;
      continue;
    }
    const claims = { ...(user.customClaims ?? {}) };
    if (revoke) delete claims.admin;
    else claims.admin = true;
    await auth.setCustomUserClaims(uid, claims);
    console.log(
      `${revoke ? "✓ revoked" : "✓ granted"} admin claim for ${uid}` +
        (user.email ? ` (${user.email})` : ""),
    );
  }

  console.log(
    "\nDone. Affected users must sign out and back in (custom claims are read " +
      "from the ID token, which does not update until it is reissued).",
  );
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
