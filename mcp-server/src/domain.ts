import type { Timestamp } from "firebase-admin/firestore";
import type {
  Lesson,
  Position,
  Registration,
  RegistrationStatus,
  Task,
} from "./types.js";

/**
 * Business logic mirrored from the main app's lib/types.ts. Keep in sync —
 * this is what makes the MCP server's writes behave exactly like the admin
 * UI (per-lesson capacity, status aggregation, invoice math).
 */

export const LEGACY_LESSON_ID = "main";

export function asDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate();
}

/** Lessons of a task, synthesizing one from startAt/endAt for legacy tasks. */
export function lessonsOf(task: Task): Lesson[] {
  if (task.lessons && task.lessons.length > 0) return task.lessons;
  return [{ id: LEGACY_LESSON_ID, startAt: task.startAt, endAt: task.endAt }];
}

export function findLesson(task: Task, lessonId: string): Lesson | undefined {
  return lessonsOf(task).find((l) => l.id === lessonId);
}

/** Lessons an applicant signed up for. Legacy registrations cover every lesson. */
export function lessonIdsFor(reg: Registration, task: Task): string[] {
  const all = lessonsOf(task).map((l) => l.id);
  if (!reg.lessonIds || reg.lessonIds.length === 0) return all;
  return all.filter((id) => reg.lessonIds!.includes(id));
}

export function lessonStatusFor(
  reg: Registration,
  lessonId: string,
): RegistrationStatus {
  return reg.lessonStatuses?.[lessonId] ?? reg.status;
}

export function lessonStatusMap(
  reg: Registration,
  task: Task,
): Record<string, RegistrationStatus> {
  const out: Record<string, RegistrationStatus> = {};
  for (const id of lessonIdsFor(reg, task)) out[id] = lessonStatusFor(reg, id);
  return out;
}

/**
 * Collapse per-lesson decisions into one status: any confirmed lesson makes
 * the whole application "confirmed" (possibly partial); otherwise anything
 * still pending keeps it "pending"; then reserve; then declined.
 */
export function aggregateStatus(statuses: RegistrationStatus[]): RegistrationStatus {
  if (statuses.length === 0) return "pending";
  if (statuses.includes("confirmed")) return "confirmed";
  if (statuses.includes("pending")) return "pending";
  if (statuses.includes("reserve")) return "reserve";
  return "declined";
}

/** Confirmed head count per lesson per position. */
export function countsByLesson(
  task: Task,
  regs: Registration[],
): Record<string, Record<Position, number>> {
  const out: Record<string, Record<Position, number>> = {};
  for (const lesson of lessonsOf(task)) out[lesson.id] = { mt: 0, ta: 0 };
  for (const reg of regs) {
    for (const lessonId of lessonIdsFor(reg, task)) {
      if (!out[lessonId]) continue;
      if (lessonStatusFor(reg, lessonId) === "confirmed") {
        out[lessonId][reg.position] += 1;
      }
    }
  }
  return out;
}

/** Rate for a position, falling back to the legacy single rate. */
export function rateFor(task: Task, position: Position): number {
  return task.rates?.[position] ?? task.hourlyRate ?? 0;
}

export function rateUnitFor(task: Task): "hourly" | "daily" {
  return task.rateUnit ?? "hourly";
}

/** "YYYY-MM" key used to group invoices by billing month. */
export function monthKey(value: Timestamp | Date): string {
  const d = asDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Pay for one lesson: hourly rates bill by duration, daily rates bill flat. */
export function lessonAmount(task: Task, lesson: Lesson, position: Position): number {
  const rate = rateFor(task, position);
  if (rateUnitFor(task) === "daily") return rate;
  const hours = (asDate(lesson.endAt).getTime() - asDate(lesson.startAt).getTime()) / 36e5;
  return Math.round(rate * hours * 100) / 100;
}
