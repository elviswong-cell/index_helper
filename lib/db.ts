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
  itemKey,
  lessonIdsFor,
  lessonStatusMap,
  lessonsOf,
  missingProfileFields,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
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

  // SCRC and payment details must be on file before anyone works a job.
  const profile = await getUserProfile(args.userId);
  if (missingProfileFields(profile).length > 0) {
    throw new Error("請先在「設定」完成個人資料（電話、SCRC、銀行資料）後才能報名");
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
  data: Partial<Omit<UserProfile, "uid" | "updatedAt">>,
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  await setDoc(
    doc(db, "users", uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Every registered tutor. Admin-only in practice — see Firestore rules. */
export async function listUserProfiles(): Promise<UserProfile[]> {
  if (!db) throw new Error("Firestore not initialized");
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }));
}

/** Clears a tutor's stored data. The Firebase Auth login itself is untouched. */
export async function deleteUserProfile(uid: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, "users", uid));
}

export async function listAllRegistrations(): Promise<Registration[]> {
  if (!db) throw new Error("Firestore not initialized");
  const snap = await getDocs(collection(db, "registrations"));
  return snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<Registration, "id">) }),
  );
}

// ---------- Invoices ----------

/**
 * Records an invoice the freelancer just sent. House rule is one invoice per
 * person per month, so any earlier invoice for the same month is marked
 * superseded rather than deleted — the paper trail stays intact.
 */
export async function submitInvoice(args: {
  userId: string;
  userName: string;
  userEmail: string;
  month: string;
  items: InvoiceItem[];
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
}): Promise<string> {
  if (!db) throw new Error("Firestore not initialized");
  if (args.items.length === 0) throw new Error("請至少選擇一堂已完成的課堂");

  const previous = (await listInvoicesForUser(args.userId)).filter(
    (inv) => inv.month === args.month && inv.status !== "superseded",
  );

  const total =
    Math.round(args.items.reduce((sum, i) => sum + i.amount, 0) * 100) / 100;

  const ref = await addDoc(collection(db, "invoices"), {
    ...args,
    total,
    status: "submitted" as InvoiceStatus,
    submittedAt: serverTimestamp(),
  });

  for (const inv of previous) {
    await updateDoc(doc(db, "invoices", inv.id), { status: "superseded" });
  }

  return ref.id;
}

export async function listInvoicesForUser(userId: string): Promise<Invoice[]> {
  if (!db) throw new Error("Firestore not initialized");
  const q = query(collection(db, "invoices"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return sortInvoices(
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, "id">) })),
  );
}

export async function listAllInvoices(): Promise<Invoice[]> {
  if (!db) throw new Error("Firestore not initialized");
  const snap = await getDocs(collection(db, "invoices"));
  return sortInvoices(
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, "id">) })),
  );
}

/** Newest first. Sorted client-side so no composite index is needed. */
function sortInvoices(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
    const at = toDate(a.submittedAt)?.getTime() ?? 0;
    const bt = toDate(b.submittedAt)?.getTime() ?? 0;
    return bt - at;
  });
}

export async function markInvoicePaid(
  invoiceId: string,
  adminUid: string,
): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, "invoices", invoiceId), {
    status: "paid" as InvoiceStatus,
    paidAt: serverTimestamp(),
    paidBy: adminUid,
  });
}

export async function markInvoiceUnpaid(invoiceId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  await updateDoc(doc(db, "invoices", invoiceId), {
    status: "submitted" as InvoiceStatus,
  });
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, "invoices", invoiceId));
}

/** Lesson keys already billed on a live (non-superseded) invoice. */
export function invoicedKeys(invoices: Invoice[]): Set<string> {
  const keys = new Set<string>();
  for (const inv of invoices) {
    if (inv.status === "superseded") continue;
    for (const item of inv.items) keys.add(itemKey(item.taskId, item.lessonId));
  }
  return keys;
}
