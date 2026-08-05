import { POSITION_LABEL, type Registration } from "./types";

/**
 * Calls our own /api/send-confirmation route (which uses Resend's HTTP
 * API server-side). Failures here are non-fatal — the registration is
 * already confirmed either way — so callers should catch and just warn.
 */
export async function sendConfirmationEmail(
  registration: Registration,
  schoolName: string,
): Promise<void> {
  const res = await fetch("/api/send-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: registration.userEmail,
      userName: registration.userName,
      schoolName,
      position: POSITION_LABEL[registration.position],
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "寄送確認郵件失敗");
  }
}
