import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { to, userName, schoolName, position } = body;
  if (!to || !schoolName) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
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
        subject: `報名已確認：${schoolName}`,
        text: `${userName ?? ""} 你好，\n\n你報名的「${schoolName}」${
          position ? `（${position}）` : ""
        }已獲確認。\n\n如有查詢，請直接回覆此郵件。`,
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
