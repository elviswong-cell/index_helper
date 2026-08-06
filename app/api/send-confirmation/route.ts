import { NextResponse } from "next/server";

export const runtime = "nodejs";

type EmailStatus = "confirmed" | "declined" | "reserve";
type LessonStatus = EmailStatus | "pending";

interface LessonLine {
  label?: string;
  date?: string;
  time?: string;
  status?: LessonStatus;
}

interface Payload {
  to?: string;
  userName?: string;
  status?: EmailStatus;
  schoolName?: string;
  position?: string;
  pay?: string;
  address?: string;
  mapUrl?: string;
  notes?: string;
  deadline?: string;
  meetUrl?: string;
  meetAt?: string;
  lessons?: LessonLine[];
}

const SUBJECT: Record<EmailStatus, (school: string, n: number) => string> = {
  confirmed: (school, n) =>
    n > 1
      ? `Confirmed (${n} lesson${n === 1 ? "" : "s"}): ${school}`
      : `Application confirmed: ${school}`,
  declined: (school) => `Application update: ${school}`,
  reserve: (school) => `You've been added to the reserve list: ${school}`,
};

const INTRO: Record<EmailStatus, (n: number, total: number) => string> = {
  confirmed: (n, total) =>
    total > 1 && n < total
      ? `Good news — you've been confirmed for ${n} of the ${total} lessons you applied for. The full breakdown is below.`
      : `Good news — your application has been confirmed. Full details are below.`,
  declined: () =>
    `Thank you for applying. Unfortunately your application was not successful this time. We hope to see you apply again for future opportunities. The job you applied for is listed below for your reference.`,
  reserve: () =>
    `Your application has been placed on the reserve list. If a confirmed spot becomes available, we'll be in touch. The job details are below for your reference.`,
};

const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  confirmed: "Confirmed",
  declined: "Not required",
  reserve: "Reserve",
  pending: "Pending review",
};

