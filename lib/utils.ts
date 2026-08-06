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
