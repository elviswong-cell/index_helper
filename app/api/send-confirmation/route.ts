import { NextResponse } from "next/server";

export const runtime = "nodejs";

type EmailStatus = "confirmed" | "declined" | "reserve";

const SUBJECT: Record<EmailStatus, (school: string) => string> = {
  confirmed: (school) => `Application confirmed: ${school}`,
  declined: (school) => `Application update: ${school}`,
  reserve: (school) => `You've been added to the reserve list: ${school}`,
};

const BODY: Record<
  EmailStatus,
  (args: { userName: string; schoolName: string; position: string }) => string
> = {
  confirmed: ({ userName, schoolName, position }) =>
    `Hi ${userName},\n\nYour application for "${schoolName}"${
      position ? ` (${position})` : ""
    } has been confirmed.\n\nIf you have any questions, just reply to this email.`,
  declined: ({ userName, schoolName, position }) =>
    `Hi ${userName},\n\nThank you for applying for "${schoolName}"${
      position ? ` (${position})` : ""
    }. Unfortunately your application was not successful this time.\n\nWe hope to see you apply again for future opportunities.`,
  reserve: ({ userName, schoolName, position }) =>
    `Hi ${userName},\n\nYour application for "${schoolName}"${
      position ? ` (${position})` : ""
    } has been placed on the reserve list. If a confirmed spot becomes available, we'll be in touch.\n\nIf you have any questions, just reply to this email.`,
};

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

  let body: {
    to?: string;
    userName?: string;
    schoolName?: string;
    position?: string;
    status?: EmailStatus;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { to, userName = "", schoolName, position = "", status = "confirmed" } = body;
  if (!to || !schoolName) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }
  if (!SUBJECT[status]) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

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
        subject: SUBJECT[status](schoolName),
        text: BODY[status]({ userName, schoolName, position }),
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
