import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Recipients are fixed server-side on purpose. The client supplies the PDF
 * but never the destination, so this route can't be used to mail arbitrary
 * attachments to arbitrary addresses.
 */
const RECIPIENTS = ["avery@indexacademy.io", "joe@indexgame.hk"];

/** Generous ceiling for a one-page rasterised A4 invoice. */
const MAX_PDF_BYTES = 8 * 1024 * 1024;

interface LineItem {
  date?: string;
  schoolName?: string;
  courseName?: string;
  time?: string;
  amount?: string;
}

interface Payload {
  userName?: string;
  userEmail?: string;
  month?: string;
  total?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  items?: LineItem[];
  pdfBase64?: string;
  fileName?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Strips anything that could smuggle a header into the filename. */
function safeFileName(name: string | undefined, fallback: string): string {
  if (!name) return fallback;
  const cleaned = name.replace(/[\r\n"\\/]+/g, "").trim();
  if (!cleaned || !cleaned.toLowerCase().endsWith(".pdf")) return fallback;
  return cleaned.slice(0, 120);
}

export async function POST(req: Request) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return NextResponse.json(
      { ok: false, error: "Email service not configured" },
      { status: 500 },
    );
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const {
    userName = "",
    userEmail = "",
    month = "",
    total = "",
    items = [],
    pdfBase64,
  } = body;

  if (!userName || !month || !pdfBase64) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(pdfBase64)) {
    return NextResponse.json({ ok: false, error: "Invalid attachment" }, { status: 400 });
  }
  // base64 is 4 chars per 3 bytes.
  if ((pdfBase64.length * 3) / 4 > MAX_PDF_BYTES) {
    return NextResponse.json({ ok: false, error: "Attachment too large" }, { status: 413 });
  }

  const fileName = safeFileName(body.fileName, `Invoice_${month}.pdf`);

  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px;border-top:1px solid #e5e7eb;font-size:13px;">${escapeHtml(i.date ?? "")}</td>
        <td style="padding:8px 12px;border-top:1px solid #e5e7eb;font-size:13px;">${escapeHtml(i.schoolName ?? "")}</td>
        <td style="padding:8px 12px;border-top:1px solid #e5e7eb;font-size:13px;">${escapeHtml(i.courseName ?? "")}</td>
        <td style="padding:8px 12px;border-top:1px solid #e5e7eb;font-size:13px;">${escapeHtml(i.time ?? "")}</td>
        <td style="padding:8px 12px;border-top:1px solid #e5e7eb;font-size:13px;text-align:right;">${escapeHtml(i.amount ?? "")}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;">
    <h2 style="margin:0 0 4px;font-size:18px;color:#111827;">Invoice — ${escapeHtml(month)}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
      From ${escapeHtml(userName)}${userEmail ? ` (${escapeHtml(userEmail)})` : ""}
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;">
      <tr style="background:#f9fafb;">
        <th align="left" style="padding:8px 12px;font-size:12px;color:#6b7280;">Date</th>
        <th align="left" style="padding:8px 12px;font-size:12px;color:#6b7280;">School</th>
        <th align="left" style="padding:8px 12px;font-size:12px;color:#6b7280;">Course</th>
        <th align="left" style="padding:8px 12px;font-size:12px;color:#6b7280;">Time</th>
        <th align="right" style="padding:8px 12px;font-size:12px;color:#6b7280;">Price</th>
      </tr>
      ${rows}
    </table>

    <p style="margin:16px 0 0;font-size:16px;color:#111827;"><strong>Total: ${escapeHtml(total)}</strong></p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;width:100%;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;">Bank</td><td style="padding:4px 0;font-size:14px;color:#111827;">${escapeHtml(body.bankName ?? "")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;">Account</td><td style="padding:4px 0;font-size:14px;color:#111827;">${escapeHtml(body.bankAccount ?? "")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;">Name</td><td style="padding:4px 0;font-size:14px;color:#111827;">${escapeHtml(body.bankAccountName ?? "")}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">The signed PDF invoice is attached.</p>
  </div>
</body></html>`;

  const text = [
    `Invoice — ${month}`,
    `From ${userName}${userEmail ? ` (${userEmail})` : ""}`,
    "",
    ...items.map(
      (i) =>
        `  ${i.date ?? ""}  ${i.schoolName ?? ""} ${i.courseName ?? ""}  ${i.time ?? ""}  ${i.amount ?? ""}`,
    ),
    "",
    `Total: ${total}`,
    "",
    `Bank: ${body.bankName ?? ""}`,
    `Account: ${body.bankAccount ?? ""}`,
    `Name: ${body.bankAccountName ?? ""}`,
    "",
    "The PDF invoice is attached.",
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: RECIPIENTS,
        subject: `Invoice ${month} — ${userName}`,
        text,
        html,
        attachments: [{ filename: fileName, content: pdfBase64 }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API error:", res.status, errText);
      return NextResponse.json(
        { ok: false, error: `Resend error: ${res.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, sentTo: RECIPIENTS });
  } catch (err) {
    console.error("Failed to call Resend:", err);
    return NextResponse.json({ ok: false, error: "Send failed" }, { status: 500 });
  }
}
