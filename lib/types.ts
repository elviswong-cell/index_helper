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

export interface Task {
  id: string;
  schoolName: string;
  startAt: Timestamp | Date;
  endAt: Timestamp | Date;
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
