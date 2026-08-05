import type { Timestamp } from "firebase/firestore";

export type Position = "ta" | "mt";

export type TaskStatus = "open" | "closed" | "cancelled";

export type RegistrationStatus = "confirmed" | "waitlist";

export interface Task {
  id: string;
  schoolName: string;
  startAt: Timestamp | Date;
  endAt: Timestamp | Date;
  positions: {
    ta: number;
    mt: number;
  };
  /** Per-position hourly rate (HK$). */
  rates?: {
    ta: number;
    mt: number;
  };
  /** Legacy single rate — kept so older documents still render. */
  hourlyRate?: number;
  /** School / venue address. */
  address?: string;
  /** Optional Google Maps link, set from the admin backend. */
  mapUrl?: string;
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
  status: RegistrationStatus;
  createdAt: Timestamp | Date;
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
  ta: "TA 助教",
  mt: "MT 主導師",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: "開放報名",
  closed: "截止報名",
  cancelled: "已取消",
};

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  confirmed: "已確認",
  waitlist: "後備",
};

/** Hourly rate for a position, falling back to the legacy single rate. */
export function rateFor(task: Task, position: Position): number {
  return task.rates?.[position] ?? task.hourlyRate ?? 0;
}
