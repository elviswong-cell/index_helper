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
  setDoc,
  Timestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  aggregateStatus,
  countsByLesson,
  findLesson,
  lessonIdsFor,
  lessonStatusMap,
  lessonsOf,
  type Task,
  type Registration,
  type Position,
  type RegistrationStatus,
  type TaskStatus,
  type UserProfile,
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
// All new registrations start as "pending" (awaiting admin review).
// Admin manually moves them to confirmed / declined / reserve.
export async function registerForTask(args: {
  taskId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  position: Position;
  /** Lessons the applicant can attend. Must be a non-empty subset of the task's lessons. */
  lessonIds: string[];
}): Promise<{ id: string; status: RegistrationStatus }> {
  if (!db) throw new Error("Firestore not initialized");

  if (!args.userPhone) {
    throw new Error("請先在「設定」填寫電話號碼後才能報名");
  }

  const task = await getTask(args.taskId);
  if (!task) throw new Error("找不到此工作");

  const deadline = toDate(task.deadline);
  if (deadline && new Date() > deadline) {
    throw new Error("已過報名截止時間");
  }

  const validIds = lessonsOf(task).map((l) => l.id);
  const lessonIds = validIds.filter((id) => args.lessonIds.includes(id));
  if (lessonIds.length === 0) {
    throw new Error("請至少選擇一堂課");
  }

  const dupQ = query(
    collection(db, "registrations"),
    where("taskId", "==", args.taskId),
    where("userId", "==", args.userId),
  );
  const dup = await getDocs(dupQ);
  if (!dup.empty) {
    throw new Error("你已經報名過這個工作");
  }

  const status: RegistrationStatus = "pending";
  const lessonStatuses: Record<string, RegistrationStatus> = {};
  for (const id of lessonIds) lessonStatuses[id] = "pending";

  const ref = await addDoc(collection(db, "registrations"), {
    taskId: args.taskId,
    userId: args.userId,
    userEmail: args.userEmail,
    userName: args.userName,
    userPhone: args.userPhone,
    position: args.position,
    lessonIds,
    lessonStatuses,
    status,
    createdAt: serverTimestamp(),
  });

  return { id: ref.id, status };
}

/**
 * Admin decides an application lesson by lesson — accept some dates,
 * decline others. `decisions` is a lessonId -> status patch that gets merged
 * onto whatever is already stored; the aggregate `status` is recomputed.
 *
 * Capacity is enforced per lesson (each lesson has its own MT/TA slots).
 * Sending the notification email is a separate step — call sendStatusEmail()
 * (in lib/mail.ts) with the returned registration after this succeeds.
 */
export async function decideRegistration(
  registration: Registration,
  task: Task,
  decisions: Record<string, RegistrationStatus>,
): Promise<Registration> {
  if (!db) throw new Error("Firestore not initialized");

  const applied = lessonIdsFor(registration, task);
  const current = lessonStatusMap(registration, task);
  const next: Record<string, RegistrationStatus> = { ...current };

  const newlyConfirmed: string[] = [];
  for (const [lessonId, status] of Object.entries(decisions)) {
    if (!applied.includes(lessonId)) continue;
    if (current[lessonId] === status) continue;
    next[lessonId] = status;
    if (status === "confirmed") newlyConfirmed.push(lessonId);
  }

  if (newlyConfirmed.length > 0) {
    const others = (await listRegistrationsForTask(task.id)).filter(
      (r) => r.id !== registration.id,
    );
    const counts = countsByLesson(task, others);
    const cap = task.positions[registration.position];
    for (const lessonId of newlyConfirmed) {
      const used = counts[lessonId]?.[registration.position] ?? 0;
      if (used >= cap) {
        const lesson = findLesson(task, lessonId);
        const label = lesson?.title || formatLessonDay(lesson);
        throw new Error(
          `「${label}」的${registration.position.toUpperCase()}名額已滿，無法確認`,
        );
      }
    }
  }

  const status = aggregateStatus(Object.values(next));
  const patch: Record<string, unknown> = { lessonStatuses: next, status };
  if (status === "confirmed" && registration.status !== "confirmed") {
    patch.confirmedAt = serverTimestamp();
  }
  await updateDoc(doc(db, "registrations", registration.id), patch);

  return { ...registration, lessonStatuses: next, status };
}

/** Apply one decision to every lesson the applicant signed up for. */
export async function decideAllLessons(
  registration: Registration,
  task: Task,
  status: RegistrationStatus,
): Promise<Registration> {
  const decisions: Record<string, RegistrationStatus> = {};
  for (const id of lessonIdsFor(registration, task)) decisions[id] = status;
  return decideRegistration(registration, task, decisions);
}

function formatLessonDay(lesson: { startAt: Timestamp | Date } | undefined): string {
  const d = lesson ? toDate(lesson.startAt) : null;
  return d ? d.toLocaleDateString("zh-HK") : "此堂";
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
