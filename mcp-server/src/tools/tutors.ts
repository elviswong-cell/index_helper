import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../firebase.js";
import { jsonText, handleError } from "../serialize.js";
import type { UserProfile } from "../types.js";

function missingProfileFields(profile: UserProfile): string[] {
  const required = ["phone", "scrcUrl", "bankName", "bankAccount", "bankAccountName"] as const;
  return required.filter((f) => !String(profile[f] ?? "").trim());
}

export function registerTutorTools(server: McpServer): void {
  const ListInputSchema = z
    .object({
      query: z
        .string()
        .max(200)
        .optional()
        .describe("Case-insensitive substring match against name, email, or phone. Omit to list everyone."),
      profile_complete: z
        .boolean()
        .optional()
        .describe("Filter to tutors whose profile (phone, SCRC, bank details) is fully filled in, or incomplete."),
      limit: z.number().int().min(1).max(200).default(100),
    })
    .strict();
  type ListInput = z.infer<typeof ListInputSchema>;

  server.registerTool(
    "helper_recruitment_list_tutors",
    {
      title: "List Tutors",
      description: `List registered tutors (the /admin/tutors database), optionally filtered by a name/email/phone search or profile completeness.

Args: query (optional substring search), profile_complete (optional true/false filter), limit (1-200, default 100).
Returns: {"count": number, "tutors": [{uid, display_name, email, phone, scrc_on_file, bank_on_file, profile_complete, updated_at}]}.

Does NOT include per-lesson work history or invoice totals — use helper_recruitment_get_tutor for one tutor's full detail, or helper_recruitment_list_registrations / helper_recruitment_list_invoices filtered by that tutor's uid.`,
      inputSchema: ListInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: ListInput) => {
      try {
        const snap = await db.collection("users").get();
        let tutors = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }) as UserProfile);

        if (params.query) {
          const q = params.query.toLowerCase();
          tutors = tutors.filter(
            (t) =>
              (t.displayName ?? "").toLowerCase().includes(q) ||
              (t.email ?? "").toLowerCase().includes(q) ||
              (t.phone ?? "").toLowerCase().includes(q),
          );
        }
        if (params.profile_complete !== undefined) {
          tutors = tutors.filter((t) => (missingProfileFields(t).length === 0) === params.profile_complete);
        }
        tutors = tutors.slice(0, params.limit);

        const output = {
          count: tutors.length,
          tutors: tutors.map((t) => ({
            uid: t.uid,
            display_name: t.displayName ?? null,
            email: t.email ?? null,
            phone: t.phone ?? null,
            scrc_on_file: Boolean(t.scrcUrl),
            bank_on_file: Boolean(t.bankName && t.bankAccount && t.bankAccountName),
            profile_complete: missingProfileFields(t).length === 0,
            updated_at: t.updatedAt ?? null,
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

  const GetInputSchema = z.object({ uid: z.string().min(1).describe("The tutor's Firebase Auth UID.") }).strict();

  server.registerTool(
    "helper_recruitment_get_tutor",
    {
      title: "Get Tutor",
      description: `Fetch one tutor's full profile: contact info, SCRC document link, and bank details.

Args: uid (required) — the tutor's Firebase Auth UID.
Returns: the profile document (JSON), including which required fields (if any) are still missing.

Error Handling:
  - Returns "Error: Tutor <uid> has no profile on file" if the uid has never saved a profile.`,
      inputSchema: GetInputSchema.shape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ uid }: { uid: string }) => {
      try {
        const snap = await db.collection("users").doc(uid).get();
        if (!snap.exists) return handleError(`Tutor ${uid} has no profile on file.`);
        const profile = { uid: snap.id, ...(snap.data() as Omit<UserProfile, "uid">) } as UserProfile;
        const output = { ...profile, missing_fields: missingProfileFields(profile) };
        return {
          content: [{ type: "text" as const, text: jsonText(output) }],
          structuredContent: JSON.parse(jsonText(output)),
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );

  server.registerTool(
    "helper_recruitment_delete_tutor_profile",
    {
      title: "Delete Tutor Profile",
      description: `Clear a tutor's stored profile data (phone, SCRC link, bank details). Their Firebase Auth login is untouched — they can sign in again and will just need to re-fill their profile before applying to jobs. Their lesson history and past invoices are NOT deleted.

Args: uid (required).
Returns: {"uid": string, "deleted": true}.`,
      inputSchema: GetInputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ uid }: { uid: string }) => {
      try {
        await db.collection("users").doc(uid).delete();
        const output = { uid, deleted: true };
        return { content: [{ type: "text" as const, text: jsonText(output) }], structuredContent: output };
      } catch (error) {
        return handleError(error);
      }
    },
  );
}
