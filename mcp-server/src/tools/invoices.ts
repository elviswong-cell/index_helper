import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db, actingAdminUid } from "../firebase.js";
import { jsonText, handleError } from "../serialize.js";
import type { Invoice, InvoiceStatus } from "../types.js";

const InvoiceStatusEnum = z.enum(["submitted", "paid", "superseded"]);

async function loadInvoices(): Promise<Invoice[]> {
  const snap = await db.collection("invoices").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, "id">) }) as Invoice);
}

function sortByNewest(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
    const at = a.submittedAt instanceof Date ? a.submittedAt.getTime() : a.submittedAt?.toMillis?.() ?? 0;
    const bt = b.submittedAt instanceof Date ? b.submittedAt.getTime() : b.submittedAt?.toMillis?.() ?? 0;
    return bt - at;
  });
}

export function registerInvoiceTools(server: McpServer): void {
  const ListInputSchema = z
    .object({
      status: InvoiceStatusEnum.optional().describe("Filter by status. Omit for all statuses."),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional().describe("Filter to one billing month, format 'YYYY-MM'."),
      user_id: z.string().optional().describe("Filter to one tutor's invoices by their Firebase Auth UID."),
      limit: z.number().int().min(1).max(200).default(50),
    })
    .strict();
  type ListInput = z.infer<typeof ListInputSchema>;

  server.registerTool(
    "helper_recruitment_list_invoices",
    {
      title: "List Invoices",
      description: `List invoices (the /admin/invoices database), newest first, optionally filtered by status, billing month, and/or tutor.

House rule: one invoice per tutor per month. Submitting a new one for a month that already has one marks the earlier invoice 'superseded' rather than deleting it, so the paper trail stays intact — expect to see superseded rows for tutors who re-submitted.

Args: status ('submitted'|'paid'|'superseded', optional), month (optional 'YYYY-MM'), user_id (optional), limit (1-200, default 50).
Returns: {"count": number, "invoices": [{id, user_name, user_email, month, total, item_count, status, submitted_at, paid_at}]}.`,
      inputSchema: ListInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: ListInput) => {
      try {
        let invoices = await loadInvoices();
        if (params.status) invoices = invoices.filter((i) => i.status === params.status);
        if (params.month) invoices = invoices.filter((i) => i.month === params.month);
        if (params.user_id) invoices = invoices.filter((i) => i.userId === params.user_id);
        invoices = sortByNewest(invoices).slice(0, params.limit);

        const output = {
          count: invoices.length,
          invoices: invoices.map((i) => ({
            id: i.id,
            user_id: i.userId,
            user_name: i.userName,
            user_email: i.userEmail,
            month: i.month,
            total: i.total,
            item_count: i.items.length,
            status: i.status,
            submitted_at: i.submittedAt,
            paid_at: i.paidAt ?? null,
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

  const GetInputSchema = z.object({ invoice_id: z.string().min(1) }).strict();

  server.registerTool(
    "helper_recruitment_get_invoice",
    {
      title: "Get Invoice",
      description: `Fetch one invoice's full line-item detail (each billed lesson: school, course, position, hours, rate, amount).

Args: invoice_id (required).
Returns: the invoice document (JSON) with its 'items' array.

Error Handling:
  - Returns "Error: Invoice <id> not found" for a bad id.`,
      inputSchema: GetInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ invoice_id }: { invoice_id: string }) => {
      try {
        const snap = await db.collection("invoices").doc(invoice_id).get();
        if (!snap.exists) return handleError(`Invoice ${invoice_id} not found.`);
        const output = { id: snap.id, ...(snap.data() as Omit<Invoice, "id">) };
        return {
          content: [{ type: "text" as const, text: jsonText(output) }],
          structuredContent: JSON.parse(jsonText(output)),
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  const MarkPaidInputSchema = z
    .object({
      invoice_id: z.string().min(1),
      admin_uid: z.string().optional().describe("Firebase Auth UID recorded as who marked it paid. Defaults to the ADMIN_UID environment variable."),
    })
    .strict();
  type MarkPaidInput = z.infer<typeof MarkPaidInputSchema>;

  server.registerTool(
    "helper_recruitment_mark_invoice_paid",
    {
      title: "Mark Invoice Paid",
      description: `Mark an invoice as paid, recording who and when.

Args: invoice_id (required), admin_uid (optional, defaults to ADMIN_UID env var).
Returns: {"id": string, "status": "paid"}.`,
      inputSchema: MarkPaidInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: MarkPaidInput) => {
      try {
        const adminUid = actingAdminUid(params.admin_uid);
        const ref = db.collection("invoices").doc(params.invoice_id);
        const existing = await ref.get();
        if (!existing.exists) return handleError(`Invoice ${params.invoice_id} not found.`);
        await ref.update({
          status: "paid" satisfies InvoiceStatus,
          paidAt: FieldValue.serverTimestamp(),
          paidBy: adminUid,
        });
        const output = { id: params.invoice_id, status: "paid" };
        return { content: [{ type: "text" as const, text: jsonText(output) }], structuredContent: output };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.registerTool(
    "helper_recruitment_mark_invoice_unpaid",
    {
      title: "Mark Invoice Unpaid",
      description: `Revert an invoice from 'paid' back to 'submitted' (e.g. it was marked paid by mistake).

Args: invoice_id (required).
Returns: {"id": string, "status": "submitted"}.`,
      inputSchema: GetInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ invoice_id }: { invoice_id: string }) => {
      try {
        const ref = db.collection("invoices").doc(invoice_id);
        const existing = await ref.get();
        if (!existing.exists) return handleError(`Invoice ${invoice_id} not found.`);
        await ref.update({ status: "submitted" satisfies InvoiceStatus });
        const output = { id: invoice_id, status: "submitted" };
        return { content: [{ type: "text" as const, text: jsonText(output) }], structuredContent: output };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.registerTool(
    "helper_recruitment_delete_invoice",
    {
      title: "Delete Invoice",
      description: `Permanently delete an invoice record. Prefer helper_recruitment_mark_invoice_unpaid for correcting a mistaken payment mark — only delete for a genuinely erroneous submission.

Args: invoice_id (required).
Returns: {"id": string, "deleted": true}.`,
      inputSchema: GetInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ invoice_id }: { invoice_id: string }) => {
      try {
        await db.collection("invoices").doc(invoice_id).delete();
        const output = { id: invoice_id, deleted: true };
        return { content: [{ type: "text" as const, text: jsonText(output) }], structuredContent: output };
      } catch (error) {
        return handleError(error);
      }
    },
  );
}
