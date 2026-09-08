import type { Timestamp } from "firebase-admin/firestore";

/**
 * Data model mirrored from the main app's lib/types.ts, adapted to run
 * against the Firebase Admin SDK's Timestamp type instead of the client
 * SDK's. Keep this in sync with the app if that file's shape changes.
 */

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

export interface Lesson {
  id: string;
  startAt: Timestamp | Date;
  endAt: Timestamp | Date;
  title?: string;
  /** Slots this lesson hires. Missing on lessons predating per-lesson capacity. */
  positions?: { mt: number; ta: number };
}

/** One hire: a position on a particular lesson. */
export interface Slot {
  lessonId: string;
  position: Position;
}

export interface Task {
  id: string;
  schoolName: string;
  startAt: Timestamp | Date;
  endAt: Timestamp | Date;
  lessons?: Lesson[];
  positions: { mt: number; ta: number };
  rates?: { mt: number; ta: number };
  rateUnit?: RateUnit;
  hourlyRate?: number;
  address?: string;
  mapUrl?: string;
  deadline?: Timestamp | Date;
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
  /** Primary role; read `slots` where the role per lesson matters. */
  position: Position;
  /** Lesson + position pairs applied for. Missing on legacy documents. */
  slots?: Slot[];
  /** Per-slot decision, keyed by `slotKey()`. Falls back to `lessonStatuses`. */
  slotStatuses?: Record<string, RegistrationStatus>;
  lessonIds?: string[];
  lessonStatuses?: Record<string, RegistrationStatus>;
  status: RegistrationStatus;
  createdAt: Timestamp | Date;
  confirmedAt?: Timestamp | Date;
}

export interface UserProfile {
  uid: string;
  phone?: string;
  displayName?: string;
  email?: string;
  scrcUrl?: string;
  scrcUploadedAt?: Timestamp | Date;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
  updatedAt?: Timestamp | Date;
}

export type InvoiceStatus = "submitted" | "paid" | "superseded";

export interface InvoiceItem {
  taskId: string;
  lessonId: string;
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
  month: string;
  items: InvoiceItem[];
  total: number;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  status: InvoiceStatus;
  submittedAt: Timestamp | Date;
  paidAt?: Timestamp | Date;
  paidBy?: string;
}
