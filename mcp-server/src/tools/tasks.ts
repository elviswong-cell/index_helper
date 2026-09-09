import { randomUUID } from "node:crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db, actingAdminUid } from "../firebase.js";
import { capacityOf, lessonsOf, rateFor, rateUnitFor, taskSlots } from "../domain.js";
import { jsonText, handleError } from "../serialize.js";
import type { Lesson, Task, TaskStatus } from "../types.js";

const LessonInputSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "Stable id for this lesson. Auto-generated if omitted. When editing an " +
          "existing task, reuse the same id for a lesson you're keeping — " +
          "registrations reference lessons by id, so changing it orphans those references.",
      ),
    start_at: z
      .string()
      .datetime({ offset: true })
      .describe("Lesson start, ISO 8601 with UTC offset, e.g. '2026-09-25T09:00:00+08:00'."),
    end_at: z
      .string()
      .datetime({ offset: true })
      .describe("Lesson end, ISO 8601 with UTC offset."),
    title: z
      .string()
      .max(200)
      .optional()
      .describe("Optional label for this session, e.g. 'Workshop day 1'."),
    positions: z
      .object({
        mt: z.number().int().min(0).max(999).describe("MT slots for THIS lesson."),
        ta: z.number().int().min(0).max(999).describe("TA slots for THIS lesson."),
      })
      .strict()
      .optional()
      .describe(
        "Slots this lesson hires. Set one side to 0 for a lesson that only needs the other role. Defaults to the task-level 'positions'.",
      ),
  })
  .strict();

const PositionsSchema = z
  .object({
    mt: z.number().int().min(0).max(999).describe("MT (Lead Mentor) slots, per lesson."),
    ta: z.number().int().min(0).max(999).describe("TA (Teaching Assistant) slots, per lesson."),
  })
  .strict();

const RatesSchema = z
  .object({
    mt: z.number().min(0).describe("MT pay rate."),
    ta: z.number().min(0).describe("TA pay rate."),
  })
  .strict();

const TaskStatusEnum = z.enum(["open", "closed", "cancelled"]);

const TaskCreateInputSchema = z
  .object({
    school_name: z
      .string()
      .min(1)
      .max(200)
      .describe(
        "School/activity name. Convention: '<school>_<course>' (e.g. '陳南昌夫人小學_VR art') " +
          "so invoices can split it into school and course columns.",
      ),
    lessons: z
      .array(LessonInputSchema)
      .min(1)
      .describe("One or more sessions. Applicants pick which they can attend; the admin approves lesson by lesson."),
    positions: PositionsSchema.describe(
      "Default slot capacity, used by every lesson that doesn't set its own 'positions'.",
    ),
    rates: RatesSchema.optional().describe("Pay rate per position. Omit only for legacy-style tasks."),
    rate_unit: z
      .enum(["hourly", "daily"])
      .default("hourly")
      .describe("'hourly' bills rate × lesson duration; 'daily' bills the flat rate per lesson regardless of duration."),
    address: z.string().max(300).optional(),
    map_url: z.string().url().optional().describe("Google Maps link for the address."),
    deadline: z.string().datetime({ offset: true }).optional().describe("Application deadline, ISO 8601 with offset."),
    meet_url: z.string().url().optional().describe("Online meeting link, if any."),
    meet_at: z.string().datetime({ offset: true }).optional(),
    notes: z.string().max(5000).optional(),
    status: TaskStatusEnum.default("open"),
    admin_uid: z
      .string()
      .optional()
      .describe("Firebase Auth UID to record as the creator. Defaults to the ADMIN_UID environment variable."),
  })
  .strict();

type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>;

