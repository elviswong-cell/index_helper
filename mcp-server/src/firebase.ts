import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Initializes the Firebase Admin SDK from one of:
 *  - FIREBASE_SERVICE_ACCOUNT_JSON: the full service-account key JSON,
 *    either raw or base64-encoded (handy for env vars that dislike newlines)
 *  - GOOGLE_APPLICATION_CREDENTIALS: path to a service-account key file
 *    (the SDK's own default lookup — no code needed for this one)
 *
 * The Admin SDK authenticates as a trusted server and bypasses Firestore
 * security rules entirely, so this key must be treated as a master
 * credential: keep it out of git, never print it, and scope it to a
 * service account used only by this server.
 */
function loadApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    const raw = inline.trim().startsWith("{")
      ? inline
      : Buffer.from(inline, "base64").toString("utf8");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (or valid base64-encoded JSON). " +
          `Parse error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return initializeApp({ credential: cert(parsed as never) });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // applicationDefault() reads this env var itself.
    return initializeApp();
  }

  throw new Error(
    "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON (the service " +
      "account key JSON, raw or base64) or GOOGLE_APPLICATION_CREDENTIALS (a path to " +
      "the key file). See mcp-server/README.md.",
  );
}

const app = loadApp();
export const db: Firestore = getFirestore(app);

/** The Firebase Auth UID recorded as the actor for writes (createdBy, paidBy, ...). */
export function actingAdminUid(override?: string): string {
  const uid = override ?? process.env.ADMIN_UID;
  if (!uid) {
    throw new Error(
      "No admin UID available. Set ADMIN_UID in the environment, or pass admin_uid to this tool.",
    );
  }
  return uid;
}
