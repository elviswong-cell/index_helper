import { type Registration } from "./types";

const POSITION_EN: Record<Registration["position"], string> = {
  mt: "MT (Lead Mentor)",
  ta: "TA (Teaching Assistant)",
};

/**
 * Calls our own /api/send-confirmation route (which uses Resend's HTTP
 * API server-side) to notify an applicant their status changed.
 * Failures here are non-fatal — the status change already succeeded —
 * so callers should catch and just warn.
 */
export async function sendStatusEmail(
  registration: Registration,
  schoolName: string,
  status: "confirmed" | "declined" | "reserve",
): Promise<void> {
  const res = await fetch("/api/send-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: registration.userEmail,
      userName: registration.userName,
      schoolName,
      position: POSITION_EN[registration.position],
      status,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send email");
  }
}