function toTimestamp(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

function lessonsToDoc(
  lessons: TaskCreateInput["lessons"],
  fallback: { mt: number; ta: number },
): Lesson[] {
  return lessons.map((l) => ({
    id: l.id ?? `lesson_${randomUUID().slice(0, 8)}`,
    startAt: toTimestamp(l.start_at),
    endAt: toTimestamp(l.end_at),
    positions: l.positions ?? fallback,
    ...(l.title ? { title: l.title } : {}),
  }));
}

function taskBoundsFrom(lessons: Lesson[]): { startAt: Timestamp; endAt: Timestamp } {
  const sorted = [...lessons].sort(
    (a, b) => (a.startAt as Timestamp).toMillis() - (b.startAt as Timestamp).toMillis(),
  );
  return {
    startAt: sorted[0]!.startAt as Timestamp,
    endAt: sorted.reduce(
      (latest, l) => ((l.endAt as Timestamp).toMillis() > latest.toMillis() ? (l.endAt as Timestamp) : latest),
      sorted[0]!.endAt as Timestamp,
    ),
  };
}

/** Summary view used in list results — full task detail is fetched via task_get. */
function taskSummary(task: Task) {
  const lessons = lessonsOf(task);
  return {
    id: task.id,
    school_name: task.schoolName,
    status: task.status,
    lesson_count: lessons.length,
    starts_at: task.startAt,
    ends_at: task.endAt,
    positions: task.positions,
    lesson_positions: lessons.map((l) => ({
      lesson_id: l.id,
      ...capacityOf(task, l),
    })),
    total_slots: taskSlots(task).length,
    rate_unit: rateUnitFor(task),
    mt_rate: rateFor(task, "mt"),
    ta_rate: rateFor(task, "ta"),
    deadline: task.deadline ?? null,
  };
}

export function registerTaskTools(server: McpServer): void {
  server.registerTool(
    "helper_recruitment_create_task",
    {
      title: "Create Task",
      description: `Create a new job posting (a "task") with one or more lessons applicants can sign up for.

Args: school_name, lessons[] (start_at/end_at/title/positions), positions {mt, ta}, rates {mt, ta}, rate_unit, address, map_url, deadline, meet_url, meet_at, notes, status, admin_uid.

Slots are per lesson: give a lesson its own 'positions' to hire an MT only, a TA only, or both. Lessons without one inherit the task-level 'positions'.

Returns: the created task's id plus the stored task document (JSON), with all timestamps as ISO strings.

Example: creating a single-session job -> lessons: [{start_at: "2026-09-25T09:00:00+08:00", end_at: "2026-09-25T12:00:00+08:00"}], positions: {mt: 0, ta: 3}.

Example: a course where only two dates need an external TA -> positions: {mt: 0, ta: 0} and give just those two lessons positions: {mt: 0, ta: 1}.

Error Handling:
  - Returns "Error: ..." if Firestore write fails or no admin UID is available (set ADMIN_UID env var or pass admin_uid).`,
      inputSchema: TaskCreateInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params: TaskCreateInput) => {
      try {
        const adminUid = actingAdminUid(params.admin_uid);
        const lessons = lessonsToDoc(params.lessons, params.positions);
        const { startAt, endAt } = taskBoundsFrom(lessons);

        const payload: Record<string, unknown> = {
          schoolName: params.school_name,
          lessons,
          startAt,
          endAt,
          positions: params.positions,
          rateUnit: params.rate_unit,
          status: params.status,
          createdBy: adminUid,
          createdAt: FieldValue.serverTimestamp(),
        };
        if (params.rates) payload.rates = params.rates;
        if (params.address) payload.address = params.address;
        if (params.map_url) payload.mapUrl = params.map_url;
        if (params.deadline) payload.deadline = toTimestamp(params.deadline);
        if (params.meet_url) payload.meetUrl = params.meet_url;
        if (params.meet_at) payload.meetAt = toTimestamp(params.meet_at);
        if (params.notes) payload.notes = params.notes;

        const ref = await db.collection("tasks").add(payload);
        const snap = await ref.get();
        const output = { id: ref.id, ...(snap.data() as Omit<Task, "id">) };

        return {
          content: [{ type: "text" as const, text: jsonText(output) }],
          structuredContent: { task: JSON.parse(jsonText(output)) },
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  const TaskUpdateInputSchema = z
    .object({
      task_id: z.string().min(1).describe("The task's Firestore document id."),
      school_name: z.string().min(1).max(200).optional(),
      lessons: z
        .array(LessonInputSchema)
        .min(1)
        .optional()
        .describe("Full replacement of the lesson list if provided (not a partial merge). Reuse existing lesson ids to keep registrations pointed at the right sessions."),
      positions: PositionsSchema.optional(),
      rates: RatesSchema.optional(),
      rate_unit: z.enum(["hourly", "daily"]).optional(),
      address: z.string().max(300).optional(),
      map_url: z.string().url().optional(),
      deadline: z.string().datetime({ offset: true }).optional(),
      meet_url: z.string().url().optional(),
      meet_at: z.string().datetime({ offset: true }).optional(),
      notes: z.string().max(5000).optional(),
      status: TaskStatusEnum.optional(),
    })
    .strict();
  type TaskUpdateInput = z.infer<typeof TaskUpdateInputSchema>;

  server.registerTool(
    "helper_recruitment_update_task",
    {
      title: "Update Task",
      description: `Update fields on an existing task. Only fields you provide are changed — everything else is left as-is.

Passing 'lessons' REPLACES the entire lesson list (not a merge); reuse each lesson's existing 'id' for sessions you're keeping, or existing registrations will lose track of which session they applied for.

Args: task_id (required), plus any of: school_name, lessons[], positions, rates, rate_unit, address, map_url, deadline, meet_url, meet_at, notes, status.

Returns: the updated task document (JSON).

Error Handling:
  - Returns "Error: Task <id> not found" if the id doesn't exist.`,
      inputSchema: TaskUpdateInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: TaskUpdateInput) => {
      try {
        const ref = db.collection("tasks").doc(params.task_id);
        const existing = await ref.get();
        if (!existing.exists) return handleError(`Task ${params.task_id} not found.`);

        const patch: Record<string, unknown> = {};
        if (params.school_name !== undefined) patch.schoolName = params.school_name;
        if (params.positions !== undefined) patch.positions = params.positions;
        if (params.rates !== undefined) patch.rates = params.rates;
        if (params.rate_unit !== undefined) patch.rateUnit = params.rate_unit;
        if (params.address !== undefined) patch.address = params.address;
        if (params.map_url !== undefined) patch.mapUrl = params.map_url;
        if (params.deadline !== undefined) patch.deadline = toTimestamp(params.deadline);
        if (params.meet_url !== undefined) patch.meetUrl = params.meet_url;
        if (params.meet_at !== undefined) patch.meetAt = toTimestamp(params.meet_at);
        if (params.notes !== undefined) patch.notes = params.notes;
        if (params.status !== undefined) patch.status = params.status;
        if (params.lessons !== undefined) {
          // Lessons that don't carry their own slots inherit the new
          // task-level cap when one was sent, else the stored one.
          const fallback =
            params.positions ??
            (existing.data() as Omit<Task, "id">).positions ?? { mt: 0, ta: 0 };
          const lessons = lessonsToDoc(params.lessons, fallback);
          const { startAt, endAt } = taskBoundsFrom(lessons);
          patch.lessons = lessons;
          patch.startAt = startAt;
          patch.endAt = endAt;
        }

        await ref.update(patch);
        const snap = await ref.get();
        const output = { id: ref.id, ...(snap.data() as Omit<Task, "id">) };

        return {
          content: [{ type: "text" as const, text: jsonText(output) }],
          structuredContent: { task: JSON.parse(jsonText(output)) },
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  const TaskStatusChangeSchema = z.object({ task_id: z.string().min(1) }).strict();

  server.registerTool(
    "helper_recruitment_cancel_task",
    {
      title: "Cancel Task",
      description: `Set a task's status to 'cancelled'. Existing registrations are left untouched (cancelling doesn't remove applicants) but the task stops accepting new applications.

Args: task_id (required).
Returns: {"id": string, "status": "cancelled"}.`,
      inputSchema: TaskStatusChangeSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ task_id }: { task_id: string }) => {
      try {
        const ref = db.collection("tasks").doc(task_id);
        const existing = await ref.get();
        if (!existing.exists) return handleError(`Task ${task_id} not found.`);
        await ref.update({ status: "cancelled" satisfies TaskStatus });
        const output = { id: task_id, status: "cancelled" };
        return { content: [{ type: "text" as const, text: jsonText(output) }], structuredContent: output };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.registerTool(
    "helper_recruitment_reopen_task",
    {
      title: "Reopen Task",
      description: `Set a task's status back to 'open' so it accepts applications again.

Args: task_id (required).
Returns: {"id": string, "status": "open"}.`,
      inputSchema: TaskStatusChangeSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ task_id }: { task_id: string }) => {
      try {
        const ref = db.collection("tasks").doc(task_id);
        const existing = await ref.get();
        if (!existing.exists) return handleError(`Task ${task_id} not found.`);
        await ref.update({ status: "open" satisfies TaskStatus });
        const output = { id: task_id, status: "open" };
        return { content: [{ type: "text" as const, text: jsonText(output) }], structuredContent: output };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.registerTool(
    "helper_recruitment_delete_task",
    {
      title: "Delete Task",
      description: `Permanently delete a task AND every registration for it. Prefer helper_recruitment_cancel_task unless you specifically need to remove the record (e.g. it was created by mistake) — cancelling keeps the applicants' history, deleting throws it away.

Args: task_id (required).
Returns: {"id": string, "deleted": true, "registrations_deleted": number}.`,
      inputSchema: TaskStatusChangeSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ task_id }: { task_id: string }) => {
      try {
        // Registrations go first: a job deleted with its applications left
        // behind leaves them pointing at nothing, and they keep showing up in
        // the admin's "waiting for review" count forever.
        const regs = await db
          .collection("registrations")
          .where("taskId", "==", task_id)
          .get();
        await Promise.all(regs.docs.map((d) => d.ref.delete()));
        await db.collection("tasks").doc(task_id).delete();
        const output = {
          id: task_id,
          deleted: true,
          registrations_deleted: regs.size,
        };
        return { content: [{ type: "text" as const, text: jsonText(output) }], structuredContent: output };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.registerTool(
    "helper_recruitment_get_task",
    {
      title: "Get Task",
      description: `Fetch one task by id, with its full lesson list and computed rate fields.

Args: task_id (required).
Returns: the task document (JSON) or "Error: Task <id> not found".`,
      inputSchema: TaskStatusChangeSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ task_id }: { task_id: string }) => {
      try {
        const snap = await db.collection("tasks").doc(task_id).get();
        if (!snap.exists) return handleError(`Task ${task_id} not found.`);
        const task = { id: snap.id, ...(snap.data() as Omit<Task, "id">) } as Task;
        const output = {
          ...task,
          lessons: lessonsOf(task),
          mt_rate: rateFor(task, "mt"),
          ta_rate: rateFor(task, "ta"),
          rate_unit: rateUnitFor(task),
        };
        return {
          content: [{ type: "text" as const, text: jsonText(output) }],
          structuredContent: { task: JSON.parse(jsonText(output)) },
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  const TaskListInputSchema = z
    .object({
      status: z
        .enum(["open", "closed", "cancelled", "all"])
        .default("all")
        .describe("Filter by task status, or 'all' for every status."),
      limit: z.number().int().min(1).max(200).default(50),
    })
    .strict();
  type TaskListInput = z.infer<typeof TaskListInputSchema>;

  server.registerTool(
    "helper_recruitment_list_tasks",
    {
      title: "List Tasks",
      description: `List tasks, newest first, as compact summaries (use helper_recruitment_get_task for full detail on one).

Args: status ('open' | 'closed' | 'cancelled' | 'all', default 'all'), limit (1-200, default 50).
Returns: {"count": number, "tasks": [{id, school_name, status, lesson_count, starts_at, ends_at, positions, lesson_positions: [{lesson_id, mt, ta}], total_slots, rate_unit, mt_rate, ta_rate, deadline}]}.`,
      inputSchema: TaskListInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: TaskListInput) => {
      try {
        let q = db.collection("tasks").orderBy("startAt", "desc").limit(params.limit) as FirebaseFirestore.Query;
        if (params.status !== "all") q = db.collection("tasks").where("status", "==", params.status).orderBy("startAt", "desc").limit(params.limit);
        const snap = await q.get();
        const tasks = snap.docs.map((d) => taskSummary({ id: d.id, ...(d.data() as Omit<Task, "id">) } as Task));
        const output = { count: tasks.length, tasks };
        return {
          content: [{ type: "text" as const, text: jsonText(output) }],
          structuredContent: JSON.parse(jsonText(output)),
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );
}
