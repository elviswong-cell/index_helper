import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../firebase.js";
import {
  aggregateStatus,
  countsByLesson,
  findLesson,
  lessonIdsFor,
  lessonStatusMap,
} from "../domain.js";
import { jsonText, handleError } from "../serialize.js";
import type { Registration, RegistrationStatus, Task } from "../types.js";

const RegistrationStatusEnum = z.enum(["pending", "confirmed", "declined", "reserve"]);

async function loadTask(taskId: string): Promise<Task> {
  const snap = await db.collection("tasks").doc(taskId).get();
  if (!snap.exists) throw new Error(`Task ${taskId} not found.`);
  return { id: snap.id, ...(snap.data() as Omit<Task, "id">) } as Task;
}

async function loadRegistrationsForTask(taskId: string): Promise<Registration[]> {
  const snap = await db.collection("registrations").where("taskId", "==", taskId).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Registration, "id">) }) as Registration);
}

function formatLessonDay(lesson: { startAt: Timestamp | Date } | undefined): string {
  if (!lesson) return "此堂";
  const d = lesson.startAt instanceof Date ? lesson.startAt : lesson.startAt.toDate();
  return d.toLocaleDateString("zh-HK");
}

export function registerRegistrationTools(server: McpServer): void {
  const ListInputSchema = z
    .object({
      task_id: z.string().min(1).describe("List applicants for this task."),
      status: RegistrationStatusEnum.optional().describe("Filter to applications whose aggregate status matches (omit for all)."),
    })
    .strict();
  type ListInput = z.infer<typeof ListInputSchema>;

  server.registerTool(
    "helper_recruitment_list_registrations",
    {
      title: "List Registrations For Task",
      description: `List every applicant registered for one task, in application order, with per-lesson decision status.

Args: task_id (required), status (optional filter by aggregate status: pending/confirmed/declined/reserve).
Returns: {"count": number, "registrations": [{id, user_name, user_email, user_phone, position, status, lesson_statuses: {lessonId: status}, created_at}]}.

Use this before helper_recruitment_decide_registration to find the registration_id and see which lessons are still pending.`,
      inputSchema: ListInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: ListInput) => {
      try {
        const task = await loadTask(params.task_id);
        let regs = await loadRegistrationsForTask(params.task_id);
        if (params.status) regs = regs.filter((r) => r.status === params.status);
        regs.sort((a, b) => {
          const at = a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt?.toMillis?.() ?? 0;
          const bt = b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt?.toMillis?.() ?? 0;
          return at - bt;
        });

        const output = {
          count: regs.length,
          registrations: regs.map((r) => ({
            id: r.id,
            user_id: r.userId,
            user_name: r.userName,
            user_email: r.userEmail,
            user_phone: r.userPhone,
            position: r.position,
            status: r.status,
            lesson_statuses: lessonStatusMap(r, task),
            created_at: r.createdAt,
          })),
        };
        return {
          content: [{ type: "text" as const, text: jsonText(output) }],
          structuredContent: JSON.parse(jsonText(output)),
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  const DecideInputSchema = z
    .object({
      task_id: z.string().min(1),
      registration_id: z.string().min(1),
      status: RegistrationStatusEnum.optional().describe(
        "Shorthand: apply this one status to every lesson the applicant applied for. Provide this OR per_lesson_decisions, not both.",
      ),
      per_lesson_decisions: z
        .record(z.string(), RegistrationStatusEnum)
        .optional()
        .describe(
          "Map of lessonId -> status, to accept some dates and decline/reserve others. Keys must be lessons the applicant actually applied for (see helper_recruitment_list_registrations). Provide this OR status, not both.",
        ),
    })
    .strict();
  type DecideInput = z.infer<typeof DecideInputSchema>;

  server.registerTool(
    "helper_recruitment_decide_registration",
    {
      title: "Decide Registration",
      description: `Approve, decline, or reserve an applicant's registration — lesson by lesson, or all at once.

Capacity is enforced PER LESSON PER POSITION: confirming a lesson fails if that lesson's MT/TA slots (from the task's 'positions') are already filled by other confirmed applicants. The aggregate 'status' shown on the registration is then recomputed: any confirmed lesson -> "confirmed" (possibly partial), else any pending -> "pending", else any reserve -> "reserve", else "declined".

Args:
  - task_id, registration_id (required)
  - status ('pending'|'confirmed'|'declined'|'reserve'): apply to every lesson the applicant applied for
  - per_lesson_decisions ({lessonId: status}): apply different decisions per lesson — provide EXACTLY ONE of status or per_lesson_decisions

Returns: the updated registration {id, status, lesson_statuses}.

Note: this tool does NOT send the applicant a notification email (the app's admin UI does that as a separate step) — tell the admin to notify the applicant themselves if needed.

Error Handling:
  - Returns "Error: 「<date>」的MT/TA名額已滿，無法確認" if a lesson you're confirming has no room left.
  - Returns "Error: Registration <id> not found" or "Error: Task <id> not found" for bad ids.`,
      inputSchema: DecideInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params: DecideInput) => {
      try {
        if ((params.status !== undefined) === (params.per_lesson_decisions !== undefined)) {
          return handleError("Provide exactly one of 'status' or 'per_lesson_decisions'.");
        }
        const task = await loadTask(params.task_id);
        const regSnap = await db.collection("registrations").doc(params.registration_id).get();
        if (!regSnap.exists) return handleError(`Registration ${params.registration_id} not found.`);
        const registration = { id: regSnap.id, ...(regSnap.data() as Omit<Registration, "id">) } as Registration;
        if (registration.taskId !== params.task_id) {
          return handleError(`Registration ${params.registration_id} belongs to task ${registration.taskId}, not ${params.task_id}.`);
        }

        const applied = lessonIdsFor(registration, task);
        const decisions: Record<string, RegistrationStatus> =
          params.per_lesson_decisions ?? Object.fromEntries(applied.map((id) => [id, params.status!]));

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
          const others = (await loadRegistrationsForTask(task.id)).filter((r) => r.id !== registration.id);
          const counts = countsByLesson(task, others);
          const cap = task.positions[registration.position];
          for (const lessonId of newlyConfirmed) {
            const used = counts[lessonId]?.[registration.position] ?? 0;
            if (used >= cap) {
              const label = findLesson(task, lessonId)?.title || formatLessonDay(findLesson(task, lessonId));
              return handleError(`「${label}」的${registration.position.toUpperCase()}名額已滿，無法確認`);
            }
          }
        }

        const status = aggregateStatus(Object.values(next));
        const patch: Record<string, unknown> = { lessonStatuses: next, status };
        if (status === "confirmed" && registration.status !== "confirmed") {
          patch.confirmedAt = FieldValue.serverTimestamp();
        }
        await db.collection("registrations").doc(registration.id).update(patch);

        const output = { id: registration.id, status, lesson_statuses: next };
        return {
          content: [{ type: "text" as const, text: jsonText(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  const CancelInputSchema = z.object({ registration_id: z.string().min(1) }).strict();

  server.registerTool(
    "helper_recruitment_cancel_registration",
    {
      title: "Cancel Registration",
      description: `Permanently delete an applicant's registration (as if they withdrew their application).

Args: registration_id (required).
Returns: {"id": string, "deleted": true}.`,
      inputSchema: CancelInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ registration_id }: { registration_id: string }) => {
      try {
        await db.collection("registrations").doc(registration_id).delete();
        const output = { id: registration_id, deleted: true };
        return { content: [{ type: "text" as const, text: jsonText(output) }], structuredContent: output };
      } catch (error) {
        return handleError(error);
      }
    },
  );
}
