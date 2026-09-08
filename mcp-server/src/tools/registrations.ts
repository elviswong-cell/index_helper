import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../firebase.js";
import {
  aggregateStatus,
  appliedSlots,
  capacityFor,
  countsByLesson,
  findLesson,
  lessonIdsFor,
  lessonStatusMap,
  slotKey,
  slotStatusFor,
  slotStatusMap,
} from "../domain.js";
import { jsonText, handleError } from "../serialize.js";
import type { Registration, RegistrationStatus, Slot, Task } from "../types.js";

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
Returns: {"count": number, "registrations": [{id, user_name, user_email, user_phone, position, status, slots: [{lesson_id, position, slot_key, status}], lesson_statuses: {lessonId: status}, created_at}]}.

Use this before helper_recruitment_decide_registration to find the registration_id, the slot_key of each lesson+role, and which are still pending.`,
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
            slots: appliedSlots(r, task).map((slot) => ({
              lesson_id: slot.lessonId,
              position: slot.position,
              slot_key: slotKey(slot.lessonId, slot.position),
              status: slotStatusFor(r, slot.lessonId, slot.position),
            })),
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
          "Map of lessonId -> status, applied to EVERY role the applicant asked for on that lesson. Use per_slot_decisions to decide MT and TA separately. Provide exactly one of status / per_lesson_decisions / per_slot_decisions.",
        ),
      per_slot_decisions: z
        .record(z.string(), RegistrationStatusEnum)
        .optional()
        .describe(
          "Map of '<lessonId>::<position>' -> status (the slot_key returned by helper_recruitment_list_registrations), to accept a lesson as TA but not as MT. Provide exactly one of status / per_lesson_decisions / per_slot_decisions.",
        ),
    })
    .strict();
  type DecideInput = z.infer<typeof DecideInputSchema>;

  server.registerTool(
    "helper_recruitment_decide_registration",
    {
      title: "Decide Registration",
      description: `Approve, decline, or reserve an applicant's registration — slot by slot (a slot is one position on one lesson), lesson by lesson, or all at once.

Applicants apply per slot: they can offer to cover 10-06 as TA and 10-12 as MT in the same job, so decisions are recorded per slot too.

Capacity is enforced PER LESSON PER POSITION using that lesson's own MT/TA slots (lesson.positions, falling back to the task's 'positions'). Confirming fails if the slot is already filled by other confirmed applicants. The aggregate 'status' is then recomputed: any confirmed slot -> "confirmed" (possibly partial), else any pending -> "pending", else any reserve -> "reserve", else "declined".

Args:
  - task_id, registration_id (required)
  - status ('pending'|'confirmed'|'declined'|'reserve'): apply to every slot the applicant applied for
  - per_lesson_decisions ({lessonId: status}): one decision per lesson, applied to every role they asked for on it
  - per_slot_decisions ({'<lessonId>::<position>': status}): decide MT and TA separately — slot_key comes from helper_recruitment_list_registrations
  Provide EXACTLY ONE of status / per_lesson_decisions / per_slot_decisions.

Returns: the updated registration {id, status, slot_statuses, lesson_statuses}.

Note: this tool does NOT send the applicant a notification email (the app's admin UI does that as a separate step) — tell the admin to notify the applicant themselves if needed.

Error Handling:
  - Returns "Error: 「<date>」的MT/TA名額已滿，無法確認" if a lesson you're confirming has no room left.
  - Returns "Error: Registration <id> not found" or "Error: Task <id> not found" for bad ids.`,
      inputSchema: DecideInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params: DecideInput) => {
      try {
        const given = [
          params.status,
          params.per_lesson_decisions,
          params.per_slot_decisions,
        ].filter((v) => v !== undefined).length;
        if (given !== 1) {
          return handleError(
            "Provide exactly one of 'status', 'per_lesson_decisions' or 'per_slot_decisions'.",
          );
        }
        const task = await loadTask(params.task_id);
        const regSnap = await db.collection("registrations").doc(params.registration_id).get();
        if (!regSnap.exists) return handleError(`Registration ${params.registration_id} not found.`);
        const registration = { id: regSnap.id, ...(regSnap.data() as Omit<Registration, "id">) } as Registration;
        if (registration.taskId !== params.task_id) {
          return handleError(`Registration ${params.registration_id} belongs to task ${registration.taskId}, not ${params.task_id}.`);
        }

        const applied = appliedSlots(registration, task);

        // Normalize every input shape down to a slotKey -> status map.
        const decisions: Record<string, RegistrationStatus> = {};
        if (params.per_slot_decisions) {
          Object.assign(decisions, params.per_slot_decisions);
        } else if (params.per_lesson_decisions) {
          for (const [lessonId, st] of Object.entries(params.per_lesson_decisions)) {
            for (const slot of applied.filter((s) => s.lessonId === lessonId)) {
              decisions[slotKey(slot.lessonId, slot.position)] = st;
            }
          }
        } else {
          for (const slot of applied) {
            decisions[slotKey(slot.lessonId, slot.position)] = params.status!;
          }
        }

        const current = slotStatusMap(registration, task);
        const next: Record<string, RegistrationStatus> = { ...current };
        const newlyConfirmed: Slot[] = [];
        for (const [key, status] of Object.entries(decisions)) {
          const slot = applied.find((s) => slotKey(s.lessonId, s.position) === key);
          if (!slot) continue;
          if (current[key] === status) continue;
          next[key] = status;
          if (status === "confirmed") newlyConfirmed.push(slot);
        }

        if (newlyConfirmed.length > 0) {
          const others = (await loadRegistrationsForTask(task.id)).filter((r) => r.id !== registration.id);
          const counts = countsByLesson(task, others);
          for (const slot of newlyConfirmed) {
            const cap = capacityFor(task, slot.lessonId, slot.position);
            const used = counts[slot.lessonId]?.[slot.position] ?? 0;
            if (used >= cap) {
              const lesson = findLesson(task, slot.lessonId);
              const label = lesson?.title || formatLessonDay(lesson);
              return handleError(`「${label}」的${slot.position.toUpperCase()}名額已滿，無法確認`);
            }
          }
        }

        const status = aggregateStatus(Object.values(next));
        // Mirror the decisions back onto the per-lesson shape for legacy readers.
        const lessonStatuses: Record<string, RegistrationStatus> = {};
        for (const lessonId of lessonIdsFor(registration, task)) {
          lessonStatuses[lessonId] = aggregateStatus(
            applied
              .filter((s) => s.lessonId === lessonId)
              .map((s) => next[slotKey(s.lessonId, s.position)]),
          );
        }

        const patch: Record<string, unknown> = {
          slotStatuses: next,
          lessonStatuses,
          status,
        };
        if (status === "confirmed" && registration.status !== "confirmed") {
          patch.confirmedAt = FieldValue.serverTimestamp();
        }
        await db.collection("registrations").doc(registration.id).update(patch);

        const output = {
          id: registration.id,
          status,
          slot_statuses: next,
          lesson_statuses: lessonStatuses,
        };
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
