import type { Timestamp } from "firebase/firestore";

export type Position = "mt" | "ta";

export const POSITIONS: Position[] = ["mt", "ta"];

export type TaskStatus = "open" | "closed" | "cancelled";

/**
 * pending = just applied, awaiting admin review
 * confirmed = admin approved, counts toward capacity
 * declined = admin rejected
 * reserve = admin put on the backup/reserve list (doesn't count toward capacity)
 */
export type RegistrationStatus = "pending" | "confirmed" | "declined" | "reserve";

export type RateUnit = "hourly" | "daily";

/**
 * A single session of a course. A course (Task) can run over several
 * lessons — applicants pick which ones they can attend, and the admin
 * approves them lesson by lesson.
 */
export interface Lesson {
  id: string;
  startAt: Timestamp | Date;
  endAt: Timestamp | Date;
  /** Optional label, e.g. "Workshop day 1". */
  title?: string;
}

export interface Task {
  id: string;
  schoolName: string;
  /** First lesson start — kept in sync with `lessons` so ordering/queries work. */
  startAt: Timestamp | Date;
  /** Last lesson end — kept in sync with `lessons`. */
  endAt: Timestamp | Date;
  /** Sessions of this course. Older documents have none — see `lessonsOf()`. */
  lessons?: Lesson[];
  positions: {
    mt: number;
    ta: number;
  };
  rates?: {
    mt: number;
    ta: number;
  };
  rateUnit?: RateUnit;
  /** Legacy single hourly rate — kept so older documents still render. */
  hourlyRate?: number;
  address?: string;
  mapUrl?: string;
  /** Optional application deadline. */
  deadline?: Timestamp | Date;
  /** Optional online meeting details. */
  meetUrl?: string;
  meetAt?: Timestamp | Date;
  notes?: string;
  status: TaskStatus;
  createdBy: string;
  createdAt: Timestamp | Date;
}

export interface Registration {
  id: string;
  taskId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  position: Position;
  /** Lessons the applicant asked to attend. Missing on legacy documents. */
  lessonIds?: string[];
  /** Per-lesson admin decision. Missing entries fall back to `status`. */
  lessonStatuses?: Record<string, RegistrationStatus>;
  /** Aggregate of `lessonStatuses` — see `aggregateStatus()`. */
  status: RegistrationStatus;
  createdAt: Timestamp | Date;
  confirmedAt?: Timestamp | Date;
}

export interface UserProfile {
  uid: string;
  phone: string;
  displayName?: string;
  email?: string;
  updatedAt?: Timestamp | Date;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}

export const POSITION_LABEL: Record<Position, string> = {
  mt: "MT 主導師",
  ta: "TA 助教",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: "開放報名",
  closed: "截止報名",
  cancelled: "已取消",
};

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending: "待審核",
  confirmed: "已確認",
  declined: "已拒絕",
  reserve: "後備",
};

export const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  hourly: "／小時",
  daily: "／日",
};

/** Rate for a position, falling back to the legacy single rate. */
export function rateFor(task: Task, position: Position): number {
  return task.rates?.[position] ?? task.hourlyRate ?? 0;
}

export function rateUnitFor(task: Task): RateUnit {
  return task.rateUnit ?? "hourly";
}

// ---------- Lessons ----------

/** Id used for tasks created before multi-lesson support existed. */
export const LEGACY_LESSON_ID = "main";

/**
 * Lessons of a task. Tasks saved before multi-lesson support get a single
 * synthetic lesson built from their startAt/endAt so every code path can
 * assume a lesson list.
 */
export function lessonsOf(task: Task): Lesson[] {
  if (task.lessons && task.lessons.length > 0) return task.lessons;
  return [{ id: LEGACY_LESSON_ID, startAt: task.startAt, endAt: task.endAt }];
}

export function isMultiLesson(task: Task): boolean {
  return lessonsOf(task).length > 1;
}

export function findLesson(task: Task, lessonId: string): Lesson | undefined {
  return lessonsOf(task).find((l) => l.id === lessonId);
}

/** Lessons an applicant signed up for. Legacy registrations cover every lesson. */
export function lessonIdsFor(reg: Registration, task: Task): string[] {
  const all = lessonsOf(task).map((l) => l.id);
  if (!reg.lessonIds || reg.lessonIds.length === 0) return all;
  // Keep task order, and drop ids for lessons the admin has since removed.
  return all.filter((id) => reg.lessonIds!.includes(id));
}

/** Lessons the applicant selected, in task order. */
export function lessonsFor(reg: Registration, task: Task): Lesson[] {
  const ids = lessonIdsFor(reg, task);
  return lessonsOf(task).filter((l) => ids.includes(l.id));
}

export function lessonStatusFor(
  reg: Registration,
  lessonId: string,
): RegistrationStatus {
  return reg.lessonStatuses?.[lessonId] ?? reg.status;
}

/** Full lessonId -> status map for a registration. */
export function lessonStatusMap(
  reg: Registration,
  task: Task,
): Record<string, RegistrationStatus> {
  const out: Record<string, RegistrationStatus> = {};
  for (const id of lessonIdsFor(reg, task)) out[id] = lessonStatusFor(reg, id);
  return out;
}

/**
 * Collapse per-lesson decisions into the single status shown on badges.
 * Any confirmed lesson makes the application "confirmed" (possibly partial);
 * otherwise anything still awaiting review keeps it "pending".
 */
export function aggregateStatus(
  statuses: RegistrationStatus[],
): RegistrationStatus {
  if (statuses.length === 0) return "pending";
  if (statuses.includes("confirmed")) return "confirmed";
  if (statuses.includes("pending")) return "pending";
  if (statuses.includes("reserve")) return "reserve";
  return "declined";
}

/** True when the admin approved some but not all of the applied lessons. */
export function isPartial(reg: Registration, task: Task): boolean {
  const statuses = Object.values(lessonStatusMap(reg, task));
  return (
    statuses.length > 1 &&
    statuses.includes("confirmed") &&
    statuses.some((s) => s !== "confirmed")
  );
}

export function countLessonStatus(
  reg: Registration,
  task: Task,
  status: RegistrationStatus,
): number {
  return Object.values(lessonStatusMap(reg, task)).filter((s) => s === status)
    .length;
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

/** Confirmed applicants for one lesson + position, in application order. */
export function confirmedFor(
  task: Task,
  regs: Registration[],
  lessonId: string,
  position: Position,
): Registration[] {
  return regs.filter(
    (r) =>
      r.position === position &&
      lessonIdsFor(r, task).includes(lessonId) &&
      lessonStatusFor(r, lessonId) === "confirmed",
  );
}
