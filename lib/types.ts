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
  /** Sexual Conviction Record Check — Storage download URL of the uploaded image. */
  scrcUrl?: string;
  scrcUploadedAt?: Timestamp | Date;
  /** Payment details. `bankAccountName` must match the account holder. */
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  updatedAt?: Timestamp | Date;
}

/** Fields an applicant must supply before they may apply for any job. */
export const REQUIRED_PROFILE_FIELDS = [
  "phone",
  "scrcUrl",
  "bankName",
  "bankAccount",
  "bankAccountName",
] as const;

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export function missingProfileFields(
  profile: UserProfile | null | undefined,
): RequiredProfileField[] {
  if (!profile) return [...REQUIRED_PROFILE_FIELDS];
  return REQUIRED_PROFILE_FIELDS.filter((f) => !String(profile[f] ?? "").trim());
}

export function isProfileComplete(
  profile: UserProfile | null | undefined,
): boolean {
  return missingProfileFields(profile).length === 0;
}

/**
 * submitted = freelancer sent it, awaiting admin
 * paid      = admin confirmed payment
 * superseded = replaced by a later invoice for the same month (house rule:
 *              one invoice per person per month, the latest one wins)
 */
export type InvoiceStatus = "submitted" | "paid" | "superseded";

/** One completed lesson billed on an invoice. Snapshotted at submit time. */
export interface InvoiceItem {
  taskId: string;
  lessonId: string;
  /** Lesson start — kept so the invoice can be re-rendered and sorted. */
  startAt: Timestamp | Date;
  endAt: Timestamp | Date;
  schoolName: string;
  courseName: string;
  position: Position;
  hours: number;
  rate: number;
  rateUnit: RateUnit;
  amount: number;
}

export interface Invoice {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  /** Billing month as "YYYY-MM". */
  month: string;
  items: InvoiceItem[];
  total: number;
  /** Payment details as they stood when the invoice was sent. */
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  status: InvoiceStatus;
  submittedAt: Timestamp | Date;
  paidAt?: Timestamp | Date;
  paidBy?: string;
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  submitted: "已收到 Invoice",
  paid: "已出糧",
  superseded: "已被新 Invoice 取代",
};

/** Monthly cut-off: invoices sent on or before this day are paid that month. */
export const INVOICE_CUTOFF_DAY = 23;

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

// ---------- Invoicing ----------

function asDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate();
}

/** "YYYY-MM" key used to group invoices by billing month. */
export function monthKey(value: Timestamp | Date): string {
  const d = asDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Lessons a person may bill for: the admin confirmed them AND the lesson has
 * already finished. Lessons still to come are deliberately excluded — the
 * invoice button must stay unavailable until the work is done.
 */
export function billableLessons(
  reg: Registration,
  task: Task,
  now: Date = new Date(),
): Lesson[] {
  return lessonsFor(reg, task).filter(
    (lesson) =>
      lessonStatusFor(reg, lesson.id) === "confirmed" &&
      asDate(lesson.endAt).getTime() <= now.getTime(),
  );
}

/**
 * Split "陳南昌夫人小學_VR art" into school and course. Job titles in this
 * system are conventionally "<school>_<course>"; without the separator the
 * whole string is the school and the lesson label (if any) is the course.
 */
export function splitSchoolCourse(
  schoolName: string,
  lessonTitle?: string,
): { school: string; course: string } {
  const idx = schoolName.indexOf("_");
  if (idx > 0) {
    return {
      school: schoolName.slice(0, idx).trim(),
      course: schoolName.slice(idx + 1).trim() || (lessonTitle ?? ""),
    };
  }
  return { school: schoolName.trim(), course: lessonTitle ?? "" };
}

/** Pay for one lesson: hourly rates bill by duration, daily rates bill flat. */
export function lessonAmount(task: Task, lesson: Lesson, position: Position): number {
  const rate = rateFor(task, position);
  if (rateUnitFor(task) === "daily") return rate;
  const hours =
    (asDate(lesson.endAt).getTime() - asDate(lesson.startAt).getTime()) / 36e5;
  return Math.round(rate * hours * 100) / 100;
}

export function buildInvoiceItem(
  task: Task,
  lesson: Lesson,
  position: Position,
): InvoiceItem {
  const { school, course } = splitSchoolCourse(task.schoolName, lesson.title);
  const hours =
    (asDate(lesson.endAt).getTime() - asDate(lesson.startAt).getTime()) / 36e5;
  return {
    taskId: task.id,
    lessonId: lesson.id,
    startAt: lesson.startAt,
    endAt: lesson.endAt,
    schoolName: school,
    courseName: course,
    position,
    hours: Math.round(hours * 100) / 100,
    rate: rateFor(task, position),
    rateUnit: rateUnitFor(task),
    amount: lessonAmount(task, lesson, position),
  };
}

/** Stable key for "this lesson of this job", used to dedupe across invoices. */
export function itemKey(taskId: string, lessonId: string): string {
  return `${taskId}::${lessonId}`;
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
