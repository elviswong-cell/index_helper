import { CHARACTER_LIMIT } from "./constants.js";
import { asDate } from "./domain.js";
import type { Timestamp } from "firebase-admin/firestore";

/** Recursively converts any Firestore Timestamp in a value to an ISO string. */
export function toPlain<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (isTimestamp(value)) return asDate(value as unknown as Timestamp).toISOString() as unknown as T;
  if (Array.isArray(value)) return value.map((v) => toPlain(v)) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toPlain(v);
    }
    return out as T;
  }
  return value;
}

function isTimestamp(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  );
}

/** JSON-stringifies structured output, truncating with a clear note past CHARACTER_LIMIT. */
export function jsonText(output: unknown): string {
  const full = JSON.stringify(toPlain(output), null, 2);
  if (full.length <= CHARACTER_LIMIT) return full;
  return (
    full.slice(0, CHARACTER_LIMIT) +
    `\n\n... [truncated: response exceeded ${CHARACTER_LIMIT} characters. ` +
    `Narrow your query with filters or a smaller limit.]`
  );
}

/** Standard tool-error result: a single text content block, no structuredContent. */
export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

export function handleError(error: unknown): ReturnType<typeof errorResult> {
  return errorResult(error instanceof Error ? error.message : String(error));
}
