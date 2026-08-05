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
  hourlyRate: number;
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
  position: Position;
  status: RegistrationStatus;
  createdAt: Timestamp | Date;
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