const LESSON_STATUS_COLOR: Record<LessonStatus, string> = {
  confirmed: "#15803d",
  declined: "#b91c1c",
  reserve: "#b45309",
  pending: "#6b7280",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Only http(s) links are echoed into the email. */
function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function buildText(p: Required<Pick<Payload, "userName" | "schoolName" | "status">> & Payload) {
  const lessons = p.lessons ?? [];
  const confirmedCount = lessons.filter((l) => l.status === "confirmed").length;
  const mapUrl = safeUrl(p.mapUrl);
  const meetUrl = safeUrl(p.meetUrl);

  const lines: string[] = [
    `Hi ${p.userName},`,
    "",
    INTRO[p.status](confirmedCount, lessons.length),
    "",
    "----------------------------------------",
    `Job:      ${p.schoolName}`,
  ];
  if (p.position) lines.push(`Position: ${p.position}`);
  if (p.pay) lines.push(`Pay:      ${p.pay}`);
  if (p.address) lines.push(`Address:  ${p.address}`);
  if (mapUrl) lines.push(`Map:      ${mapUrl}`);
  if (p.deadline) lines.push(`Apply by: ${p.deadline}`);
  if (meetUrl) lines.push(`Meeting:  ${meetUrl}${p.meetAt ? ` (${p.meetAt})` : ""}`);
  lines.push("----------------------------------------");

  if (lessons.length > 0) {
    lines.push("", lessons.length > 1 ? "Lessons:" : "Date & time:");
    for (const l of lessons) {
      const status = LESSON_STATUS_LABEL[l.status ?? "pending"];
      lines.push(
        `  • ${l.label ?? ""}${l.label ? " — " : ""}${l.date ?? ""}, ${l.time ?? ""}  [${status}]`,
      );
    }
  }

  if (p.notes) {
    lines.push("", "Description / notes:", p.notes);
  }

  lines.push("", "If you have any questions, just reply to this email.", "", "INDEX ACADEMY");
  return lines.join("\n");
}

function buildHtml(p: Required<Pick<Payload, "userName" | "schoolName" | "status">> & Payload) {
  const lessons = p.lessons ?? [];
  const confirmedCount = lessons.filter((l) => l.status === "confirmed").length;
  const mapUrl = safeUrl(p.mapUrl);
  const meetUrl = safeUrl(p.meetUrl);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#111827;font-size:14px;">${value}</td>
    </tr>`;

  const detailRows = [
    row("Job", escapeHtml(p.schoolName)),
    p.position ? row("Position", escapeHtml(p.position)) : "",
    p.pay ? row("Pay", escapeHtml(p.pay)) : "",
    p.address
      ? row(
          "Address",
          escapeHtml(p.address) +
            (mapUrl
              ? `<br/><a href="${escapeHtml(mapUrl)}" style="color:#2563eb;">Open in Google Maps</a>`
              : ""),
        )
      : "",
    p.deadline ? row("Apply by", escapeHtml(p.deadline)) : "",
    meetUrl
      ? row(
          "Online meeting",
          `<a href="${escapeHtml(meetUrl)}" style="color:#2563eb;">Join meeting</a>` +
            (p.meetAt ? `<br/><span style="color:#6b7280;font-size:13px;">${escapeHtml(p.meetAt)}</span>` : ""),
        )
      : "",
  ].join("");

  const lessonRows = lessons
    .map((l, i) => {
      const status = l.status ?? "pending";
      return `
      <tr>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;white-space:nowrap;">${escapeHtml(l.label || `Lesson ${i + 1}`)}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;">${escapeHtml(l.date ?? "")}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;font-size:14px;color:#111827;white-space:nowrap;">${escapeHtml(l.time ?? "")}</td>
        <td style="padding:10px 12px;border-top:1px solid #e5e7eb;font-size:13px;font-weight:600;color:${LESSON_STATUS_COLOR[status]};white-space:nowrap;">${LESSON_STATUS_LABEL[status]}</td>
      </tr>`;
    })
    .join("");

  const lessonTable =
    lessons.length === 0
      ? ""
      : `
    <h3 style="margin:24px 0 8px;font-size:15px;color:#111827;">${lessons.length > 1 ? "Lessons" : "Date &amp; time"}</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;">
      <tr style="background:#f9fafb;">
        <th align="left" style="padding:8px 12px;font-size:12px;color:#6b7280;font-weight:600;">Lesson</th>
        <th align="left" style="padding:8px 12px;font-size:12px;color:#6b7280;font-weight:600;">Date</th>
        <th align="left" style="padding:8px 12px;font-size:12px;color:#6b7280;font-weight:600;">Time</th>
        <th align="left" style="padding:8px 12px;font-size:12px;color:#6b7280;font-weight:600;">Status</th>
      </tr>
      ${lessonRows}
    </table>`;

  const notesBlock = p.notes
    ? `
    <h3 style="margin:24px 0 8px;font-size:15px;color:#111827;">Description / notes</h3>
    <div style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:14px;color:#374151;">${escapeHtml(p.notes)}</div>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
    <p style="margin:0 0 12px;font-size:15px;color:#111827;">Hi ${escapeHtml(p.userName)},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(INTRO[p.status](confirmedCount, lessons.length))}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${detailRows}</table>
    ${lessonTable}
    ${notesBlock}

    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">If you have any questions, just reply to this email.</p>
    <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">INDEX ACADEMY</p>
  </div>
</body></html>`;
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

  const { to, userName = "", schoolName, status = "confirmed" } = body;
  if (!to || !schoolName) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }
  if (!SUBJECT[status]) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  const filled = { ...body, userName, schoolName, status };
  const confirmedCount = (body.lessons ?? []).filter(
    (l) => l.status === "confirmed",
  ).length;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: SUBJECT[status](schoolName, confirmedCount),
        text: buildText(filled),
        html: buildHtml(filled),
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to call Resend:", err);
    return NextResponse.json({ ok: false, error: "Send failed" }, { status: 500 });
  }
}
