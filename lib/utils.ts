import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isSameDay } from "date-fns";
import { zhTW } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) return "";
  return format(value, "yyyy年M月d日 (eee) HH:mm", { locale: zhTW });
}

export function formatDate(value: Date | null | undefined): string {
  if (!value) return "";
  return format(value, "yyyy年M月d日 (eee)", { locale: zhTW });
}

export function formatTimeRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
): string {
  if (!start || !end) return "";
  const s = format(start, "HH:mm", { locale: zhTW });
  const e = format(end, "HH:mm", { locale: zhTW });
  return `${s} – ${e}`;
}

/** Compact date used in lesson tables, e.g. "7月6日 (一)". */
export function formatDateShort(value: Date | null | undefined): string {
  if (!value) return "";
  return format(value, "M月d日 (eee)", { locale: zhTW });
}

/** "7月6日 – 7月20日", or a single date when the range is one day. */
export function formatDateRange(
  start: Date | null | undefined,
  end: Date | null | undefined,
): string {
  if (!start) return "";
  if (!end || isSameDay(start, end)) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Monday = 0 … Sunday = 6, so a calendar grid can start on Monday. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * One month laid out as whole Monday-start weeks. Days outside the month are
 * `null` rather than spilling in from the neighbours, so each date sits under
 * the right weekday column.
 */
export function monthCells(year: number, month: number): (number | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(mondayIndex(new Date(year, month, 1))).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** "10/7" — the compact form used to list a course's dates on a job card. */
export function formatDayShort(value: Date | null | undefined): string {
  if (!value) return "";
  return `${value.getMonth() + 1}/${value.getDate()}`;
}

/**
 * "10/7, 10/14, 10/21" — every date a course runs on. Long courses are cut
 * off with a "+N" tail; the hover calendar shows the rest.
 */
export function formatDayList(days: Date[], max = 6): string {
  if (days.length === 0) return "";
  const shown = days.slice(0, max).map(formatDayShort).join(", ");
  return days.length > max ? `${shown} +${days.length - max}` : shown;
}

export function durationHours(
  start: Date | null | undefined,
  end: Date | null | undefined,
): number {
  if (!start || !end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 36e5);
}

/** Hours rounded to at most one decimal, so "3.5" not "3.4999999". */
export function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("zh-Hant")}`;
}

/** "2026-07" -> "Jul 2026" / "2026年7月" */
export function formatMonth(key: string, lang: "en" | "zh"): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  if (lang === "zh") return `${y}年${m}月`;
  return format(new Date(y, m - 1, 1), "MMM yyyy");
}
