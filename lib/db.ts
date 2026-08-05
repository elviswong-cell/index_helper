import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import { setDoc } from "firebase/firestore";
import type {
  Task,
  Registration,
  Position,
  RegistrationStatus,
  TaskStatus,
  UserProfile,
} from "./types";

// ---------- Admin UIDs (simple gating) ----------
const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isAdminUid(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return ADMIN_UIDS.includes(uid);
}

// ---------- Tasks ----------
export async function createTask(
  data: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus },
  adminUid: string,
): Promise<string> {
  if (!db) throw new Error("Firestore not initialized");
  const payload = {
    ...data,
    status: data.status ?? ("open" as TaskStatus),
    createdBy: adminUid,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "tasks"), payload);
  return ref.id;
}

export async function updateTask(
  taskId: string,
  patch: Partial<Omit<Task, "id" | "createdAt" | "createdBy">>,
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  const ref = doc(db, "tasks", taskId);
  await updateDoc(ref, patch as Record<string, unknown>);
}

export async function cancelTask(taskId: string): Promise<void> {
  return updateTask(taskId, { status: "cancelled" });
}

export async function reopenTask(taskId: string): Promise<void> {
  return updateTask(taskId, { status: "open" });
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, "tasks", taskId));
}

export async function getTask(taskId: string): Promise<Task | null> {
  if (!db) throw new Error("Firestore not initialized");
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Task, "id">) };
}

export async function listOpenTasks(): Promise<Task[]> {
  if (!db) throw new Error("Firestore not initialized");
  const constraints: QueryConstraint[] = [
    where("status", "==", "open"),
    orderBy("startAt", "asc"),
  ];
  const q = query(collection(db, "tasks"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) }));
}

export async function listAllTasks(): Promise<Task[]> {
  if (!db) throw new Error("Firestore not initialized");
  const q = query(collection(db, "tasks"), orderBy("startAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) }));
}

// ---------- Registrations ----------
export async function registerForTask(args: {
  taskId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  position: Position;
}): Promise<{ id: string; status: RegistrationStatus }> {
  if (!db) throw new Error("Firestore not initialized");

  if (!args.userPhone) {
    throw new Error("請先在「設定」填寫電話號碼後才能報名");
  }

  // Count existing confirmed registrations for this task + position
  const existingQ = query(
    collection(db, "registrations"),
    where("taskId", "==", args.taskId),
    where("position", "==", args.position),
  );
  const existing = await getDocs(existingQ);
  const confirmed = existing.docs.filter(
    (d) => (d.data() as Registration).status === "confirmed",
  );

  const task = await getTask(args.taskId);
  if (!task) throw new Error("Task not found");

  const cap = task.positions[args.position];
  const status: RegistrationStatus =
    confirmed.length < cap ? "confirmed" : "waitlist";

  // Prevent duplicate registration by same user for same task
  const dupQ = query(
    collection(db, "registrations"),
    where("taskId", "==", args.taskId),
    where("userId", "==", args.userId),
  );
  const dup = await getDocs(dupQ);
  if (!dup.empty) {
    throw new Error("你已經報名過這個任務");
  }

  const ref = await addDoc(collection(db, "registrations"), {
    taskId: args.taskId,
    userId: args.userId,
    userEmail: args.userEmail,
    userName: args.userName,
    userPhone: args.userPhone,
    position: args.position,
    status,
    createdAt: serverTimestamp(),
  });

  return { id: ref.id, status };
}

export async function cancelRegistration(registrationId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, "registrations", registrationId));
}

export async function listRegistrationsForUser(
  userId: string,
): Promise<Registration[]> {
  if (!db) throw new Error("Firestore not initialized");
  const q = query(
    collection(db, "registrations"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<Registration, "id">) }),
  );
}

export async function listRegistrationsForTask(
  taskId: string,
): Promise<Registration[]> {
  if (!db) throw new Error("Firestore not initialized");
  const q = query(
    collection(db, "registrations"),
    where("taskId", "==", taskId),
    orderBy("createdAt", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<Registration, "id">) }),
  );
}

// ---------- Counts helper ----------
export async function countConfirmed(
  taskId: string,
  position: Position,
): Promise<number> {
  const regs = await listRegistrationsForTask(taskId);
  return regs.filter((r) => r.position === position && r.status === "confirmed")
    .length;
}

// ---------- Timestamp helpers ----------
export function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

// ---------- User profile (phone number) ----------
export async function getUserProfile(
  uid: string,
): Promise<UserProfile | null> {
  if (!db) throw new Error("Firestore not initialized");
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...(snap.data() as Omit<UserProfile, "uid">) };
}

export async function saveUserProfile(
  uid: string,
  data: { phone: string; displayName?: string; email?: string },
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  await setDoc(
    doc(db, "users", uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
