import { format } from "date-fns";
import {
  RATE_UNIT_LABEL,
  lessonStatusFor,
  lessonsFor,
  rateFor,
  rateUnitFor,
  type Registration,
  type RegistrationStatus,
  type Task,
} from "./types";

const POSITION_EN: Record<Registration["position"], string> = {
  mt: "MT (Lead Mentor)",
  ta: "TA (Teaching Assistant)",
};

const RATE_UNIT_EN: Record<"hourly" | "daily", string> = {
  hourly: "per hour",
  daily: "per day",
};

export interface LessonEmailLine {
  label: string;
  date: string;
  time: string;
  status: RegistrationStatus;
}

export interface StatusEmailPayload {
  to: string;
  userName: string;
  status: "confirmed" | "declined" | "reserve";
  schoolName: string;
  position: string;
  pay: string;
  address?: string;
  mapUrl?: string;
  notes?: string;
  deadline?: string;
  meetUrl?: string;
  meetAt?: string;
  lessons: LessonEmailLine[];
}

function toJsDate(value: Task["startAt"] | undefined | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

function fmtDate(d: Date | null): string {
  return d ? format(d, "EEEE, d MMMM yyyy") : "";
}

function fmtTimeRange(start: Date | null, end: Date | null): string {
  if (!start || !end) return "";
  return `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`;
}

/** Everything the email needs, formatted client-side where the locale lives. */
export function buildStatusEmailPayload(
  registration: Registration,
  task: Task,
  status: "confirmed" | "declined" | "reserve",
): StatusEmailPayload {
  const applied = lessonsFor(registration, task);
  const unit = rateUnitFor(task);
  const meetAt = toJsDate(task.meetAt);
  const deadline = toJsDate(task.deadline);

  const lessons: LessonEmailLine[] = applied.map((lesson, i) => {
    const start = toJsDate(lesson.startAt);
    const end = toJsDate(lesson.endAt);
    return {
      label: lesson.title || `Lesson ${i + 1}`,
      date: fmtDate(start),
      time: fmtTimeRange(start, end),
      status: lessonStatusFor(registration, lesson.id),
    };
  });

  return {
    to: registration.userEmail,
    userName: registration.userName,
    status,
    schoolName: task.schoolName,
    position: POSITION_EN[registration.position],
    pay: `HK$${rateFor(task, registration.position).toLocaleString("en-US")} ${
      RATE_UNIT_EN[unit]
    }`,
    ...(task.address ? { address: task.address } : {}),
    ...(task.mapUrl ? { mapUrl: task.mapUrl } : {}),
    ...(task.notes ? { notes: task.notes } : {}),
    ...(deadline ? { deadline: `${fmtDate(deadline)} ${format(deadline, "HH:mm")}` } : {}),
    ...(task.meetUrl ? { meetUrl: task.meetUrl } : {}),
    ...(meetAt ? { meetAt: `${fmtDate(meetAt)} ${format(meetAt, "HH:mm")}` } : {}),
    lessons,
  };
}

/**
 * Calls our own /api/send-confirmation route (which uses Resend's HTTP
 * API server-side) to notify an applicant their status changed.
 * Failures here are non-fatal — the status change already succeeded —
 * so callers should catch and just warn.
 */
export async function sendStatusEmail(
  registration: Registration,
  task: Task,
  status: "confirmed" | "declined" | "reserve",
): Promise<void> {
  const res = await fetch("/api/send-confirmation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildStatusEmailPayload(registration, task, status)),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send email");
  }
}
